import { parse } from "@babel/parser";
import { isDeepStrictEqual } from "node:util";
import type { ReplayWitness } from "../replay.ts";

type Expression = { code: string; holds(w: ReplayWitness): boolean };
export interface Contract {
  name: string;
  line: number;
  claim: string;
  lemma: string;
  holds(w: ReplayWitness): boolean;
}

const key = (w: ReplayWitness) => `${w.tenantId}/${w.accountId}`;
const receipt = (w: ReplayWitness) => `${w.tenantId}/${w.requestId}`;
const claimKey = "ReceiptKey(q.tenant, q.requestId)";
function sameReceipts(a: string[], b: string[]) {
  return a.length === b.length && a.every(value => b.includes(value));
}

const facts = new Map<string, Expression>([
  ["seen(request)", {
    code: `(${claimKey} in s.receipts)`,
    holds: w => w.before.receipts.includes(receipt(w)),
  }],
  ["funded(account,amount)", {
    code: "Funded(s, q)",
    holds: w => key(w) in w.before.balances && BigInt(w.before.balances[key(w)]!) >= BigInt(w.amountCents),
  }],
  ["debitedOnly(account,amount)", {
    code: "DebitedOnly(s, q, o)",
    holds: w => {
      const k = key(w);
      if (!(k in w.before.balances)) return false;
      const cents = (BigInt(w.before.balances[k]!) - BigInt(w.amountCents)).toString();
      return isDeepStrictEqual(w.observed.balances, { ...w.before.balances, [k]: cents });
    },
  }],
  ["recordedOnly(request)", {
    code: `(o.after.receipts == s.receipts + {${claimKey}})`,
    holds: w => sameReceipts(w.observed.receipts, [...new Set([...w.before.receipts, receipt(w)])]),
  }],
  ["unchanged()", {
    code: "(o.after == s)",
    holds: w => isDeepStrictEqual(w.observed.balances, w.before.balances)
      && sameReceipts(w.observed.receipts, w.before.receipts),
  }],
]);

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
      const inner = atom();
      return { code: `(!${inner.code})`, holds: w => !inner.holds(w) };
    }
    if (take("(")) {
      const expr = implies();
      expect(")");
      return expr;
    }
    const name = tokens[pos++];
    if (name === "true" || name === "false") return { code: name, holds: () => name === "true" };
    if (name === "result") {
      expect("===");
      const literal = tokens[pos++];
      const status = literal?.match(/^(["'])(applied|declined|duplicate)\1$/)?.[2];
      if (!status) throw new Error("expected an applied, declined or duplicate result literal");
      const constructor = status[0]!.toUpperCase() + status.slice(1);
      return { code: `(o.status == ${constructor})`, holds: w => w.observed.status === status };
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
  function and(): Expression {
    let expr = atom();
    while (take("&&")) {
      const left = expr, right = atom();
      expr = { code: `(${left.code} && ${right.code})`, holds: w => left.holds(w) && right.holds(w) };
    }
    return expr;
  }
  function or(): Expression {
    let expr = and();
    while (take("||")) {
      const left = expr, right = and();
      expr = { code: `(${left.code} || ${right.code})`, holds: w => left.holds(w) || right.holds(w) };
    }
    return expr;
  }
  function implies(): Expression {
    const left = or();
    if (!take("==>")) return left;
    const right = implies();
    return { code: `(${left.code} ==> ${right.code})`, holds: w => !left.holds(w) || right.holds(w) };
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
    const fields = /^@\s*ensures\s+([A-Za-z][A-Za-z_0-9]*)\s*:\s*(.+)$/.exec(annotation);
    if (!fields) throw new Error(`line ${line}: expected //@ ensures name: condition`);
    const name = fields[1]!, claim = fields[2]!.trim();
    if (names.has(name)) throw new Error(`line ${line}: duplicate contract '${name}'`);
    names.add(name);
    try {
      const expr = predicate(claim);
      // This hint unfolds membership for one row. It holds for *any* SQL WHERE predicate.
      const lemma = `lemma Check_${name}(s: State, q: Request)
  requires ValidState(s) && ValidRequest(q)
  ensures var o := Execute(s, q); ${expr.code}
{
  var k := AccountKey(q.tenant, q.account);
  if k in s.accounts { assert (k in MatchingRows(s, q)) == Matches(k, s.accounts[k], q); }
}`;
      result.push({ name, line, claim, lemma, holds: expr.holds });
    } catch (e) {
      throw new Error(`line ${line}: invalid contract '${name}': ${(e as Error).message}`);
    }
  }
  if (!result.length) throw new Error("expected at least one //@ ensures above debit");
  return result;
}
