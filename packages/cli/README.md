# Pud CLI

The `pud` command discovers proof sidecars and reports the results. The `@pud/cli` package exports authoring helpers and the programmatic check and emit APIs. [Usage](../../README.md#run-your-own-checks)

## Configure a proof assistant

Create `pud.config.ts` beside your sidecars or in a parent directory. Pud uses the nearest config for each suite.

```ts
import { defineConfig } from "@pud/cli";
import { leanAdapter } from "@pud/cli/lean";

const pud = defineConfig({ adapter: leanAdapter() });

export default pud;
```

The Lean adapter locates Lean on the path or through Elan and reads the nearest `lean-toolchain` file. Pass `executable` or `toolchain` to `leanAdapter` to select them explicitly. Pud loads `pud.config.ts` as project code and reads proof sidecars as source.

### Write a portable suite

Import `pud` and the suite helpers from `@pud/cli`. The schemas in `it` describe the inputs, and `expect().to()` states what the result must satisfy for every admitted input.

```ts
import { describe, expect, given, it, pud } from "@pud/cli";
import { clamp } from "./clamp";

describe(clamp, () => {
  it("keeps the result within ordered bounds", {
    value: pud.bigint(),
    lower: pud.bigint(),
    upper: pud.bigint(),
  }, ({ value, lower, upper }) => {
    given(lower <= upper);
    expect(clamp(value, lower, upper)).to(pud.bigint().gte(lower).lte(upper));
  });
});
```

Use `pud.bigint()`, `pud.boolean()`, and `pud.array(item)` to declare TypeScript types. Chain bounds such as `.gte()` and `.lte()`, or add a predicate with `.refine(value => …)`. Refinements work on input and result schemas. Use `given()` to relate inputs.

```ts
expect(arrayContains(values, target)).to(pud.boolean().refine(found =>
  pud.iff(found, pud.exists(values, value => value === target)),
));
```

`pud.exists` and `pud.forall` quantify over the elements of an array or the values admitted by a scalar schema. Compose symbolic predicates with `pud.and`, `pud.or`, `pud.not`, `pud.implies`, and `pud.iff`. Pud translates the callbacks from source. [Supported domains and operators](experiments/lean/README.md#sidecar-syntax)

Run `pud check clamp.proof.ts` to certify the claim, or `pud --emit clamp.proof.ts` to inspect the generated unit. `it.todo(title)` reports a pending property without asking the assistant for a verdict.

### Check calls and exceptions

With the Lean adapter, `describe(encode, …)` supplies the input signature and the observation can compose imported functions.

```ts
expect(decode(encode(value))).to(pud.bigint().eq(value));
```

A property can also assert the exact class of a modeled exception. The callback keeps the throwing call inside the observation.

```ts
expect(() => divide(numerator, divisor)).toThrow("RangeError");
```

`.to()` requires a successful return. `.toThrow()` accepts `"Error"`, `"RangeError"`, or `"TypeError"` in Lean suites. [Supported calls, outcomes, and termination](experiments/lean/README.md#what-a-pass-establishes)

### Use native proof code

Import `pud` from your config when a property needs native code. Both `pud.describe()` and the schema builders carry the selected assistant's type.

```ts
import pud from "./pud.config";
import { lean } from "@pud/cli/lean";
import { increment } from "./increment";

pud.describe(increment, ({ it, expect }) => {
  it("returns a greater integer", { value: pud.bigint() }, ({ value }) => {
    expect(increment(value)).to(pud.bigint().satisfies(
      lean`fun (result : Int) => ${value} < result`,
    ));
  });
});
```

Use `.satisfies()` to add a native predicate to a schema and `.by()` to supply a proof of the whole property. A `lean` template can interpolate TypeScript expressions in scope, and `lean.ref("Namespace.name", ...args)` can name a predicate or theorem. Register a local helper file with `use(lean.module("./helper.lean"))`. [Lean examples and supported types](experiments/lean/README.md)

### Use the library

```ts
import { check, emit } from "@pud/cli";
import { leanAdapter } from "@pud/cli/lean";

const adapter = leanAdapter();
const report = await check("clamp.proof.ts", { adapter });
const unit = await emit("clamp.proof.ts", { adapter, property: "keeps the result within ordered bounds" });
```

`checkFiles(files, { adapter })` applies the same override to a batch. The explicit option takes precedence over project config. Pud checks native term IDs against the selected adapter before handing it a claim.

Another assistant can implement `ProofAssistant` from `@pud/cli`. Its `prepare` method reads the named TypeScript export from the supplied snapshot and returns its signature, an emitter, and a verifier. Pud binds the sidecar's premises and assertions to that signature and supplies the verifier one claim per active property. For a custom native tag, import `native` from `@pud/cli` and declare `const term = native("assistant-id")` at file scope before `pud.describe`. [Adapter contract](../model/src/assistant.ts)

## Development

Follow the [workspace setup](../../README.md#workspace) and run `bun run test` from the root. Run `bun run pack:cli` to write the self-contained archive to `dist/`. The archive bundles the shared verification model. [Model](../model/README.md)
