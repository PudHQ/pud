import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expression, statements, type Method } from "@pud/model/dafny";
import type { Transaction } from "./lower.ts";

/** Emit the database operations here. The shared renderer owns statement order and early exits. */
export async function transactionMethod(
  { body }: Transaction,
  read: (path: string) => string | Promise<string> = path => readFile(path, "utf8"),
): Promise<Method> {
  const models = await Promise.all(["Domain", "Postgres", "Debit"].map(name =>
    read(fileURLToPath(new URL(`../verifier/${name}.dfy`, import.meta.url)))));
  const definitions: string[] = [];
  const code = statements(body, {
    returned(value) {
      const closed = value.threw ? "false" : "valid && !active";
      return `return Outcome(${expression(value.status)}, ${expression(value.isText)}, committed, ${closed});`;
    },
    effect({ slot, operation: op }) {
      switch (op.kind) {
        case "begin": return "valid := valid && !started;\nstarted := true;\nactive := true;\nworking := committed;";
        case "commit": return "valid := valid && active;\nactive := false;\ncommitted := working;";
        case "rollback": return "valid := valid && active;\nactive := false;\nworking := committed;";
      }
      let query: string;
      if (op.kind === "insert") {
        query = `InsertReceipt(working, ReceiptKey(${expression(op.tenant)}, ${expression(op.request)}))`;
      } else {
        const matches = `Matches${slot}`, update = `Update${slot}`;
        const balance = op.subtract ? `s.accounts[k] - ${expression(op.subtract)}` : "s.accounts[k]";
        definitions.push(`predicate ${matches}(k: AccountKey, balance: int, q: Request) { ${expression(op.condition)} }
function ${update}(s: State, q: Request): (r: QueryResult)
  ensures forall k | k in s.accounts :: ${matches}(k, s.accounts[k], q) ==> r.rowCount > 0
{
  var rows := set k | k in s.accounts && ${matches}(k, s.accounts[k], q);
  assert forall k | k in s.accounts && ${matches}(k, s.accounts[k], q) :: |rows| > 0 by {
    forall k | k in s.accounts && ${matches}(k, s.accounts[k], q)
      ensures |rows| > 0 {
      assert k in rows;
      assert {k} <= rows;
    }
  }
  var balances := map k | k in s.accounts :: if k in rows then ${balance} else s.accounts[k];
  QueryResult(State(balances, s.receipts), |rows|)
}`);
        query = `${update}(working, q)`;
      }
      return `valid := valid && active;\nvar rows${slot} := ${query};\nworking := rows${slot}.after;`;
    },
  });
  return {
    declarations: [...models, ...definitions].join("\n"),
    parameters: "s: State, q: Request",
    result: "o: Outcome",
    requires: "ValidState(s) && ValidRequest(q)",
    body: [
      "  var committed := s;", "  var working := s;", "  var active := false;",
      "  var started := false;", "  var valid := true;", code,
      '  return Outcome("", false, committed, valid && !active);',
    ].join("\n"),
  };
}
