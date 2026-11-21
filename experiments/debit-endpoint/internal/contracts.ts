import { parse } from "@babel/parser";
import type { Node } from "@babel/types";
import type { ReviewedProperty } from "@pud/model/adapter";
import { unsupported } from "@pud/model/typescript";
import { propertyArrow } from "@pud/model/source";
import type { ReplayWitness } from "../replay.ts";

export interface Difference {
  subject: string;
  expected: string;
  received: string;
}

// A replay evaluates the same expression we emit for Dafny. The first mismatch
// carries the expected value from that expression and the value read from SQL.
type Evaluation = true | Difference;
type Expression = { code: string; evaluate(w: ReplayWitness): Evaluation };
export interface Contract {
  name: string;
  title?: string;
  line: number;
  claim: string;
  postcondition: string;
  evaluate(w: ReplayWitness): Evaluation;
}

const key = (w: ReplayWitness) => `${w.tenantId}/${w.accountId}`;
const receipt = (w: ReplayWitness) => `${w.tenantId}/${w.requestId}`;
const claimKey = "ReceiptKey(q.tenant, q.requestId)";

function compareBalances(w: ReplayWitness, expected: Record<string, string>): Evaluation {
  const received = w.observed.balances;
  const cents = (value: string | undefined) => value === undefined ? "no account" : `${value} cents`;
  for (const account of new Set([...Object.keys(expected), ...Object.keys(received)])) {
    if (expected[account] === received[account]) continue;
    const owner = account.startsWith(w.tenantId + "/") ? "" : " (other tenant)";
    return { subject: `${account} balance${owner}`, expected: cents(expected[account]), received: cents(received[account]) };
  }
  return true;
}

function compareReceipts(w: ReplayWitness, expected: string[]): Evaluation {
  const received = w.observed.receipts;
  const missing = expected.find(id => !received.includes(id));
  if (missing !== undefined) return { subject: `Receipt ${missing}`, expected: "recorded", received: "absent" };
  const extra = received.find(id => !expected.includes(id));
  if (extra !== undefined) return { subject: `Receipt ${extra}`, expected: "absent", received: "recorded" };
  if (expected.length !== received.length) return { subject: "Receipt count", expected: String(expected.length), received: String(received.length) };
  return true;
}

const facts = new Map<string, Expression>([
  ["seen(request)", {
    code: `(${claimKey} in s.receipts)`,
    evaluate: w => w.before.receipts.includes(receipt(w)) || {
      subject: `Receipt ${receipt(w)} before debit`, expected: "recorded", received: "absent",
    },
  }],
  ["funded(account,amount)", {
    code: "Funded(s, q)",
    evaluate: w => {
      const balance = w.before.balances[key(w)];
      if (balance !== undefined && BigInt(balance) >= BigInt(w.amountCents)) return true;
      return { subject: `${key(w)} balance before debit`, expected: `at least ${w.amountCents} cents`,
        received: balance === undefined ? "no account" : `${balance} cents` };
    },
  }],
  ["debitedOnly(account,amount)", {
    code: "DebitedOnly(s, q, o)",
    evaluate: w => {
      const k = key(w);
      if (!(k in w.before.balances)) return { subject: `${k} before debit`, expected: "an account", received: "no account" };
      const cents = (BigInt(w.before.balances[k]!) - BigInt(w.amountCents)).toString();
      return compareBalances(w, { ...w.before.balances, [k]: cents });
    },
  }],
  ["recordedOnly(request)", {
    code: `(o.after.receipts == s.receipts + {${claimKey}})`,
    evaluate: w => compareReceipts(w, [...new Set([...w.before.receipts, receipt(w)])]),
  }],
  ["unchanged()", {
    code: "(o.after == s)",
    evaluate: w => {
      const balances = compareBalances(w, w.before.balances);
      return balances === true ? compareReceipts(w, w.before.receipts) : balances;
    },
  }],
]);

function constant(value: boolean): Expression {
  return { code: String(value), evaluate: () => value || { subject: "Constant condition", expected: "true", received: "false" } };
}

function not(inner: Expression, label: string): Expression {
  return { code: `(!${inner.code})`, evaluate: w => inner.evaluate(w) !== true || { subject: label, expected: "false", received: "true" } };
}

function and(left: Expression, right: Expression): Expression {
  return { code: `(${left.code} && ${right.code})`, evaluate: w => {
    const first = left.evaluate(w);
    return first === true ? right.evaluate(w) : first;
  } };
}

function or(left: Expression, right: Expression): Expression {
  return { code: `(${left.code} || ${right.code})`, evaluate: w => left.evaluate(w) === true || right.evaluate(w) === true ||
    { subject: "Alternatives", expected: "at least one true", received: "both false" } };
}

function resultIs(status: string): Expression {
  return { code: `(o.isText && o.status == ${JSON.stringify(status)})`, evaluate: w => w.observed.status === status || {
    subject: "Returned status", expected: status, received: w.observed.status,
  } };
}

export interface DebitObservation {
  result: "applied" | "duplicate" | "declined";
  seen: boolean;
  funded: boolean;
  debitedOnly: boolean;
  recordedOnly: boolean;
  unchanged: boolean;
}

const observations = new Map([...facts].map(([signature, meaning]) => [signature.split("(")[0]!, meaning]));

export function reviewedClause(property: ReviewedProperty, name: string): Contract {
  const { file } = property;
  const node = propertyArrow(property);
  const param = node.params[0];
  if (node.params.length !== 1 || param?.type !== "Identifier" || param.optional) unsupported(file, node, "A ledger property takes one observation.");
  if (param.typeAnnotation && (param.typeAnnotation.type !== "TSTypeAnnotation" ||
      param.typeAnnotation.typeAnnotation.type !== "TSTypeReference")) unsupported(file, param, "Use the ledger observation type for this parameter.");
  if (node.returnType && (node.returnType.type !== "TSTypeAnnotation" || node.returnType.typeAnnotation.type !== "TSBooleanKeyword")) {
    unsupported(file, node, "A ledger property must return a boolean.");
  }
  const binding = param.name;
  function member(n: Node): string | undefined {
    return n.type === "MemberExpression" && !n.computed && n.object.type === "Identifier" && n.object.name === binding &&
      n.property.type === "Identifier" ? n.property.name : undefined;
  }
  function read(n: Node): Expression {
    const field = member(n);
    if (field && observations.has(field)) return observations.get(field)!;
    if (n.type === "BooleanLiteral") return constant(n.value);
    if (n.type === "UnaryExpression" && n.operator === "!") return not(read(n.argument), member(n.argument) ?? "Condition");
    if (n.type === "LogicalExpression" && n.operator === "&&") return and(read(n.left), read(n.right));
    if (n.type === "LogicalExpression" && n.operator === "||") return or(read(n.left), read(n.right));
    if (n.type === "ConditionalExpression") {
      const test = read(n.test), yes = read(n.consequent), no = read(n.alternate);
      return { code: `(if ${test.code} then ${yes.code} else ${no.code})`,
        evaluate: w => test.evaluate(w) === true ? yes.evaluate(w) : no.evaluate(w) };
    }
    if (n.type === "BinaryExpression" && (n.operator === "===" || n.operator === "!==") && member(n.left) === "result" &&
        n.right.type === "StringLiteral" && ["applied", "declined", "duplicate"].includes(n.right.value)) {
      const equal = resultIs(n.right.value);
      return n.operator === "===" ? equal : not(equal, "Returned status");
    }
    return unsupported(file, n, `Unsupported ledger observation: ${field ?? n.type}`);
  }
  const expr = read(node.body);
  return { name, line: node.loc!.start.line, claim: property.expression, postcondition: expr.code, evaluate: expr.evaluate };
}

// The tiny language has no arbitrary JS execution. The same parse builds both interpretations.
// Boolean precedence, tightest first: !, &&, ||, then right-associative implication.
function predicate(input: string): Expression {
  const tokens = input.match(/==>|===|&&|\|\||[A-Za-z_][A-Za-z_0-9]*|"[^"\n]*"|'[^'\n]*'|[^\s]/g) ?? [];
  let pos = 0;
  function take(token: string) {
    if (tokens[pos] !== token) return false;
    pos++;
    return true;
  }
  function expect(token: string) {
    if (!take(token)) throw new Error(`expected '${token}', got ${tokens[pos] ?? "end of clause"}`);
  }
  function atom(): Expression {
    if (take("!")) {
      const start = pos;
      const inner = atom();
      const subject = tokens.slice(start, pos).join("");
      return not(inner, subject);
    }
    if (take("(")) {
      const expr = implies();
      expect(")");
      return expr;
    }
    const name = tokens[pos++];
    if (name === "true" || name === "false") return constant(name === "true");
    if (name === "result") {
      expect("===");
      const literal = tokens[pos++];
      const status = literal?.match(/^(["'])(applied|declined|duplicate)\1$/)?.[2];
      if (!status) throw new Error("expected an applied, declined or duplicate result literal");
      return resultIs(status);
    }
    expect("(");
    const args: string[] = [];
    if (!take(")")) {
      do {
        const arg = tokens[pos++];
        if (!arg || !/^[A-Za-z_][A-Za-z_0-9]*$/.test(arg)) throw new Error("expected a contract argument");
        args.push(arg);
      } while (take(","));
      expect(")");
    }
    const signature = `${name}(${args.join(",")})`;
    const fact = facts.get(signature);
    if (!fact) throw new Error(`unsupported contract term '${signature}'`);
    return fact;
  }
  function conjunction(): Expression {
    let expr = atom();
    while (take("&&")) expr = and(expr, atom());
    return expr;
  }
  function disjunction(): Expression {
    let expr = conjunction();
    while (take("||")) expr = or(expr, conjunction());
    return expr;
  }
  function implies(): Expression {
    const left = disjunction();
    if (!take("==>")) return left;
    const right = implies();
    return { code: `(${left.code} ==> ${right.code})`, evaluate: w => left.evaluate(w) !== true || right.evaluate(w) };
  }
  const expr = implies();
  if (pos !== tokens.length) throw new Error(`unexpected token '${tokens[pos]}'`);
  return expr;
}

export function contracts(source: string): Contract[] {
  const ast = parse(source, { sourceType: "module", plugins: ["typescript"] });
  const debit = ast.program.body.find(stmt => stmt.type === "ExportNamedDeclaration"
    && stmt.declaration?.type === "FunctionDeclaration" && stmt.declaration.id?.name === "debit");
  if (!debit) throw new Error("missing exported debit function");
  const attached = new Set(debit.leadingComments?.map(c => c.start));
  const names = new Set<string>();
  const result: Contract[] = [];
  for (const comment of ast.comments ?? []) {
    const annotation = comment.value.trimStart();
    if (!annotation.startsWith("@")) continue;
    const line = comment.loc!.start.line;
    if (!attached.has(comment.start) || comment.type !== "CommentLine") {
      throw new Error(`line ${line}: attach //@ ensures above the exported debit function`);
    }
    const fields = /^@\s*ensures\s+([A-Za-z][A-Za-z_0-9]*)(?:\s+"([^"\r\n]+)")?\s*:\s*(.+)$/.exec(annotation);
    if (!fields) throw new Error(`line ${line}: expected //@ ensures name "optional title": condition`);
    const name = fields[1]!, title = fields[2], claim = fields[3]!.trim();
    if (names.has(name)) throw new Error(`line ${line}: duplicate contract '${name}'`);
    names.add(name);
    try {
      const expr = predicate(claim);
      result.push({ name, title, line, claim, postcondition: expr.code, evaluate: expr.evaluate });
    } catch (e) {
      throw new Error(`line ${line}: invalid contract '${name}': ${(e as Error).message}`);
    }
  }
  if (!result.length) throw new Error("expected at least one //@ ensures above debit");
  return result;
}
