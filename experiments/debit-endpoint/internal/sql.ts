import { binary, ref, type Expr } from "../../../packages/pud/src/expressions.ts";

export type SqlParameter = { term: Expr; sort: "text" | "int" };

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
  get done() { return this.pos === this.items.length; }
  take() { return this.items[this.pos++]; }
  word() {
    const id = this.take();
    if (!id || !/^[a-z_][a-z_0-9]*$/.test(id)) throw new Error("Expected an unquoted SQL identifier");
    return id;
  }
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

function insert(sql: Sql): SqlOperation {
  sql.expect("INSERT INTO debit_requests (tenant_id, request_id) VALUES (");
  const tenant = sql.param("text");
  sql.expect(",");
  const id = sql.param("text");
  sql.expect(") ON CONFLICT (tenant_id, request_id) DO NOTHING RETURNING request_id");
  sql.finish();
  return { kind: "insert", tenant: tenant.term, request: id.term };
}

const accountColumns: Record<string, SqlParameter> = {
  tenant_id: { term: ref("string", "k", "tenant"), sort: "text" },
  account_id: { term: ref("string", "k", "account"), sort: "text" },
  balance: { term: ref("integer", "balance"), sort: "int" },
};

function matches(sql: Sql, amount: SqlParameter | undefined, comparison: () => [SqlParameter, string | undefined, SqlParameter]): Expr {
  let condition: Expr | undefined;
  let fundsGuard = false;
  for (;;) {
    const [left, operator, right] = comparison();
    if (left.sort !== right.sort || (operator !== "=" && !(operator === ">=" && left.sort === "int"))) {
      throw new Error("Unsupported SQL comparison");
    }
    const term = binary(operator === "=" ? "===" : ">=", left.term, right.term);
    condition = condition ? binary("&&", condition, term) : term;
    if (amount && left === accountColumns.balance && right.term === amount.term) fundsGuard = true;
    if (!sql.at("and")) break;
    sql.take();
  }
  if (amount && !fundsGuard) throw new Error("UPDATE subtraction requires a sufficient-funds guard");
  return condition!;
}

function update(sql: Sql): SqlOperation {
  sql.expect("UPDATE accounts");
  if (sql.at("set")) {
    sql.expect("SET balance = balance -");
    const amount = sql.param("int");
    if (sql.at("::")) sql.expect("::bigint");
    sql.expect("WHERE");
    const condition = matches(sql, amount, () => {
      const name = sql.word();
      if (!Object.hasOwn(accountColumns, name)) throw new Error("Unsupported accounts column");
      const left = accountColumns[name]!, op = sql.take(), right = sql.param(left.sort);
      if (sql.at("::")) sql.expect(left.sort === "int" ? "::bigint" : "::text");
      return [left, op, right];
    });
    sql.expect("RETURNING account_id");
    sql.finish();
    return { kind: "update", condition, subtract: amount.term };
  }
  sql.expect("AS");
  const target = sql.word();
  sql.expect(`SET balance = ${target}.balance`);
  let source: string | undefined;
  if (sql.at("-")) {
    sql.take();
    source = sql.word();
    sql.expect(".amount");
  }
  sql.expect("FROM (VALUES (");
  const tenant = sql.param("text");
  sql.expect("::text,");
  const account = sql.param("text");
  sql.expect("::text,");
  const amount = sql.param("int");
  sql.expect("::bigint)) AS");
  const values = sql.word();
  if (values === target || (source !== undefined && values !== source)) throw new Error("Ambiguous or unknown SQL alias");
  sql.expect("(tenant_id, account_id, amount) WHERE");
  const columns: Record<string, SqlParameter> = {
    [`${target}.tenant_id`]: accountColumns.tenant_id!, [`${target}.account_id`]: accountColumns.account_id!,
    [`${target}.balance`]: accountColumns.balance!,
    [`${values}.tenant_id`]: tenant, [`${values}.account_id`]: account, [`${values}.amount`]: amount,
  };
  function column() {
    const table = sql.take();
    sql.expect(".");
    const value = columns[`${table}.${sql.take()}`];
    if (!value) throw new Error("Unsupported SQL column");
    return value;
  }
  const condition = matches(sql, source ? amount : undefined, () => [column(), sql.take(), column()]);
  sql.expect(`RETURNING ${target}.account_id`);
  sql.finish();
  return { kind: "update", condition, subtract: source ? amount.term : undefined };
}

/** Extract the facts used by the ledger model. Only plain tables can enter this schema. */
export function checkSchema(source: string): void {
  const sql = new Sql(source, []);
  const tables = new Set<string>();
  while (!sql.done) {
    sql.expect("CREATE TABLE");
    const table = sql.word(), columns = new Map<string, string>(), required = new Set<string>(), checks = new Set<string>();
    const primary: string[] = [];
    if (tables.has(table)) throw new Error(`Duplicate table '${table}'`);
    tables.add(table);
    sql.expect("(");
    function nonnegative() {
      sql.expect("CHECK (");
      const name = sql.word();
      sql.expect(">= 0)");
      checks.add(name);
    }
    for (;;) {
      if (sql.at("primary")) {
        if (primary.length) throw new Error("Multiple primary keys");
        sql.expect("PRIMARY KEY (");
        primary.push(sql.word());
        while (sql.at(",")) { sql.take(); primary.push(sql.word()); }
        sql.expect(")");
      } else if (sql.at("check")) nonnegative();
      else {
        const name = sql.word(), type = sql.word();
        if (columns.has(name) || (type !== "text" && type !== "bigint")) throw new Error(`Unsupported column '${table}.${name}'`);
        columns.set(name, type);
        while (sql.at("not") || sql.at("check")) {
          if (sql.at("not")) { sql.expect("NOT NULL"); required.add(name); }
          else nonnegative();
        }
      }
      if (!sql.at(",")) break;
      sql.take();
    }
    sql.expect(")");
    if (!sql.done) sql.expect(";");
    if (new Set(primary).size !== primary.length || primary.some(c => !columns.has(c)) ||
        [...checks].some(c => columns.get(c) !== "bigint")) throw new Error(`Unsupported constraints on '${table}'`);
    const ledger = table === "accounts", receipts = table === "debit_requests";
    if (ledger || receipts) {
      const id = ledger ? "account_id" : "request_id";
      if (columns.size !== (ledger ? 3 : 2) || columns.get("tenant_id") !== "text" || columns.get(id) !== "text" ||
          primary.length !== 2 || !primary.includes("tenant_id") || !primary.includes(id) ||
          (ledger && (columns.get("balance") !== "bigint" || !required.has("balance") || !checks.has("balance")))) {
        throw new Error(`Unsupported PostgreSQL schema for '${table}'`);
      }
    }
  }
  if (!tables.has("accounts") || !tables.has("debit_requests")) throw new Error("Expected the accounts and debit_requests tables");
}

export type SqlOperation =
  | { kind: "begin" | "commit" | "rollback" }
  | { kind: "insert"; tenant: Expr; request: Expr }
  | { kind: "update"; condition: Expr; subtract?: Expr };

/** Parse SQL separately from the handler and the proof backend. */
export function lowerSql(source: string, bound: SqlParameter[]): SqlOperation {
  const sql = new Sql(source, bound);
  if (sql.at("insert")) return insert(sql);
  if (sql.at("update")) return update(sql);
  const kind = sql.take();
  if (kind !== "begin" && kind !== "commit" && kind !== "rollback") throw new Error("Unsupported SQL statement");
  if (kind === "begin") sql.expect("ISOLATION LEVEL SERIALIZABLE");
  sql.finish();
  return { kind };
}

