import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { Unsupported, type Counterexample, type ProofAssistant, type ProofOutcome } from "./assistant.ts";
import type { ConcreteScope } from "./input-scope.ts";
import { parseSourceModule } from "./source.ts";
import { checkSuite, emitSuite, findConfig } from "./suite-check.ts";
import { readSuite, type Suite } from "./suite.ts";

export interface CheckResult {
  status: ProofOutcome["status"] | "todo";
  name?: string;
  subject?: string;
  line?: number;
  detail?: string;
  diagnostic?: string;
  counterexample?: Counterexample;
  concreteScope?: ConcreteScope;
  exactResult?: true;
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

export interface EmitOptions extends Pick<CheckOptions, "adapter"> {
  property?: string;
}

function failure(error: unknown): CheckResult {
  return {
    status: error instanceof Unsupported ? "unsupported" : "error",
    detail: error instanceof Error ? error.message : String(error),
  };
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

function snapshotReader(snapshots: SourceSnapshots, dependencies?: Set<string>) {
  return (file: string) => {
    const path = resolve(file);
    dependencies?.add(path);
    const input = snapshots.read(path);
    if ("error" in input) throw input.error;
    return input;
  };
}

function remappedImports(imports: Suite["imports"]) {
  const changed = new Map<string, Error>();
  for (const { path, resolveAgain } of imports) {
    try { if (resolveAgain() === path) continue; } catch { /* the import may now be missing or unsupported */ }
    changed.set(path, new Error(`The import of ${path} changed during verification. Rerun pud check.`));
  }
  return changed;
}

function parseSuite(file: string, read: ReturnType<typeof snapshotReader>) {
  if (!file.endsWith(".proof.ts")) throw new Error(`Expected a *.proof.ts file: ${file}`);
  const { canonical: origin, source } = read(file);
  const config = findConfig(origin);
  const suite = readSuite(file, origin, source, parseSourceModule(file, source), config);
  return { suite, config, origin };
}

type Plan = { file: string; error: CheckResult }
  | { file: string; origin: string; suite: Suite; config?: string; dependencies: Set<string>; results: CheckResult[] };

/** Check a batch against shared snapshots of the sidecars and their proof inputs. */
export async function checkFiles(files: readonly string[], options: CheckOptions = {}): Promise<CheckReport[]> {
  const snapshots = new SourceSnapshots();
  const read = snapshotReader(snapshots);
  const plans = files.map((file): Plan => {
    try {
      const plan = parseSuite(file, read);
      if (plan.suite.properties.some(property => property.kind === "claim")) {
        // Freeze direct inputs before any adapter starts. Track the files it actually uses below.
        snapshots.read(plan.suite.subject.file);
        if (plan.config && !options.adapter) snapshots.read(plan.config);
        for (const module of plan.suite.modules) snapshots.read(module.file);
      }
      return { file, ...plan, dependencies: new Set(), results: [] };
    } catch (error) {
      return { file, error: failure(error) };
    }
  });

  const progress = options.onProgress;
  const totalItems = progress ? plans.reduce((count, plan) => count + ("error" in plan
    ? 0 : plan.suite.properties.filter(property => property.kind === "claim").length), 0) : 0;
  for (const [index, plan] of plans.entries()) {
    if (progress) {
      const items = "error" in plan ? [] : plan.suite.properties.map(property => ({ name: property.name, todo: property.kind === "todo" }));
      progress({ kind: "suite", file: plan.file, index, total: plans.length, totalItems, items });
    }
    if ("error" in plan) continue;
    const report: ItemProgress | undefined = progress && ((kind, indices, statuses) =>
      progress({ kind, file: plan.file, indices, ...(statuses && { statuses }) }));
    plan.results = await checkSuite(plan.suite, plan.config, options, snapshotReader(snapshots, plan.dependencies), report);
  }

  if (plans.length) progress?.({ kind: "validating" });
  const changed = snapshots.changes();
  return plans.map(plan => {
    const { file } = plan;
    const sidecarChange = changed.get(resolve(file));
    if ("error" in plan) return { file, results: [sidecarChange ? failure(sidecarChange) : plan.error] };
    const dependencyChange = [...plan.dependencies].map(path => changed.get(path)).find(Boolean);
    const hasActive = plan.results.some(result => result.status !== "todo");
    const configChange = hasActive && !options.adapter && findConfig(plan.origin) !== plan.config
      ? new Error(`The project configuration for ${file} changed during verification. Rerun pud check.`) : undefined;
    const remapped = hasActive ? remappedImports(plan.suite.imports).values().next().value : undefined;
    const change = configChange ?? remapped ?? dependencyChange;
    return { file, results: plan.results.map(result => {
      const error = sidecarChange ?? (result.status !== "todo" ? change : undefined);
      const { name, line, subject, assistant } = result;
      return error ? { ...failure(error), name, line, subject, assistant } : result;
    }) };
  });
}

/** Check one sidecar from source. */
export async function check(file: string, options?: CheckOptions): Promise<CheckReport> {
  return (await checkFiles([file], options))[0]!;
}

/** Emit the same verification unit as pud --emit, without running a prover. */
export async function emit(file: string, selector?: string | EmitOptions): Promise<string> {
  const options = typeof selector === "string" ? { property: selector } : selector ?? {};
  const snapshots = new SourceSnapshots();
  const read = snapshotReader(snapshots);
  const { suite, config, origin } = parseSuite(file, read);
  const unit = await emitSuite(suite, config, options, read);
  const changed = snapshots.changes().values().next().value ?? remappedImports(suite.imports).values().next().value;
  if (changed) throw changed;
  if (!options.adapter && findConfig(origin) !== config) throw new Error(`The project configuration for ${file} changed during emission.`);
  return unit;
}
