export type SqlParameter = { term: string; sort: "text" | "int" };

const supportedSchema = `
  CREATE TABLE accounts (
    tenant_id text NOT NULL, account_id text NOT NULL,
    balance bigint NOT NULL CHECK (balance >= 0), PRIMARY KEY (tenant_id, account_id)
  );
  CREATE TABLE debit_requests (
    tenant_id text NOT NULL, request_id text NOT NULL, PRIMARY KEY (tenant_id, request_id)
  );
`;

// Unquoted, ASCII SQL only. Keep token boundaries, including those on either side of a comment.
function tokens(source: string): string[] {
  const items: string[] = [];
  const lex = /[ \t\r\n\f\v]+|--[^\r\n]*|\/\*|\$[1-9]\d*|[A-Za-z_][A-Za-z_0-9]*|\d+|::|>=|<=|<>|[=><.(),;+-]/gy;
  let pos = 0;
  while (pos < source.length) {
    lex.lastIndex = pos;
    const match = lex.exec(source);
    if (!match) throw new Error(`Unsupported SQL token at character ${pos + 1}`);
    const token = match[0];
    pos = lex.lastIndex;
    if (token === "/*") {
      let depth = 1;
      while (depth && pos < source.length) {
        if (source.startsWith("/*", pos)) { depth++; pos += 2; }
        else if (source.startsWith("*/", pos)) { depth--; pos += 2; }
        else pos++;
      }
      if (depth) throw new Error("Unterminated SQL comment");
    } else if (!/^\s/.test(token) && !token.startsWith("--")) {
      items.push(token.toLowerCase());
    }
  }
  return items;
}

class Sql {
  private readonly items: string[];
  private pos = 0;
  private readonly used = new Set<number>();
  constructor(source: string, private readonly bound: SqlParameter[]) {
    this.items = tokens(source);
  }
  take() { return this.items[this.pos++]; }
  at(word: string) { return this.items[this.pos] === word; }
  expect(fragment: string) {
    for (const wanted of tokens(fragment)) {
      if (this.take() !== wanted) throw new Error(`Unsupported SQL, expected '${fragment}'`);
    }
  }
  param(sort: SqlParameter["sort"]): SqlParameter {
    const placeholder = this.take() ?? "";
    if (!/^\$[1-9]\d*$/.test(placeholder)) throw new Error("Expected a positional SQL parameter");
    const index = Number(placeholder.slice(1)) - 1;
    const value = this.bound[index];
    if (value?.sort !== sort) throw new Error(`Missing or incorrectly typed SQL parameter ${placeholder}`);
    this.used.add(index);
    return value;
  }
  finish() {
    if (this.at(";")) this.take();
    if (this.pos !== this.items.length) throw new Error("Unsupported trailing SQL");
    if (this.used.size !== this.bound.length) throw new Error("Unused SQL bind parameter");
  }
}

function claimKey(sql: Sql): string {
  sql.expect("INSERT INTO debit_requests (tenant_id, request_id) VALUES (");
  const tenant = sql.param("text");
  sql.expect(",");
  const id = sql.param("text");
  sql.expect(") ON CONFLICT (tenant_id, request_id) DO NOTHING RETURNING request_id");
  sql.finish();
  return `ReceiptKey(${tenant.term}, ${id.term})`;
}

function update(sql: Sql) {
  sql.expect("UPDATE accounts AS a SET balance = a.balance");
  const subtract = sql.at("-");
  if (subtract) sql.expect("- r.amount");
  sql.expect("FROM (VALUES (");
  const tenant = sql.param("text");
  sql.expect("::text,");
  const account = sql.param("text");
  sql.expect("::text,");
  const amount = sql.param("int");
  sql.expect("::bigint)) AS r(tenant_id, account_id, amount) WHERE");
  const columns: Record<string, SqlParameter> = {
    "a.tenant_id": { term: "k.tenant", sort: "text" },
    "a.account_id": { term: "k.account", sort: "text" },
    "a.balance": { term: "balance", sort: "int" },
    "r.tenant_id": tenant, "r.account_id": account, "r.amount": amount,
  };
  function column() {
    const table = sql.take();
    sql.expect(".");
    const value = columns[`${table}.${sql.take()}`];
    if (!value) throw new Error("Unsupported SQL column");
    return value;
  }
  const conditions: string[] = [];
  let fundsGuard = false;
  for (;;) {
    const left = column(), operator = sql.take(), right = column();
    if (left.sort !== right.sort || (operator !== "=" && !(operator === ">=" && left.sort === "int"))) {
      throw new Error("Unsupported SQL comparison");
    }
    conditions.push(`(${left.term} ${operator === "=" ? "==" : operator} ${right.term})`);
    if (left.term === "balance" && right.term === amount.term && (operator === ">=" || operator === "=")) fundsGuard = true;
    if (!sql.at("and")) break;
    sql.take();
  }
  sql.expect("RETURNING a.account_id");
  sql.finish();
  // On the admitted fragment, subtraction stays inside PostgreSQL's nonnegative bigint domain.
  if (subtract && !fundsGuard) throw new Error("UPDATE subtraction requires a sufficient-funds guard");
  return { matches: conditions.join(" && "), balance: subtract ? `balance - ${amount.term}` : "balance" };
}

export function checkSchema(source: string): void {
  if (tokens(source).join(" ") !== tokens(supportedSchema).join(" ")) throw new Error("Unsupported PostgreSQL schema");
}

export type SqlOperation =
  | { kind: "begin" | "commit" | "rollback" }
  | { kind: "write"; expression: string; definition?: string };

/** Translate a statement wherever the handler executes it. Its TS variable name is irrelevant. */
export function lowerSql(source: string, bound: SqlParameter[], id: number): SqlOperation {
  const sql = new Sql(source, bound);
  if (sql.at("insert")) return { kind: "write", expression: `InsertReceipt(working, ${claimKey(sql)})` };
  if (sql.at("update")) {
    const row = update(sql);
    const definition = `predicate Matches${id}(k: AccountKey, balance: int, q: Request) { ${row.matches} }
function Update${id}(s: State, q: Request): (r: QueryResult)
  ensures forall k | k in s.accounts :: Matches${id}(k, s.accounts[k], q) ==> r.rowCount > 0
{
  var rows := set k | k in s.accounts && Matches${id}(k, s.accounts[k], q);
  assert forall k | k in s.accounts && Matches${id}(k, s.accounts[k], q) :: |rows| > 0 by {
    forall k | k in s.accounts && Matches${id}(k, s.accounts[k], q)
      ensures |rows| > 0 {
      assert k in rows;
      assert {k} <= rows;
    }
  }
  var balances := map k | k in s.accounts ::
    if k in rows then (${row.balance.replace(/\bbalance\b/g, "s.accounts[k]")}) else s.accounts[k];
  QueryResult(State(balances, s.receipts), |rows|)
}`;
    return { kind: "write", expression: `Update${id}(working, q)`, definition };
  }
  const kind = sql.take();
  if (kind !== "begin" && kind !== "commit" && kind !== "rollback") throw new Error("Unsupported SQL statement");
  if (kind === "begin") sql.expect("ISOLATION LEVEL SERIALIZABLE");
  sql.finish();
  return { kind };
}

