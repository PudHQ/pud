import { readFileSync } from "node:fs";
import { readFile, realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { dafny, expression, dafnySort, statements, type DafnyAdapter } from "@pud/model/dafny";
import type { DomainAdapter, SubjectSource } from "@pud/model/adapter";
import type { AutoDefinition } from "@pud/model/manifest";
import { observedReturn, sampleInputs } from "./counterexample.ts";
import { bindProperty, implementation, type RuntimeValue } from "./translate.ts";

interface Observation { args: RuntimeValue[]; result: RuntimeValue }

const pure: DafnyAdapter<Observation> = {
  backend: dafny,
  prepare(subject) {
    const fn = implementation(subject);
    const method = {
      parameters: fn.params.map(p => `${p.name}: ${dafnySort[p.sort]}`).join(", "),
      result: `result: ${dafnySort[fn.result]}`,
      body: statements(fn.body, {
        returned: term => `return ${expression(term)};`,
        effect: (_step: never) => { throw new Error("Unexpected effect in a pure function."); },
      }),
    };
    return {
      model: method,
      observe(input) {
        const args: RuntimeValue[] = [];
        for (const param of fn.params) {
          const value = input.get(param.name) ?? (param.sort === "integer" ? 0n : false);
          if (typeof value !== (param.sort === "integer" ? "bigint" : "boolean")) return;
          args.push(value);
        }
        return { args, result: fn.run(...args) };
      },
      bind(property) {
        const bound = bindProperty(fn, property);
        return {
          claim: expression(bound.property),
          violation({ args, result }) {
            if (bound.holds(...args, result)) return;
            return observedReturn(subject.name, fn.params, args, result);
          },
        };
      },
      replay(visit) {
        for (const args of sampleInputs(fn.params)) if (visit({ args, result: fn.run(...args) })) break;
      },
    };
  },
};

/** Only the adapter knows the observation type. The runner passes it straight from replay to the bound predicate. */
export async function prepareSubject({ source: path, subject: name, adapter }: AutoDefinition, snapshot?: SubjectSource) {
  if (!snapshot) {
    const file = await realpath(path);
    snapshot = { name, file, source: await readFile(file, "utf8"),
      readDependency: dependency => readFileSync(resolve(dirname(file), dependency), "utf8") };
  }
  const compiler: DomainAdapter<unknown, unknown, unknown, unknown> = adapter ? (await import(pathToFileURL(adapter.file).href))[adapter.binding] : pure;
  if (!compiler || typeof compiler.prepare !== "function" || typeof compiler.backend?.verify !== "function" || typeof compiler.backend.emit !== "function") {
    throw new Error("Expected a domain adapter with a prepare method and a proof backend.");
  }
  return { subject: await compiler.prepare(snapshot), backend: compiler.backend };
}
