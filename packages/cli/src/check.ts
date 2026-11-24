import { readFileSync, realpathSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { Counterexample, Predicate, SubjectSource } from "@pud/model/adapter";
import type { ProofAssistant } from "@pud/model/assistant";
import { readManifest, type AutoDefinition, type ProofDefinition, type RocqDefinition } from "@pud/model/manifest";
import { parseSourceModule } from "@pud/model/source";
import { Unsupported } from "@pud/model/typescript";
import { prepareSubject } from "./automatic.ts";
import { findCounterexample, observedReturn } from "./counterexample.ts";
import { rocq, ProofFailure } from "./rocq.ts";
import { checkSuite, emitSuite, findConfig } from "./suite-check.ts";
import { readSuite, type Suite } from "./suite.ts";
import { translate, translateSource } from "./translate.ts";

export interface CheckResult {
  status: "proved" | "disproved" | "unproved" | "unsupported" | "error" | "todo";
  name?: string;
  subject?: string;
  spec?: string;
  line?: number;
  property?: string;
  detail?: string;
  diagnostic?: string;
  counterexample?: Counterexample;
  assistant?: string;
}

export interface CheckReport { file: string; results: CheckResult[] }

/** Finished statuses follow indices in order and are provisional until snapshot validation. */
export type CheckProgress =
  | { kind: "suite"; file: string; index: number; total: number; totalItems: number; items: readonly { name: string; todo?: boolean }[] }
  | { kind: "running" | "finished"; file: string; indices: readonly number[]; statuses?: readonly CheckResult["status"][] }
  | { kind: "validating" };

export type ItemProgress = (kind: "running" | "finished", indices: readonly number[], statuses?: readonly CheckResult["status"][]) => void;

export interface CheckOptions {
  adapter?: ProofAssistant;
  onProgress?: (event: CheckProgress) => void;
}

export interface EmitOptions extends CheckOptions {
  property?: string;
}

function location(p: ProofDefinition) {
  return { name: p.name, subject: p.subject, spec: p.spec, property: p.property?.expression, line: p.property?.line };
}

function failure(e: unknown, proof?: ProofDefinition): CheckResult {
  const detail = e instanceof Error ? e.message : String(e);
  return { ...proof && location(proof), status: e instanceof Unsupported ? "unsupported" : "error", detail };
}

async function linked(proof: RocqDefinition, source: string, script: Snapshot): Promise<CheckResult> {
  const context = location(proof);
  try {
    const model = translateSource({ file: proof.source, name: proof.subject, source }, proof.property);
    const w = findCounterexample(model);
    if (w) {
      const counterexample = observedReturn(proof.binding, model.params, w.args, w.result);
      return { ...context, status: "disproved", detail: counterexample.summary, counterexample };
    }
    if ("error" in script) {
      if ((script.error as NodeJS.ErrnoException).code === "ENOENT") throw new ProofFailure(`No proof yet. Write ${proof.theorem} in ${proof.proof}.`);
      throw script.error;
    }
    await rocq.verify(model, [{ ...proof, script: script.source }]);
    return { ...context, status: "proved" };
  } catch (error) {
    if (!(error instanceof ProofFailure)) return failure(error, proof);
    const message = error.message;
    const match = /^File ("[^\n]+"), line (\d+), characters \d+-\d+:\r?\nError:\s*([\s\S]+)/m.exec(message);
    const detail = match && match[1] === JSON.stringify(proof.proof)
      ? `${relative(process.cwd(), proof.proof)}:${match[2]}  ${match[3]!.replace(/^In environment\r?\n(?:[^\n]+ : [^\n]*\n)+(?=\S)/, "")}`
      : message;
    const hint = proof.property ? "No counterexample found in the sample. The proof did not establish this property.\n" : "";
    return { ...context, status: "unproved", detail: hint + detail, diagnostic: hint + message };
  }
}

async function automatic(group: AutoDefinition[], results: Map<ProofDefinition, CheckResult>, source: SubjectSource) {
  const { subject, backend } = await prepareSubject(group[0]!, source);
  const properties = new Map<AutoDefinition, Predicate<unknown, unknown>>();
  for (const p of group) {
    try { properties.set(p, subject.bind(p.property)); }
    catch (error) { results.set(p, failure(error, p)); }
  }
  if (!properties.size) return;
  function inspect(p: AutoDefinition, predicate: Predicate<unknown, unknown>, observation: unknown) {
    try {
      const counterexample = predicate.violation(observation);
      if (!counterexample) return;
      const { summary, difference } = counterexample;
      const detail = difference ? `${summary}\n${difference.subject}\nExpected  ${difference.expected}\nReceived  ${difference.received}` : summary;
      results.set(p, { ...location(p), status: "disproved", detail, counterexample });
    } catch (e) { results.set(p, failure(e, p)); }
  }
  function inspectObservation(observation: unknown) {
    for (const [p, predicate] of properties) {
      inspect(p, predicate, observation);
      if (results.has(p)) properties.delete(p);
    }
    return properties.size === 0;
  }
  await subject.replay(inspectObservation);
  const pending = [...properties];
  if (!pending.length) return;
  const candidates: { input: unknown; owners: Set<AutoDefinition> }[] = [];
  function suggest(index: number, input: unknown) {
    const owner = pending[index]?.[0];
    if (!Number.isInteger(index) || !owner) return;
    const existing = candidates.find(candidate => isDeepStrictEqual(candidate.input, input));
    if (existing) existing.owners.add(owner);
    // Bound additional native executions by the number of properties submitted to the prover.
    else if (candidates.length < pending.length) candidates.push({ input, owners: new Set([owner]) });
  }
  const proofs = await backend.verify(subject.model, pending.map(([, predicate]) => predicate.claim), subject.observe && suggest);
  if (proofs.length !== pending.length || pending.some((_, i) => typeof proofs[i] !== "boolean")) {
    throw new Error("The proof backend must return one verdict per submitted property.");
  }
  const replayErrors = new Map<AutoDefinition, CheckResult>();
  if (subject.observe) {
    for (const { input, owners } of candidates) {
      try {
        const observed = await subject.observe(input);
        if (observed !== undefined && inspectObservation(observed)) break;
      } catch (e) {
        for (const owner of owners) replayErrors.set(owner, failure(e, owner));
      }
    }
  }
  for (const [i, [p]] of pending.entries()) {
    if (results.has(p)) continue;
    results.set(p, replayErrors.get(p) ?? (proofs[i] ? { ...location(p), status: "proved" }
      : { ...location(p), status: "unproved", detail: "The prover did not establish this property. Replay found no counterexample." }));
  }
}

type Snapshot = { canonical: string; source: string } | { error: unknown };

class SourceSnapshots {
  private inputs = new Map<string, Snapshot>();
  private contents = new Map<string, string>();

  read(file: string): Snapshot {
    const path = resolve(file);
    const existing = this.inputs.get(path);
    if (existing) return existing;
    let snapshot: Snapshot;
    try {
      const canonical = realpathSync(path);
      let source = this.contents.get(canonical);
      if (source === undefined) {
        source = readFileSync(canonical, "utf8");
        this.contents.set(canonical, source);
      }
      snapshot = { canonical, source };
    } catch (error) { snapshot = { error }; }
    this.inputs.set(path, snapshot);
    return snapshot;
  }

  changes(): Map<string, Error> {
    const current = new SourceSnapshots(), changed = new Map<string, Error>();
    for (const [path, before] of this.inputs) {
      const after = current.read(path);
      if (("error" in before) !== ("error" in after) ||
          ("source" in before && "source" in after && (before.canonical !== after.canonical || before.source !== after.source))) {
        changed.set(path, new Error(`${path} changed during verification. Rerun pud check.`));
      }
    }
    return changed;
  }
}

type ImportPath = { path: string; resolveAgain: () => string };
type Plan = { file: string; error: CheckResult }
  | { file: string; origin: string; suite: Suite; config?: string; dependencies: Set<string>; results: CheckResult[] }
  | { file: string; definitions: ProofDefinition[]; results: Map<ProofDefinition, CheckResult>; imports: ImportPath[] };

function snapshotReader(snapshots: SourceSnapshots, dependencies?: Set<string>) {
  return (file: string) => {
    const path = resolve(file);
    dependencies?.add(path);
    const input = snapshots.read(path);
    if ("error" in input) throw input.error;
    return input;
  };
}

function remappedImports(imports: readonly ImportPath[]) {
  const changed = new Map<string, Error>();
  for (const { path, resolveAgain } of imports) {
    try { if (resolveAgain() === path) continue; } catch { /* the import may now be missing or unsupported */ }
    changed.set(path, new Error(`The import of ${path} changed during verification. Rerun pud check.`));
  }
  return changed;
}

/** Check a batch against the same sidecars, subjects, linked scripts and adapter-declared model files. */
export async function checkFiles(files: readonly string[], options: CheckOptions = {}): Promise<CheckReport[]> {
  const snapshots = new SourceSnapshots();
  const dependencies = new Map<ProofDefinition, Set<string>>();
  const plans = files.map((file): Plan => {
    try {
      const manifest = snapshots.read(file);
      if ("error" in manifest) throw manifest.error;
      if (!file.endsWith(".proof.ts")) throw new Error(`Expected a *.proof.ts file: ${file}`);
      const config = findConfig(manifest.canonical);
      const suite = readSuite(file, manifest.canonical, manifest.source, parseSourceModule(file, manifest.source), config);
      if (suite) {
        if (suite.properties.some(property => property.kind === "claim")) {
          snapshots.read(suite.subject.file);
          if (config && !options.adapter) snapshots.read(config);
          for (const module of suite.modules) snapshots.read(module.file);
        }
        return { file, suite, config, origin: manifest.canonical, dependencies: new Set(), results: [] };
      }
      if (options.adapter) throw new Unsupported("The proof assistant option applies to describe() suites.");
      const imports: ImportPath[] = [];
      const definitions = readManifest(file, manifest.source, {
        origin: manifest.canonical,
        trackImport: (path, resolveAgain) => imports.push({ path, resolveAgain }),
      });
      for (const p of definitions) {
        snapshots.read(p.source);
        if (p.proof !== undefined) snapshots.read(p.proof);
      }
      return { file, definitions, results: new Map(), imports };
    } catch (e) { return { file, error: failure(e) }; }
  });

  const progress = options.onProgress;
  const totalItems = progress ? plans.reduce((count, plan) => count + ("error" in plan ? 0 : "suite" in plan
    ? plan.suite.properties.filter(property => property.kind === "claim").length : plan.definitions.length), 0) : 0;
  for (const [index, plan] of plans.entries()) {
    if (progress) {
      const items = "error" in plan ? [] : "suite" in plan
        ? plan.suite.properties.map(property => ({ name: property.name, todo: property.kind === "todo" }))
        : plan.definitions.map(property => ({ name: property.name ?? (property.spec ? `${property.subject} vs ${property.spec}` : property.subject) }));
      progress({ kind: "suite", file: plan.file, index, total: plans.length, totalItems, items });
    }
    if ("error" in plan) continue;
    const report: ItemProgress | undefined = progress && ((kind, indices, statuses) =>
      progress({ kind, file: plan.file, indices, ...(statuses && { statuses }) }));
    if ("suite" in plan) {
      plan.results = await checkSuite(plan.suite, plan.config, options, snapshotReader(snapshots, plan.dependencies), report);
      continue;
    }
    const { definitions, results } = plan;
    for (const [item, p] of definitions.entries()) {
      if (results.has(p)) continue;
      const input = snapshots.read(p.source);
      if ("error" in input) {
        const result = failure(input.error, p);
        results.set(p, result);
        report?.("finished", [item], [result.status]);
        continue;
      }
      if (p.proof !== undefined) {
        report?.("running", [item]);
        const result = await linked(p, input.source, snapshots.read(p.proof));
        results.set(p, result);
        report?.("finished", [item], [result.status]);
        continue;
      }
      const group = definitions.filter((d): d is AutoDefinition => d.proof === undefined && d.source === p.source && d.subject === p.subject);
      const paths = new Set<string>();
      for (const d of group) dependencies.set(d, paths);
      const subject: SubjectSource = { name: p.subject, file: input.canonical, source: input.source,
        readDependency(file) {
          const path = resolve(dirname(input.canonical), file);
          paths.add(path);
          const dependency = snapshots.read(path);
          if ("error" in dependency) throw dependency.error;
          return dependency.source;
        },
      };
      const running = report && group.map(proof => definitions.indexOf(proof));
      if (running) report?.("running", running);
      try { await automatic(group, results, subject); }
      catch (e) { for (const d of group) if (!results.has(d)) results.set(d, failure(e, d)); }
      if (running) report?.("finished", running, group.map(proof => results.get(proof)!.status));
    }
  }

  if (plans.length) progress?.({ kind: "validating" });
  const changed = snapshots.changes();
  return plans.map(plan => {
    const { file } = plan, manifestChange = changed.get(resolve(file));
    if ("error" in plan) return { file, results: [manifestChange ? failure(manifestChange) : plan.error] };
    if ("suite" in plan) {
      const dependency = [...plan.dependencies].find(path => changed.has(path));
      const configChange = !options.adapter && plan.results.some(result => result.status !== "todo") && findConfig(plan.origin) !== plan.config
        ? new Error(`The project configuration for ${file} changed during verification. Rerun pud check.`) : undefined;
      const remapped = plan.results.some(result => result.status !== "todo")
        ? remappedImports(plan.suite.imports).values().next().value : undefined;
      const change = configChange ?? remapped ?? (dependency ? changed.get(dependency) : undefined);
      return { file, results: plan.results.map(result => {
        const error = manifestChange ?? (result.status !== "todo" ? change : undefined);
        return error ? { ...failure(error), name: result.name, line: result.line, subject: result.subject, assistant: result.assistant } : result;
      }) };
    }
    const remapped = remappedImports(plan.imports);
    return { file, results: plan.definitions.map(p => {
      const proofInput = p.proof !== undefined ? p.proof : p.adapter?.file;
      const dependency = [...(dependencies.get(p) ?? [])].find(path => changed.has(path));
      const change = manifestChange ?? changed.get(p.source) ?? remapped.get(p.source) ?? (proofInput && (changed.get(proofInput) ?? remapped.get(proofInput)))
        ?? (dependency && changed.get(dependency));
      return change ? failure(change, p) : plan.results.get(p)!;
    }) };
  });
}

/** Check one sidecar without writing reports to stdout or importing the sidecar as executable JS. */
export async function check(file: string, options?: CheckOptions): Promise<CheckReport> {
  return (await checkFiles([file], options))[0]!;
}

function select(definitions: ProofDefinition[], name?: string): ProofDefinition {
  const subjects = [...new Set(definitions.map(p => p.binding))];
  const matches = definitions.filter(p => name === undefined || name === p.binding || name === p.name ||
    name === `${p.binding}.${p.theorem ?? p.name}`);
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1 && new Set(matches.map(p => p.binding)).size === 1) {
    if (matches.every(p => !p.property && p.spec === matches[0]!.spec)) return matches[0]!;
    const choices = matches.map(p => `${p.binding}.${p.theorem ?? p.name ?? "(unnamed)"}`).join(", ");
    throw new Error(`Select a single property for --emit. Available: ${choices}. Give each property a distinct name to select individually.`);
  }
  const problem = matches.length ? "Select a subject for --emit." : `Unknown subject or property '${name}'.`;
  throw new Error(`${problem} Available subjects: ${subjects.join(", ")}.`);
}

/** Emit the same verification unit as pud --emit, without running a prover. */
export async function emit(file: string | ProofDefinition, selector?: string | EmitOptions): Promise<string> {
  const options = typeof selector === "string" ? { property: selector } : selector ?? {};
  if (typeof file === "string") {
    if (!file.endsWith(".proof.ts")) throw new Error(`Expected a *.proof.ts file: ${file}`);
    const snapshots = new SourceSnapshots(), read = snapshotReader(snapshots);
    const manifest = read(file);
    const config = findConfig(manifest.canonical);
    const suite = readSuite(file, manifest.canonical, manifest.source, parseSourceModule(file, manifest.source), config);
    if (suite) {
      const unit = await emitSuite(suite, config, options, read);
      const changed = snapshots.changes().values().next().value ?? remappedImports(suite.imports).values().next().value;
      if (changed) throw changed;
      if (!options.adapter && findConfig(manifest.canonical) !== config) throw new Error(`The project configuration for ${file} changed during emission.`);
      return unit;
    }
  }
  if (options.adapter) throw new Unsupported("The proof assistant option applies to describe() suites.");
  const p = typeof file === "string" ? select(readManifest(file), options.property) : file;
  if (p.proof !== undefined) return rocq.emit(translate(p.source, p.subject, p.property));
  const { subject, backend } = await prepareSubject(p);
  return backend.emit(subject.model, subject.bind(p.property).claim);
}
