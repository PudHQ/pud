import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { SubjectSource } from "@pud/model/adapter";
import { dafny, type DafnyAdapter } from "@pud/model/dafny";
import type { debit } from "./handler.ts";
import { reviewedClause, type Contract } from "./internal/contracts.ts";
import { lower } from "./internal/lower.ts";
import { transactionMethod } from "./internal/postgres-dafny.ts";
import type { ReplayWitness } from "./replay.ts";
import { Unsupported } from "@pud/model/typescript";
export type { DebitObservation } from "./internal/contracts.ts";

async function loadHandler(subject: SubjectSource): Promise<typeof debit> {
  const dir = await mkdtemp(join(tmpdir(), "pud-ledger-source-"));
  const file = join(dir, "subject.ts");
  const load = createRequire(import.meta.url);
  try {
    await writeFile(file, subject.source);
    // Inspect the module namespace synchronously, including when a sibling export is named "then".
    return load(file)[subject.name];
  } finally {
    delete load.cache[file];
    await rm(dir, { recursive: true, force: true });
  }
}

export async function prepareLedger(subject: SubjectSource) {
  const read = subject.readDependency ?? ((path: string) => readFile(path, "utf8"));
  const schema = await read(resolve(dirname(subject.file), "schema.sql"));
  let body;
  try { body = lower(subject.source, schema, subject.name, subject.file); }
  catch (error) { throw new Unsupported((error as Error).message); }
  return {
    method: await transactionMethod(body, read),
    async replay(visit: (observation: ReplayWitness) => boolean) {
      const { replayDebit } = await import("./replay.ts");
      return replayDebit(await loadHandler(subject), schema, visit, body.queries);
    },
  };
}

/** Each property also requires normal completion under the ledger's transaction protocol. */
export const ensures = (clause: Contract) => `o.closed && (${clause.postcondition})`;

export function evaluate(clause: Contract, sample: ReplayWitness) {
  if (sample.observed.threw !== undefined) return { subject: "Handler result", expected: "returned normally", received: sample.observed.status };
  const issue = sample.observed.transactionIssue;
  return issue ? { subject: "Database transaction", expected: "one closed transaction for database work", received: issue }
    : clause.evaluate(sample);
}

/** One schema and observation vocabulary serve every compatible imported handler. */
export const ledger: DafnyAdapter<ReplayWitness> = {
  backend: dafny,
  async prepare(subject) {
    const model = await prepareLedger(subject);
    return {
      model: model.method,
      bind(property) {
        const clause = reviewedClause(property, subject.name);
        return {
          claim: ensures(clause),
          violation(observation) {
            const diff = evaluate(clause, observation);
            if (diff === true) return;
            const { tenantId, accountId, requestId, amountCents, http } = observation;
            const result = http?.status === undefined ? observation.observed.status : `${http.status} ${http.result}`;
            const summary = http ? `${http.method} ${http.path} → ${result}` : observation.scenario;
            return {
              summary, input: { tenantId, accountId, requestId, amountCents },
              result: observation.observed.status, difference: diff,
            };
          },
        };
      },
      async replay(visit) { await model.replay(visit); },
    };
  },
};
