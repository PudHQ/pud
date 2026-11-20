import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { contracts, type Contract, type Difference } from "./internal/contracts.ts";
import { resolveDafny, verifyFile } from "./internal/dafny.ts";
import { lower, type Transaction } from "./internal/lower.ts";
import { compileTransaction } from "./internal/lemmascript.ts";
import type { debit } from "./handler.ts";
import { replayDebit, type ReplayWitness } from "./replay.ts";

export { withPostgres } from "./postgres.ts";

type Verdict = "proved" | "disproved" | "unproved";

export interface ContractResult {
  name: string;
  title?: string;
  line: number;
  claim: string;
  status: Verdict;
  difference?: Difference;
}

interface CheckedTransaction {
  file: string;
  scope: "serializable-debit-transaction";
  contracts: ContractResult[];
  replay: { engine: string; checks: string[] };
}

export type Report =
  | { file: string; status: "error" | "unsupported"; message: string }
  | (CheckedTransaction & { status: "proved" | "unproved" })
  | (CheckedTransaction & { status: "disproved"; counterexample: ReplayWitness; modelDisagreement?: true });

const message = (error: unknown) => error instanceof Error ? error.message : String(error);

async function loadHandler(source: string): Promise<typeof debit> {
  const dir = await mkdtemp(join(tmpdir(), "pud-debit-source-"));
  try {
    const snapshot = join(dir, "handler.ts");
    await writeFile(snapshot, source);
    const module = await import(pathToFileURL(snapshot).href);
    return module.debit;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function prove(plan: Transaction, clauses: Contract[]): Promise<boolean[]> {
  const dir = await mkdtemp(join(tmpdir(), "pud-debit-proof-"));
  try {
    const [binary, ...models] = await Promise.all([
      resolveDafny(dir),
      ...["Domain", "Postgres", "Debit"].map(name => readFile(new URL(`./verifier/${name}.dfy`, import.meta.url), "utf8")),
    ]);
    const body = await compileTransaction(plan, dir);
    const results: boolean[] = [];
    for (const clause of clauses) {
      const file = join(dir, "Check.dfy");
      const check = `method Check_${clause.name}(s: State, q: Request) returns (res: Outcome)
  requires ValidState(s) && ValidRequest(q)
  ensures var o := res; o.closed && (${clause.postcondition})
${body}`;
      await writeFile(file, [...models, plan.sql, check].join("\n"));
      results.push(await verifyFile(binary, file));
    }
    return results;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Check the debit transaction in this file against the schema.sql beside it. */
export async function check(file = "handler.ts"): Promise<Report> {
  try {
    const [source, schema] = await Promise.all([
      readFile(file, "utf8"), readFile(join(dirname(file), "schema.sql"), "utf8"),
    ]);
    let generated: Transaction;
    let reviewed: ReturnType<typeof contracts>;
    try {
      generated = lower(source, schema);
      reviewed = contracts(source);
    } catch (error) {
      return { file, status: "unsupported", message: message(error) };
    }

    // Both consumers see the same validated source even if the file changes during a check.
    const handler = await loadHandler(source);
    const [proved, replay] = await Promise.all([
      prove(generated, reviewed),
      replayDebit(handler, schema, sample => reviewed.some(c => c.evaluate(sample) !== true)),
    ]);
    const witness = replay.witness;
    const results: ContractResult[] = reviewed.map((c, i) => {
      const result = { name: c.name, title: c.title, line: c.line, claim: c.claim };
      const observed = witness ? c.evaluate(witness) : true;
      if (observed !== true) return { ...result, status: "disproved", difference: observed };
      return { ...result, status: proved[i] ? "proved" : "unproved" };
    });
    const checked: CheckedTransaction = {
      file, scope: "serializable-debit-transaction", contracts: results, replay: { engine: replay.engine, checks: replay.checks },
    };
    if (witness) {
      const disagrees = results.some((c, i) => c.status === "disproved" && proved[i]);
      return { ...checked, status: "disproved", counterexample: witness, ...(disagrees && { modelDisagreement: true }) };
    }
    return { ...checked, status: proved.every(Boolean) ? "proved" : "unproved" };
  } catch (error) {
    return { file, status: "error", message: message(error) };
  }
}
