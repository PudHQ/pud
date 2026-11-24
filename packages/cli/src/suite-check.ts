import { readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Unsupported } from "@pud/model/adapter";
import type { ProofAssistant, ProofClaim, ProofModule } from "@pud/model/assistant";
import type { CheckOptions, CheckResult, EmitOptions } from "./check.ts";
import { bindClaim, type Suite } from "./suite.ts";

type Read = (file: string) => { canonical: string; source: string };
type ActiveProperty = Extract<Suite["properties"][number], { kind: "claim" }>;
const loadedConfigs = new Map<string, { source: string; adapter: Promise<ProofAssistant | undefined> }>();

export function findConfig(file: string): string | undefined {
  for (let dir = dirname(file); ; dir = dirname(dir)) {
    const candidate = join(dir, "pud.config.ts");
    if (statSync(candidate, { throwIfNoEntry: false })?.isFile()) return candidate;
    if (dirname(dir) === dir) return;
  }
}

function importConfig({ canonical, source }: ReturnType<Read>) {
  const previous = loadedConfigs.get(canonical);
  if (previous?.source === source) return previous.adapter;
  const pending = (async () => {
    if (previous) await previous.adapter.catch(() => undefined);
    if (readFileSync(canonical, "utf8") !== source) throw new Error(`${canonical} changed during verification. Rerun pud check.`);
    // Bun keys the module cache by canonical path, even for imports with a query.
    delete require.cache[canonical];
    return (await import(pathToFileURL(canonical).href)).default?.adapter as ProofAssistant | undefined;
  })();
  loadedConfigs.set(canonical, { source, adapter: pending });
  void pending.catch(() => {
    if (loadedConfigs.get(canonical)?.adapter === pending) loadedConfigs.delete(canonical);
  });
  return pending;
}

async function loadAdapter(config: string | undefined, options: CheckOptions, read: Read): Promise<ProofAssistant> {
  const adapter = options.adapter ?? (config ? await importConfig(read(config)) : undefined);
  if (!adapter || typeof adapter.id !== "string" || !/^[a-z][a-z0-9_-]*$/.test(adapter.id) || typeof adapter.prepare !== "function") {
    throw new Error("Select a proof assistant with the adapter field in pud.config.ts or pass an adapter option.");
  }
  return adapter;
}

async function prepare(suite: Suite, config: string | undefined, options: CheckOptions, read: Read) {
  const adapter = await loadAdapter(config, options, read);
  const { canonical, source } = read(suite.subject.file);
  if (!canonical.endsWith(".ts") || canonical.endsWith(".d.ts")) {
    throw new Unsupported(`${suite.subject.file} must resolve to a TypeScript implementation file.`);
  }
  const subject = await adapter.prepare({ file: canonical, source, name: suite.subject.name,
    readDependency: dependency => read(resolve(dirname(canonical), dependency)).source,
  });
  if (!subject || !Array.isArray(subject.parameters) || !subject.result || typeof subject.emit !== "function" || typeof subject.verify !== "function") {
    throw new Error(`The ${adapter.id} adapter must provide a subject signature, emit(), and verify().`);
  }
  return { adapter, subject };
}

function modulesFor(suite: Suite, assistant: string, read: Read): ProofModule[] {
  const files = new Set(suite.modules.filter(module => module.assistant === assistant).map(module => module.file));
  return [...files].map(file => ({ file, source: read(file).source }));
}

function checkAssistant(claim: ProofClaim, assistant: string) {
  const terms = [claim.proof, ...[...claim.premises, ...claim.assertions].flatMap(c => c.kind === "native" ? [c.term] : [])];
  const incompatible = terms.find(term => term && term.assistant !== assistant);
  if (incompatible) throw new Unsupported(`This property uses ${incompatible.assistant} proof code. The selected adapter is ${assistant}.`);
}

function failed(error: unknown): CheckResult {
  return { status: error instanceof Unsupported ? "unsupported" : "error", detail: error instanceof Error ? error.message : String(error) };
}

export async function checkSuite(suite: Suite, config: string | undefined, options: CheckOptions, read: Read): Promise<CheckResult[]> {
  const results = new Map<ActiveProperty, CheckResult>();
  const active = suite.properties.filter(property => property.kind === "claim");
  let assistant: string | undefined;
  if (active.length) {
    try {
      const { adapter, subject } = await prepare(suite, config, options, read);
      assistant = adapter.id;
      const accepted: { property: ActiveProperty; claim: ProofClaim }[] = [];
      for (const property of active) {
        try {
          const claim = bindClaim(suite, property, subject);
          checkAssistant(claim, assistant);
          accepted.push({ property, claim });
        } catch (error) { results.set(property, failed(error)); }
      }
      if (accepted.length) {
        const outcomes = await subject.verify(accepted.map(item => item.claim), modulesFor(suite, assistant, read));
        if (!Array.isArray(outcomes) || outcomes.length !== accepted.length || accepted.some((_, index) =>
          !["proved", "disproved", "unproved", "unsupported", "error"].includes(outcomes[index]?.status ?? ""))) {
          throw new Error("The proof assistant must return one verdict per submitted claim.");
        }
        for (const [index, { property }] of accepted.entries()) {
          const outcome = outcomes[index]!;
          results.set(property, outcome.status === "disproved" ? { ...outcome, detail: outcome.counterexample.summary } : outcome);
        }
      }
    } catch (error) {
      for (const property of active) if (!results.has(property)) results.set(property, failed(error));
    }
  }
  return suite.properties.map(property => ({
    ...(property.kind === "todo" ? { status: "todo" as const } : results.get(property)!),
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
  const { adapter, subject } = await prepare(suite, config, options, read);
  const claim = bindClaim(suite, matches[0]!, subject);
  checkAssistant(claim, adapter.id);
  return subject.emit(claim, modulesFor(suite, adapter.id, read));
}
