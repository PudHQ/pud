# Writing proofs with Pud

The [package quickstart](./README.md) checks a rounding rule for a TypeScript function. This guide builds on that example with input constraints, exact results, exceptions, native Lean terms, and the programmatic API.

## Writing properties

With `.toExactly()`, the function must return an answer accepted by the schema, and the schema must exclude every other answer. In the rounding example, change the result rule to `.refine(cents => Number.isInteger(cents))` and enable replay. At an amount of zero, Pud shows that both 0 and 1 cent satisfy the weaker rule. The CLI labels exact result claims `[exact result]`.

Start with the inputs the caller may actually supply. Each `given()` narrows that promise. Here, requiring an already-integral scaled amount would exclude precisely the fractions that need rounding. Choose the rounding policy independently of the implementation. For example, `toCents(1.005)` returns 100.

Use `pud.number()` for ordinary TypeScript numbers. The Lean adapter models binary64 arithmetic, including fractions, overflow and signed zero. Numeric `.eq()` and `toEqual()` use JavaScript strict equality, so the two zeros compare equal and NaN compares unequal to itself. Use `.sameValue(value)` to express `Object.is` equality, including the sign of zero. Exact result schemas use that same distinction when checking uniqueness, and also support bigint and boolean returns. [Motion time conversions](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/motion/seconds.proof.ts) · [Currency rounding](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/cents.proof.ts)

Use `.to()` for an invariant. For example, `expect(clamp(value, lower, upper)).to(pud.bigint().gte(lower).lte(upper))` guarantees bounds when `lower <= upper`. A clamp that always returns the lower bound also satisfies this property. [Clamp sidecar](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/clamp.proof.ts)

Use `pud.bigint()`, `pud.boolean()`, and `pud.array(item)` for the other supported inputs. Chain bounds such as `.gte()` and `.lte()`, or add a predicate with `.refine(value => …)`. Refinements work on input and result schemas. Use `given()` to relate inputs.

```ts
expect(arrayContains(values, target)).to(pud.boolean().refine(found =>
  pud.iff(found, pud.exists(values, value => value === target)),
));
```

`pud.exists` and `pud.forall` quantify over the elements of an array or the values admitted by a scalar schema. Compose symbolic predicates with `pud.and`, `pud.or`, `pud.not`, `pud.implies`, and `pud.iff`. Pud translates the callbacks from source. [Supported domains and operators](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/README.md#sidecar-syntax)

Run `npx pud.dev check cents.proof.ts` to certify the claim or `npx pud.dev --emit cents.proof.ts` to see the quantified theorem. `npx pud.dev check --deny-cases` makes CI reject recognized example cases. It flags a parameterless check or literal equalities on every parameter, including simple `given()` and refinement equalities or matching inclusive bounds. A fixed policy threshold, a fixed result or one fixed argument in a larger domain can all belong in a law. The guard recognizes explicit syntax. More complex preconditions can still describe a singleton or an empty domain. `it.todo(title)` records a pending property.

The terminal highlights the active property, its elapsed time, and the time for the whole run. A trail marks queued and completed checks. After validating the input snapshots, Pud groups verdicts, timings, and diagnostics by sidecar. Redirected output uses plain rows, and `--json` returns the machine-readable report.

### Check calls and exceptions

With the Lean adapter, `describe(encode, …)` supplies the input signature and the observation can compose imported functions.

```ts
expect(decode(encode(value))).to(pud.bigint().eq(value));
```

Use `expect(call()).toEqual(reference())` to compare two linked, nonthrowing calls that return the same scalar type. The sidecar can supply input constraints with `given()` before the check. The generated claim links and compares both implementations. [Availability example](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/availability/README.md)

With `leanAdapter({ replay: true })`, an open scalar result predicate or call equality can produce a concrete counterexample. Pud filters candidate inputs through the supported schema and `given()` conditions, runs the frozen TypeScript in Bun, and reports the input and observed result on a violation. Native predicates and quantified assertions are outside replay. Only the proof assistant can establish a pass. Enable replay for source you trust to execute.

A property can also assert the exact class of a modeled exception. The callback keeps the throwing call inside the observation.

```ts
expect(() => divide(numerator, divisor)).toThrow("RangeError");
```

`.to()` requires a successful return. `.toThrow()` accepts `"Error"`, `"RangeError"`, or `"TypeError"` in Lean suites. [Supported calls, outcomes, and termination](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/README.md#what-a-pass-establishes)

### Use native proof code

Import `pud` from your config when a property needs native code. Both `pud.describe()` and the schema builders carry the selected assistant's type.

```ts
import pud from "./pud.config";
import { lean } from "pud.dev/lean";
import { increment } from "./increment";

pud.describe(increment, ({ it, expect }) => {
  it("returns a greater integer", { value: pud.bigint() }, ({ value }) => {
    expect(increment(value)).to(pud.bigint().satisfies(
      lean`fun (result : Int) => ${value} < result`,
    ));
  });
});
```

Use `.satisfies()` to add a native predicate to a schema and `.by()` to supply a proof of the whole property. A `lean` template can interpolate TypeScript expressions in scope, and `lean.ref("Namespace.name", ...args)` can name a predicate or theorem. Register a local helper file with `use(lean.module("./helper.lean"))`. [Lean examples and supported types](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/README.md)

### Use the library

```ts
import { check, emit } from "pud.dev";
import { leanAdapter } from "pud.dev/lean";

const adapter = leanAdapter();
const report = await check("clamp.proof.ts", { adapter });
const unit = await emit("clamp.proof.ts", { adapter, property: "keeps the result within ordered bounds" });
```

`checkFiles(files, { adapter })` applies the same override to a batch and runs the supplied adapter in the caller’s process. When Pud loads the project config, each `check`, `checkFiles`, or `emit` call starts a fresh Bun process. Suites in one batch share its loaded modules. The next call picks up edits to the config and its imports. Project logs go to stderr so the CLI can pipe a JSON report or an emitted unit through stdout.

An adapter implements `ProofAssistant` from `pud.dev` and supplies a stable assistant ID. Its `prepare` method reads the named TypeScript export from the supplied snapshot and returns its signature, an emitter, and a verifier. Pud binds one `ProofClaim` per active property and checks its native term IDs against the adapter. Switch on `claim.kind` to handle a return rule (`"return"`), equality with a reference call (`"equal"`), or an expected exception (`"throw"`). Exact return rules carry `exactResult: true`. For a custom native tag, import `native` from `pud.dev` and declare `const term = native("assistant-id")` at file scope before `pud.describe`. [Adapter contract](https://github.com/PudHQ/pud/blob/main/packages/pud/src/assistant.ts)

Use `checkFiles(files, { onProgress })` for a live view. Suite events declare the queue and total item count. Each active property index appears in exactly one `finished` event during a completed run. Its status is at the same position in `statuses`. Pending properties stay out of the count. The `validating` event precedes the input snapshot check. The returned reports carry the final verdicts.

## Development

Follow the [workspace setup](https://github.com/PudHQ/pud#workspace) and run `bun run test` from the root. Run `bun run pack:cli` to write the self-contained archive to `dist/`. The archive contains the executable, both public entry points, and their TypeScript declarations.
