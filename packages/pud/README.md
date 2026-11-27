# Pud

The `@pud.dev/lib` package provides the command, the TypeScript suite API, and the proof-assistant adapter contract. A project selects its driver in `pud.config.ts`. Lean is the first bundled driver, available from `@pud.dev/lib/lean`. [Quick start](../../README.md#try-it-locally)

## Configure a proof assistant

Create `pud.config.ts` beside your sidecars or in a parent directory. Pud uses the nearest config for each suite.

```ts
import { defineConfig } from "@pud.dev/lib";
import { leanAdapter } from "@pud.dev/lib/lean";

const pud = defineConfig({ adapter: leanAdapter() });

export default pud;
```

The Lean adapter locates Lean on the path or through Elan and reads the nearest `lean-toolchain` file. Pass `executable` or `toolchain` to `leanAdapter` to select them explicitly. Pud loads `pud.config.ts` as project code and reads proof sidecars as source.

### Write a portable suite

Import `pud` and the suite helpers from `@pud.dev/lib`. Declare the inputs in `it()`. When the caller expects one particular answer, describe it with an exact result schema.

```ts
import { describe, expect, it, pud } from "@pud.dev/lib";
import { toCents } from "./cents.ts";

describe(toCents, () => {
  it("returns the nearest whole cent, with half cents rounded toward positive infinity", {
    amount: pud.number(),
  }, ({ amount }) => {
    expect(toCents(amount)).toExactly(pud.number().nearestIntegerTo(amount * 100, { ties: "up" }));
  });
});
```

Lean checks two things for every admitted input. The function returns an answer accepted by the schema, and every other answer is excluded. At 12.5 cents, this rule requires 13. Change the rule to `.refine(cents => Number.isInteger(cents))` and enable replay. At an amount of zero, Pud shows that both 0 and 1 cent satisfy the weaker rule. The CLI labels exact result claims `[exact result]`.

Start with the inputs the caller may actually supply. Each `given()` narrows that promise. Here, requiring an already-integral scaled amount would exclude precisely the fractions that need rounding. Choose the rounding policy independently of the implementation. This example rounds the JavaScript product `amount * 100`, so `0.29` returns 29 and `1.005` returns 100. A policy defined on decimal input text has a different contract.

Use `pud.number()` for ordinary TypeScript numbers. The Lean adapter models binary64 arithmetic, including fractions, overflow and signed zero. Numeric `.eq()` and `toEqual()` use JavaScript strict equality, so the two zeros compare equal and NaN compares unequal to itself. Use `.sameValue(value)` to express `Object.is` equality, including the sign of zero. Exact result schemas use that same distinction when checking uniqueness, and also support bigint and boolean returns. [Motion time conversions](.examples/motion/seconds.proof.ts) · [Currency rounding](.examples/cents.proof.ts)

Use `.to()` for an invariant. For example, `expect(clamp(value, lower, upper)).to(pud.bigint().gte(lower).lte(upper))` guarantees bounds when `lower <= upper`. A clamp that always returns the lower bound also satisfies this property. [Clamp sidecar](.examples/clamp.proof.ts)

Use `pud.bigint()`, `pud.boolean()`, and `pud.array(item)` for the other supported inputs. Chain bounds such as `.gte()` and `.lte()`, or add a predicate with `.refine(value => …)`. Refinements work on input and result schemas. Use `given()` to relate inputs.

```ts
expect(arrayContains(values, target)).to(pud.boolean().refine(found =>
  pud.iff(found, pud.exists(values, value => value === target)),
));
```

`pud.exists` and `pud.forall` quantify over the elements of an array or the values admitted by a scalar schema. Compose symbolic predicates with `pud.and`, `pud.or`, `pud.not`, `pud.implies`, and `pud.iff`. Pud translates the callbacks from source. [Supported domains and operators](.examples/README.md#sidecar-syntax)

Run `pud check cents.proof.ts` to certify the claim or `pud --emit cents.proof.ts` to see the quantified theorem. `pud check --deny-cases` makes CI reject recognized example cases. It flags a parameterless check or literal equalities on every parameter, including simple `given()` and refinement equalities or matching inclusive bounds. A fixed policy threshold, a fixed result or one fixed argument in a larger domain can all belong in a law. The guard recognizes explicit syntax. More complex preconditions can still describe a singleton or an empty domain. `it.todo(title)` records a pending property.

The terminal highlights the active property, its elapsed time, and the time for the whole run. A trail marks queued and completed checks. After validating the input snapshots, Pud groups verdicts, timings, and diagnostics by sidecar. Redirected output uses plain rows, and `--json` returns the machine-readable report.

### Check calls and exceptions

With the Lean adapter, `describe(encode, …)` supplies the input signature and the observation can compose imported functions.

```ts
expect(decode(encode(value))).to(pud.bigint().eq(value));
```

Use `expect(call()).toEqual(reference())` to compare two linked, nonthrowing calls that return the same scalar type. The sidecar can supply input constraints with `given()` before the check. The generated claim links and compares both implementations. [Availability example](.examples/availability/README.md)

With `leanAdapter({ replay: true })`, an open scalar result predicate or call equality can produce a concrete counterexample. Pud filters candidate inputs through the supported schema and `given()` conditions, runs the frozen TypeScript in Bun, and reports the input and observed result on a violation. Native predicates and quantified assertions are outside replay. Only the proof assistant can establish a pass. Enable replay for source you trust to execute.

A property can also assert the exact class of a modeled exception. The callback keeps the throwing call inside the observation.

```ts
expect(() => divide(numerator, divisor)).toThrow("RangeError");
```

`.to()` requires a successful return. `.toThrow()` accepts `"Error"`, `"RangeError"`, or `"TypeError"` in Lean suites. [Supported calls, outcomes, and termination](.examples/README.md#what-a-pass-establishes)

### Use native proof code

Import `pud` from your config when a property needs native code. Both `pud.describe()` and the schema builders carry the selected assistant's type.

```ts
import pud from "./pud.config";
import { lean } from "@pud.dev/lib/lean";
import { increment } from "./increment";

pud.describe(increment, ({ it, expect }) => {
  it("returns a greater integer", { value: pud.bigint() }, ({ value }) => {
    expect(increment(value)).to(pud.bigint().satisfies(
      lean`fun (result : Int) => ${value} < result`,
    ));
  });
});
```

Use `.satisfies()` to add a native predicate to a schema and `.by()` to supply a proof of the whole property. A `lean` template can interpolate TypeScript expressions in scope, and `lean.ref("Namespace.name", ...args)` can name a predicate or theorem. Register a local helper file with `use(lean.module("./helper.lean"))`. [Lean examples and supported types](.examples/README.md)

### Use the library

```ts
import { check, emit } from "@pud.dev/lib";
import { leanAdapter } from "@pud.dev/lib/lean";

const adapter = leanAdapter();
const report = await check("clamp.proof.ts", { adapter });
const unit = await emit("clamp.proof.ts", { adapter, property: "keeps the result within ordered bounds" });
```

`checkFiles(files, { adapter })` applies the same override to a batch and runs the supplied adapter in the caller’s process. When Pud loads the project config, each `check`, `checkFiles`, or `emit` call starts a fresh Bun process. Suites in one batch share its loaded modules. The next call picks up edits to the config and its imports. Project logs go to stderr so the CLI can pipe a JSON report or an emitted unit through stdout.

An adapter implements `ProofAssistant` from `@pud.dev/lib` and supplies a stable assistant ID. Its `prepare` method reads the named TypeScript export from the supplied snapshot and returns its signature, an emitter, and a verifier. Pud binds one `ProofClaim` per active property and checks its native term IDs against the adapter. Switch on `claim.kind` to handle a return rule (`"return"`), equality with a reference call (`"equal"`), or an expected exception (`"throw"`). Exact return rules carry `exactResult: true`. For a custom native tag, import `native` from `@pud.dev/lib` and declare `const term = native("assistant-id")` at file scope before `pud.describe`. [Adapter contract](src/assistant.ts)

Use `checkFiles(files, { onProgress })` for a live view. Suite events declare the queue and total item count. Each active property index appears in exactly one `finished` event during a completed run. Its status is at the same position in `statuses`. Pending properties stay out of the count. The `validating` event precedes the input snapshot check. The returned reports carry the final verdicts.

## Development

Follow the [workspace setup](../../README.md#workspace) and run `bun run test` from the root. Run `bun run pack:cli` to write the self-contained archive to `dist/`. The archive contains the executable, both public entry points, and their TypeScript declarations.
