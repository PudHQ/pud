import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readManifest, type ProofDefinition } from "@pud/model/manifest";
import { contracts, reviewedClause, type Contract, type Difference } from "./internal/contracts.ts";
import { dafny } from "@pud/model/dafny";
import { Unsupported } from "@pud/model/typescript";
import { ensures, evaluate, ledger, prepareLedger } from "./ledger.ts";
import type { ReplayWitness } from "./replay.ts";

export { withPostgres } from "@pud/postgres";

type Verdict = "proved" | "disproved" | "unproved";

export interface ContractResult {
  name: string;
  title?: string;
  line: number;
  claim: string;
  status: Verdict;
  difference?: Difference;
  counterexample?: ReplayWitness;
}

interface CheckedTransaction {
  file: string;
  scope: "serializable-debit-transaction";
  contracts: ContractResult[];
  replay: { engine: string; checks: string[]; failedChecks?: string[] };
}

export type Report =
  | { file: string; status: "error" | "unsupported"; message: string }
  | (CheckedTransaction & { status: "proved" | "unproved" })
  | (CheckedTransaction & { status: "disproved"; counterexample: ReplayWitness; modelDisagreement?: true });

const message = (error: unknown) => error instanceof Error ? error.message : String(error);

async function reviewManifest(file: string, definitions: ProofDefinition[]) {
  const first = definitions[0]!;
  if (first.proof !== undefined || !first.adapter || (await import(pathToFileURL(first.adapter.file).href))[first.adapter.binding] !== ledger) {
    throw new Unsupported("This experiment needs the ledger adapter. Use the main pud check command for other models.");
  }
  const clauses = definitions.map((p, i) => {
    if (p.proof !== undefined || p.subject !== first.subject || p.source !== first.source) throw new Unsupported("Select one ledger handler per example report.");
    const clause = reviewedClause(p.property, p.name ?? `Property ${i + 1}`);
    return { ...clause, title: p.name };
  });
  return { file, subject: { file: first.source, name: first.subject, source: await readFile(first.source, "utf8") }, clauses };
}

function legacyContracts(source: string) {
  try { return contracts(source); }
  catch (error) { throw new Unsupported(message(error)); }
}

async function review(file: string) {
  if (file.endsWith(".proof.ts")) return reviewManifest(file, readManifest(file));
  const source = await readFile(file, "utf8");
  if (/^\s*\/\/\s*@\s*ensures\b/m.test(source)) {
    return { file, subject: { file, name: "debit", source }, clauses: legacyContracts(source) };
  }
  const matches = [];
  for (const name of await readdir(dirname(file))) {
    if (!name.endsWith(".proof.ts")) continue;
    const manifest = join(dirname(file), name);
    const selected = readManifest(manifest).filter(d => d.source === resolve(file));
    if (selected.length) matches.push({ manifest, selected });
  }
  if (matches.length !== 1) throw new Unsupported("Pass the *.proof.ts file containing this handler’s properties.");
  return reviewManifest(matches[0]!.manifest, matches[0]!.selected);
}

/** The example replays the selected export and proves every reviewed property. */
export async function check(file = "debit.proof.ts"): Promise<Report> {
  try {
    let reviewed: Contract[], prepared: Awaited<ReturnType<typeof prepareLedger>>;
    try {
      const suite = await review(file);
      file = suite.file;
      reviewed = suite.clauses;
      prepared = await prepareLedger(suite.subject);
    } catch (error) {
      if (error instanceof Unsupported || error instanceof SyntaxError) {
        return { file, status: "unsupported", message: message(error) };
      }
      throw error;
    }
    const failures = new Map<Contract, { counterexample: ReplayWitness; difference: Difference }>();
    const failedChecks = new Set<string>();
    const [proved, replay] = await Promise.all([
      dafny.verify(prepared.method, reviewed.map(ensures)),
      prepared.replay(sample => {
        for (const clause of reviewed) {
          const difference = evaluate(clause, sample);
          if (difference === true) continue;
          failedChecks.add(sample.scenario);
          if (!failures.has(clause)) failures.set(clause, { counterexample: sample, difference });
        }
        return failures.size === reviewed.length;
      }),
    ]);
    const results: ContractResult[] = reviewed.map((c, i) => {
      const result = { name: c.name, title: c.title, line: c.line, claim: c.claim };
      const failure = failures.get(c);
      if (failure) return { ...result, status: "disproved", ...failure };
      return { ...result, status: proved[i] ? "proved" : "unproved" };
    });
    const checked: CheckedTransaction = {
      file, scope: "serializable-debit-transaction", contracts: results,
      replay: { engine: replay.engine, checks: replay.checks.filter(scenario => !failedChecks.has(scenario)),
        ...(failedChecks.size > 0 && { failedChecks: [...failedChecks] }) },
    };
    const witness = failures.values().next().value?.counterexample;
    if (witness) {
      const disagrees = results.some((c, i) => c.status === "disproved" && proved[i]);
      return { ...checked, status: "disproved", counterexample: witness, ...(disagrees && { modelDisagreement: true }) };
    }
    return { ...checked, status: proved.every(Boolean) ? "proved" : "unproved" };
  } catch (error) {
    return { file, status: "error", message: message(error) };
  }
}
