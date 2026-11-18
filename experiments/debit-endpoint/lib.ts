import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { contracts } from "./internal/contracts.ts";
import { lower } from "./internal/lower.ts";
import type { debit } from "./handler.ts";
import { replayDebit, type ReplayWitness } from "./replay.ts";

type Verdict = "proved" | "disproved" | "unproved";

export interface ContractResult {
  name: string;
  line: number;
  claim: string;
  status: Verdict;
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

const exec = promisify(execFile);
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

async function prove(model: string, lemmas: string[]): Promise<boolean[]> {
  const dir = await mkdtemp(join(tmpdir(), "pud-debit-proof-"));
  const localBin = fileURLToPath(new URL("./node_modules/.bin/", import.meta.url));
  const configured = process.env.DAFNY || Bun.which("dafny", { PATH: localBin }) || "dafny";
  const binary = configured.includes("/") && !isAbsolute(configured) ? resolve(configured) : configured;
  try {
    const results: boolean[] = [];
    for (const lemma of lemmas) {
      const file = join(dir, "Check.dfy");
      await writeFile(file, model + "\n" + lemma);
      try {
        const { stdout } = await exec(binary, ["verify", "--cores", "1", "--verification-time-limit", "10", file], {
          timeout: 30_000, maxBuffer: 1024 * 1024,
        });
        if (!/\b[1-9]\d* verified, 0 errors\b/.test(stdout)) throw new Error("Dafny produced no verification summary.");
        results.push(true);
      } catch (error) {
        const e = error as { code?: number | string; stdout?: string; stderr?: string };
        if (e.code === 4) {
          results.push(false);
          continue;
        }
        if (e.code === "ENOENT") throw new Error("Install Dafny 4.11 on PATH or set DAFNY to its executable.");
        throw new Error(e.stdout?.trim() || e.stderr?.trim() || message(error));
      }
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
    let generated: string;
    let reviewed: ReturnType<typeof contracts>;
    try {
      generated = await lower(source, schema);
      reviewed = contracts(source);
    } catch (error) {
      return { file, status: "unsupported", message: message(error) };
    }

    // Both consumers see the same validated source even if the file changes during a check.
    const handler = await loadHandler(source);
    const [domain, transaction] = await Promise.all(["Domain", "Debit"].map(name =>
      readFile(new URL(`./verifier/${name}.dfy`, import.meta.url), "utf8")));
    const model = [domain, generated, transaction].join("\n");
    const [proved, replay] = await Promise.all([
      prove(model, reviewed.map(c => c.lemma)),
      replayDebit(handler, schema, sample => reviewed.some(c => !c.holds(sample))),
    ]);
    const witness = replay.witness;
    const results: ContractResult[] = reviewed.map((c, i) => ({
      name: c.name, line: c.line, claim: c.claim,
      status: witness && !c.holds(witness) ? "disproved" : proved[i] ? "proved" : "unproved",
    }));
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
