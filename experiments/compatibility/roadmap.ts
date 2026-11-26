// Editorial roadmap. Measured percentages come exclusively from the runnable baseline.
type EvidenceStatus = "Demonstrated" | "Partial" | "Open" | "Contract needed" | "Proof may be needed";
interface Branch {
  id: string;
  title: string;
  depends: string[];
  evidence: [label: string, href: string];
  gate: string;
  leaves: [topic: string, status: EvidenceStatus, scope: string][];
}

export function areaStatus(leaves: Branch["leaves"]) {
  const statuses = new Set(leaves.map(([, status]) => status));
  if (statuses.size === 1 && statuses.has("Demonstrated")) return "Demonstrated";
  if (statuses.has("Demonstrated") || statuses.has("Partial")) return "Partial";
  if (statuses.has("Contract needed")) return "Needs contracts";
  if (statuses.size === 1 && statuses.has("Proof may be needed")) return "Proof may be needed";
  return "Open";
}

const handbook = "/notes/handbook/engineering/verification/";
const scorecard = handbook + "typescript-compatibility/";
const leanGuide = handbook + "lean/checking-typescript-with-lean/";
const log = "/notes/first-mate-s-log/verification/lean/";

export const roadmap: Branch[] = [
  { id: "setup", title: "Project setup", depends: [],
    evidence: ["Run a proof in a Bun project", leanGuide + "#select-lean-for-a-project"],
    gate: "Install Pud as a development tool, discover one sidecar and run it in the project's CI without changing the production build.",
    leaves: [
      ["Bun consumer", "Demonstrated", "The packed CLI and type declarations are exercised in a consumer project with Bun and Lean."],
      ["Team toolchains", "Open", "Measure first-run success for npm, pnpm, workspaces and CI images. Record setup failures and time to the first meaningful proof."],
    ] },
  { id: "projects", title: "Module linking", depends: ["setup"],
    evidence: ["Inspect the original exports and their first blockers", scorecard + "#unchanged-projects"],
    gate: "Run a sidecar on the original module. An unrelated import may be omitted only with evidence that its initialization cannot affect the observation.",
    leaves: [
      ["Same-file and relative named calls", "Demonstrated", "The adapter follows reachable functions and rechecks source and import snapshots. Cycles and executable initialization still restrict the containing module."],
      ["Production module graphs", "Open", "Resolve default and barrel exports, path aliases, package exports and live bindings under the project's loader. Preserve initialization, thrown errors and mutations of reachable bindings."],
    ] },
  { id: "typescript", title: "TypeScript types and emit", depends: ["setup"],
    evidence: ["Explore the TypeScript compiler inventory", scorecard + "#compiler-corpus"],
    gate: "Check an original function with an inferred or union signature under a narrower valid sidecar domain. Run the emitted JavaScript under the declared compiler settings.",
    leaves: [
      ["Explicit annotations and erased declarations", "Partial", "Number, bigint, boolean and selected readonly arrays have schemas. Motion’s two expression-bodied arrows infer their return type from the admitted operations."],
      ["Inference, unions and generics", "Open", "Use the project's types to choose bindings and instantiations. Validate narrowing at the proof boundary. A JavaScript caller can still violate a TypeScript annotation."],
      ["Runtime-emitting syntax", "Open", "Account for enums, namespaces, decorators, parameter properties and JSX transforms. JSX also depends on the selected runtime."],
    ] },
  { id: "values", title: "Values, operators and evaluation order", depends: ["typescript"],
    evidence: ["Inspect Motion’s unit laws and the cents rounding rule", log + "measuring-typescript-to-lean-coverage/#checked-number-examples"],
    gate: "Motion’s unchanged time conversions pass. The next gate is Actual Budget’s bounded cents round trip through its original module, numeric aliases, default precision and Math.pow.",
    leaves: [
      ["JavaScript number", "Partial", "Two unchanged Motion exports have six laws, including an exact unit rule for each. The cents example determines the nearest whole cent for every binary64 input, with explicit half ties and signed zero. Arithmetic (+, −, ×, ÷), comparisons, truthiness and four Math rounding methods have binary64 models. Remainder, exponentiation, mixed numeric types and arrays of numbers remain open."],
      ["Bigint and boolean operations", "Partial", "Signed arithmetic, short circuits, a literal left shift and low-bit masks have evidence. The Test262 panel measures its six operator files independently."],
      ["Text and coercion", "Open", "Represent UTF-16 strings, null, undefined and symbols. Specify truthiness, equality, key conversion and mixed number/bigint operations, including throws."],
    ] },
  { id: "collections", title: "Arrays and indexing", depends: ["values"],
    evidence: ["Compare two loops that sum the same array", log + "language-coverage/typescript-to-lean-coverage-map/#indexed-traversal-is-one-coverage-milestone"],
    gate: "Prove the same positive-sum law for a counted loop and for…of on the same input domain. Include the extra read at index equal to length.",
    leaves: [
      ["Dense readonly bigint arrays", "Demonstrated", "Examples prove sums, first match, and membership under standard iterator and prototype assumptions."],
      ["Indexed traversal", "Open", "Add length, numeric index reads, undefined and holes. Check the loop with stable length and with a boundary read."],
    ] },
  { id: "objects", title: "Records and object identity", depends: ["values"],
    evidence: ["Inspect the query-key object fixture", scorecard + "#case-tanstack-query-hashkey"],
    gate: "Verify a record update through two references to the same object and distinguish a missing field from a field holding undefined.",
    leaves: [
      ["Plain records", "Open", "Model field reads and writes, optional properties, destructuring and object spread. An opaque element in the current adapter hides its fields."],
      ["Aliasing, classes and prototypes", "Open", "Preserve reference identity and shared mutation. Include getters, setters, constructors, proxies and user-defined coercion before admitting those operations."],
    ] },
  { id: "control", title: "Control flow and termination", depends: ["values"],
    evidence: ["Read the current loop and exception rules", log + "configured-proof-assistant-adapters/#what-pud-implements"],
    gate: "Carry return, throw, break and continue through composed statements. Admit a termination claim only when a decrease or bound is checked.",
    leaves: [
      ["Branches and loops", "Partial", "Examples exercise locals, early returns, for…of, break, continue, a decreasing while form and direct recursion. General counted loops, switch and mutual recursion remain open."],
      ["Abrupt completion", "Partial", "Three error classes and a narrow catch have models. Add arbitrary thrown values, catch bindings and finally overriding an earlier completion."],
      ["Unbounded computation", "Proof may be needed", "An invariant or ranking function can settle a particular loop. A total automatic yes/no procedure for termination of arbitrary programs is impossible."],
    ] },
  { id: "calls", title: "Functions and callbacks", depends: ["projects", "control"],
    evidence: ["Follow the ZigZag roundtrip proof", leanGuide + "#follow-a-call-chain"],
    gate: "Check a callback-bearing real project export, including receiver binding, argument order and an abrupt callback.",
    leaves: [
      ["Direct calls", "Demonstrated", "The ZigZag roundtrip links two real implementations and checks a law over every admitted bigint."],
      ["Function values and methods", "Open", "Model closures, captured state, this, higher-order calls, spread/default parameters, iterators and generators."],
    ] },
  { id: "libraries", title: "Standard libraries", depends: ["collections", "objects", "calls"],
    evidence: ["Browse the upstream built-in tests", scorecard + "#suite-built-ins"],
    gate: "Verify a callback-based collection operation against its reference, including empty input, mutation during traversal and a callback that throws.",
    leaves: [
      ["Collections and buffers", "Open", "Track Array methods, Map, Set, typed arrays and buffers by operation and by allowed input shape."],
      ["Math", "Partial", "Math.round, floor, ceil and trunc accept one primitive number. The cents example checks which neighboring integer wins, including ties in both directions. Math.pow is still needed for Actual Budget’s configurable precision."],
      ["Text and dates", "Open", "Map JSON, RegExp, Date and internationalization to independent cases. Specify time zone or locale where the observation depends on it."],
    ] },
  { id: "effects", title: "Packages, host APIs and effects", depends: ["projects", "calls"],
    evidence: ["See which booking guarantees need a database", log + "pud-vs-vitest-workshop-booking/#why-keep-tests"],
    gate: "Bind an external call to its actual runtime implementation or a named contract. Show the assumptions alongside the property.",
    leaves: [
      ["External or native implementation", "Contract needed", "Describe allowed returns, throws, nontermination and state changes. Verify source when available, or make the dependency assumption explicit."],
      ["Console, clock, random, filesystem and network", "Contract needed", "Model observable events or allowed outcomes for a particular host. A Bun replay supplies evidence for one execution."],
      ["Database and service workflows", "Contract needed", "Specify commit, rollback, isolation, retries and provider behavior. The booking example proves its pure rules and uses integration tests for persisted effects."],
    ] },
  { id: "async", title: "Promises, scheduling and concurrency", depends: ["control", "effects"],
    evidence: ["Inspect the Hono middleware law", scorecard + "#case-honojs-hono-compose"],
    gate: "State which schedules, failures, cancellation and fairness the law covers. Check the same middleware or transaction against that model.",
    leaves: [
      ["Async/await and promises", "Open", "Model fulfillment, rejection, microtask ordering and async iteration before claiming a property of task completion."],
      ["Multiple agents and shared memory", "Contract needed", "Specify workers, atomics, allowed interleavings and memory visibility. Time bounds or fairness assumptions change the claim."],
      ["Dynamic code and host loading", "Contract needed", "Identify the possible loaded code and bindings for eval, dynamic import, FFI and plugins. An unconstrained dependency can choose any permitted outcome."],
    ] },
  { id: "assurance", title: "Claims and translation evidence", depends: ["typescript", "values"],
    evidence: ["Read the translation guarantees", log + "configured-proof-assistant-adapters/#road-to-semantic-preservation"],
    gate: "Link the user’s stated property to the observed source behavior. Keep the same law on an equivalent refactor and detect a change that violates it.",
    leaves: [
      ["Typed claims and certificates", "Demonstrated", "Lean checks invariants and exact scalar result rules. An exact rule must accept the returned value and exclude every other value at the same input. Pud audits axiom dependencies. Eligible scalar expressions also carry a certificate against Pud’s source evaluator."],
      ["Runtime correspondence", "Partial", "Differential cases compare generated Lean with Bun. Whole-language preservation also needs faithful source reification, loop-body translation, emit, module and host semantics."],
      ["Proof automation", "Proof may be needed", "A user can supply a lemma for an admitted implementation. A theorem about an unrelated replacement model cannot establish a law about the original program."],
    ] },
];
