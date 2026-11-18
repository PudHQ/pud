import { parse } from "@babel/parser";
import type { ArrayExpression } from "@babel/types";

/*
 * The verifier models one transaction protocol. SQL and its bound expressions are
 * extracted independently from these holes. A control-flow edit must be modelled
 * before it can use the same proof.
 */
const protocol = `
  export interface Session { query(sql: string, params?: string[]): Promise<{ rows: unknown[] }>; }
  export interface Auth { tenantId: string; }
  export interface DebitInput { accountId: string; requestId: string; amountCents: bigint; }
  export const CLAIM = "";
  export const DEBIT = "";
  export async function debit(db: Session, auth: Auth, input: DebitInput): Promise<"applied" | "duplicate" | "declined"> {
    const { tenantId } = auth;
    const { accountId, requestId, amountCents } = input;
    if (typeof amountCents !== "bigint" || amountCents <= 0n || amountCents > 9223372036854775807n) {
      throw new RangeError("amountCents must be a positive PostgreSQL bigint");
    }
    await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    try {
      const claim = await db.query(CLAIM, []);
      if (claim.rows.length === 0) { await db.query("COMMIT"); return "duplicate"; }
      const debit = await db.query(DEBIT, []);
      if (debit.rows.length === 0) { await db.query("ROLLBACK"); return "declined"; }
      await db.query("COMMIT");
      return "applied";
    } catch (error) { await db.query("ROLLBACK"); throw error; }
  }
`;

const supportedSchema = `
  CREATE TABLE accounts (
    tenant_id text NOT NULL, account_id text NOT NULL,
    balance bigint NOT NULL CHECK (balance >= 0), PRIMARY KEY (tenant_id, account_id)
  );
  CREATE TABLE debit_requests (
    tenant_id text NOT NULL, request_id text NOT NULL, PRIMARY KEY (tenant_id, request_id)
  );
`;

function program(source: string) {
  return parse(source, { sourceType: "module", plugins: ["typescript"] }).program;
}

const trivia = new Set(["start", "end", "loc", "extra", "leadingComments", "innerComments", "trailingComments"]);
function syntax(node: unknown): string {
  return JSON.stringify(node, (key, value) => {
    if (trivia.has(key)) return undefined;
    return typeof value === "bigint" ? value.toString() : value;
  });
}
const expectedProgram = syntax(program(protocol));

type Value = { term: string; sort: "text" | "int" };
const requestFields: Record<string, string> = { tenantId: "q.tenant", accountId: "q.account", requestId: "q.requestId" };

function parameters(array: ArrayExpression): Value[] {
  return array.elements.map(node => {
    if (node?.type === "Identifier" && Object.hasOwn(requestFields, node.name)) {
      return { term: requestFields[node.name]!, sort: "text" };
    }
    if (node?.type === "CallExpression" && node.arguments.length === 0 && !node.typeArguments &&
        node.callee.type === "MemberExpression" && !node.callee.computed &&
        node.callee.object.type === "Identifier" && node.callee.object.name === "amountCents" &&
        node.callee.property.type === "Identifier" && node.callee.property.name === "toString") {
      return { term: "q.amount", sort: "int" };
    }
    throw new Error("Unsupported SQL parameter expression");
  });
}

function readHandler(source: string) {
  const ast = program(source);
  const statements = new Map<string, string>();
  const bindings = new Map<string, Value[]>();
  for (const statement of ast.body) {
    if (statement.type !== "ExportNamedDeclaration") continue;
    const decl = statement.declaration;
    if (decl?.type === "VariableDeclaration" && decl.declarations.length === 1) {
      const variable = decl.declarations[0]!;
      if (variable.id.type !== "Identifier" || !["CLAIM", "DEBIT"].includes(variable.id.name)) continue;
      const init = variable.init;
      const sql = init?.type === "TemplateLiteral" && !init.expressions.length ? init.quasis[0]?.value.cooked
        : init?.type === "StringLiteral" ? init.value : undefined;
      if (typeof sql !== "string") throw new Error("SQL must be a static string");
      statements.set(variable.id.name, sql);
      variable.init = { type: "StringLiteral", value: "" };
    }
    if (decl?.type !== "FunctionDeclaration" || decl.id?.name !== "debit") continue;
    for (const step of decl.body.body) {
      if (step.type !== "TryStatement") continue;
      for (const row of step.block.body) {
        if (row.type !== "VariableDeclaration" || row.declarations.length !== 1) continue;
        const init = row.declarations[0]!.init;
        if (init?.type !== "AwaitExpression" || init.argument.type !== "CallExpression") continue;
        const [query, args] = init.argument.arguments;
        if (query?.type !== "Identifier" || args?.type !== "ArrayExpression") continue;
        bindings.set(query.name, parameters(args));
        args.elements = [];
      }
    }
  }
  if (syntax(ast) !== expectedProgram) throw new Error("Unsupported debit handler or transaction control flow");
  return { statements, bindings };
}

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
  constructor(source: string, private readonly bound: Value[]) {
    this.items = tokens(source);
  }
  take() { return this.items[this.pos++]; }
  at(word: string) { return this.items[this.pos] === word; }
  expect(fragment: string) {
    for (const wanted of tokens(fragment)) {
      if (this.take() !== wanted) throw new Error(`Unsupported SQL, expected '${fragment}'`);
    }
  }
  param(sort: Value["sort"]): Value {
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
  const columns: Record<string, Value> = {
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

export function lower(handlerSource: string, schemaSql: string): string {
  if (tokens(schemaSql).join(" ") !== tokens(supportedSchema).join(" ")) {
    throw new Error("Unsupported PostgreSQL schema");
  }
  const { statements, bindings } = readHandler(handlerSource);
  const key = claimKey(new Sql(statements.get("CLAIM")!, bindings.get("CLAIM")!));
  const row = update(new Sql(statements.get("DEBIT")!, bindings.get("DEBIT")!));
  return [
    `function ClaimKey(q: Request): ReceiptKey { ${key} }`,
    `predicate Matches(k: AccountKey, balance: int, q: Request) { ${row.matches} }`,
    `function UpdatedBalance(k: AccountKey, balance: int, q: Request): int { ${row.balance} }`,
  ].join("\n");
}
