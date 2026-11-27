import { readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { failure, Unsupported, type NativeProofTerm, type ProofAssistant, type ProofClaim, type ProofConstraint, type ProofModule, type ProofPredicate } from "./assistant.ts";
import type { CheckOptions, CheckResult, EmitOptions, ItemProgress } from "./check.ts";
import { concreteScope } from "./input-scope.ts";
import { bindClaim, type Suite } from "./suite.ts";

type Read = (file: string) => { canonical: string; source: string };

export function findConfig(file: string): string | undefined {
  for (let dir = dirname(file); ; dir = dirname(dir)) {
    const candidate = join(dir, "pud.config.ts");
    if (statSync(candidate, { throwIfNoEntry: false })?.isFile()) return candidate;
    if (dirname(dir) === dir) return;
  }
}

async function importConfig({ canonical, source }: ReturnType<Read>) {
  if (readFileSync(canonical, "utf8") !== source) throw new Error(`${canonical} changed during verification. Rerun pud check.`);
  return (await import(pathToFileURL(canonical).href)).default?.adapter as ProofAssistant | undefined;
}

async function loadAdapter(config: string | undefined, override: ProofAssistant | undefined, read: Read): Promise<ProofAssistant> {
  const adapter = override ?? (config ? await importConfig(read(config)) : undefined);
  if (!adapter || typeof adapter.id !== "string" || !/^[a-z][a-z0-9_-]*$/.test(adapter.id) || typeof adapter.prepare !== "function") {
    throw new Error("Select a proof assistant with the adapter field in pud.config.ts or pass an adapter option.");
  }
  return adapter;
}

async function prepare(suite: Suite, adapter: ProofAssistant, read: Read) {
  const { canonical, source } = read(suite.subject.file);
  if (!canonical.endsWith(".ts") || canonical.endsWith(".d.ts")) {
    throw new Unsupported(`${suite.subject.file} must resolve to a TypeScript implementation file.`);
  }
  const subject = await adapter.prepare({ file: canonical, source, name: suite.subject.name,
    readDependency: dependency => read(resolve(dirname(canonical), dependency)).source,
    readModule(path, resolveAgain) {
      if (resolveAgain) suite.imports.push({ path, resolveAgain });
      return read(path);
    },
  });
  if (!subject || !Array.isArray(subject.parameters) || !subject.result || typeof subject.emit !== "function" || typeof subject.verify !== "function") {
    throw new Error(`The ${adapter.id} adapter must provide a subject signature, emit(), and verify().`);
  }
  return subject;
}

function modulesFor(suite: Suite, assistant: string, read: Read): ProofModule[] {
  const files = new Set(suite.modules.filter(module => module.assistant === assistant).map(module => module.file));
  return [...files].map(file => ({ file, source: read(file).source }));
}

function* predicateTerms(predicate: ProofPredicate): IterableIterator<NativeProofTerm> {
  switch (predicate.kind) {
    case "boolean": return;
    case "not": yield* predicateTerms(predicate.operand); return;
    case "binary":
      yield* predicateTerms(predicate.left);
      yield* predicateTerms(predicate.right);
      return;
    case "quantifier":
      if (predicate.domain.kind === "schema") yield* constraintTerms(predicate.domain.constraints);
      yield* predicateTerms(predicate.predicate);
  }
}

function* constraintTerms(constraints: readonly ProofConstraint[]): IterableIterator<NativeProofTerm> {
  for (const constraint of constraints) {
    if (constraint.kind === "native") yield constraint.term;
    if (constraint.kind === "refinement" || constraint.kind === "proposition") yield* predicateTerms(constraint.predicate);
  }
}

function checkAssistant(claim: ProofClaim, assistant: string) {
  const terms = [claim.proof, ...constraintTerms(claim.premises), ...constraintTerms(claim.assertions)];
  const incompatible = terms.find(term => term && term.assistant !== assistant);
  if (incompatible) throw new Unsupported(`This property uses ${incompatible.assistant} proof code. The selected adapter is ${assistant}.`);
}

export async function checkSuite(suite: Suite, config: string | undefined, options: CheckOptions, read: Read, report?: ItemProgress): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const finished = new Set<number>();
  const active = suite.properties.flatMap((property, index) => property.kind === "claim" ? [{ property, index }] : []);
  let assistant: string | undefined;

  function finish(index: number, status: CheckResult["status"]) {
    if (!report || finished.has(index)) return;
    finished.add(index);
    report({ kind: "finished", indices: [index], statuses: [status] });
  }
  function record(index: number, result: CheckResult) {
    results[index] = result;
    finish(index, result.status);
  }

  if (active.length) {
    try {
      const adapter = await loadAdapter(config, options.adapter, read);
      assistant = adapter.id;
      const subject = await prepare(suite, adapter, read);
      const accepted: { index: number; claim: ProofClaim }[] = [];
      for (const { property, index } of active) {
        try {
          const claim = bindClaim(suite, property, subject);
          checkAssistant(claim, assistant);
          accepted.push({ index, claim });
        } catch (error) {
          record(index, failure(error));
        }
      }
      if (accepted.length) {
        report?.({ kind: "running", indices: accepted.map(item => item.index) });
        const outcomes = await subject.verify(accepted.map(item => item.claim), modulesFor(suite, assistant, read),
          report ? (offset, state, status) => {
            const item = accepted[offset];
            if (!item || finished.has(item.index)) return;
            if (state === "running") report({ kind: "running", indices: [item.index] });
            else if (status) finish(item.index, status);
          } : undefined);
        if (!Array.isArray(outcomes) || outcomes.length !== accepted.length || accepted.some((_, index) =>
          !["proved", "disproved", "unproved", "unsupported", "error"].includes(outcomes[index]?.status ?? ""))) {
          throw new Error("The proof assistant must return one verdict per submitted claim.");
        }
        for (const [offset, { index, claim }] of accepted.entries()) {
          const outcome = outcomes[offset]!;
          const scope = concreteScope(subject.parameters, claim);
          record(index, { ...outcome, ...(scope && { concreteScope: scope }),
            ...(claim.exactResult && { exactResult: true }),
            ...(outcome.status === "disproved" && { detail: outcome.counterexample.summary }) });
        }
      }
    } catch (error) {
      for (const { index } of active) if (!results[index]) record(index, failure(error));
    }
  }
  return suite.properties.map((property, index) => ({
    ...(property.kind === "todo" ? { status: "todo" as const } : results[index]!),
    name: property.name, line: property.line, subject: suite.subject.name, ...(assistant && { assistant }),
  }));
}

export async function emitSuite(suite: Suite, config: string | undefined, options: EmitOptions, read: Read): Promise<string> {
  const active = suite.properties.filter(property => property.kind === "claim");
  const matches = options.property
    ? active.filter(property => [suite.binding, property.name, `${suite.binding}.${property.name}`].includes(options.property!))
    : active;
  if (matches.length !== 1) {
    throw new Error(`Select one active property. Available: ${active.map(property => property.name).join(", ") || "none"}.`);
  }
  const adapter = await loadAdapter(config, options.adapter, read);
  const subject = await prepare(suite, adapter, read);
  const claim = bindClaim(suite, matches[0]!, subject);
  checkAssistant(claim, adapter.id);
  return subject.emit(claim, modulesFor(suite, adapter.id, read));
}
