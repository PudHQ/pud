# Pud · Product and engineering recommendation

21 November 2026 · Design study for the alpha

For the current implementation, see the [adapter-based CLI and suite API](../../packages/pud/README.md).

Read [What could Pud be?](tool-directions.md) for the broader product decision and [What would I actually write?](technical-setups.md) for the inline, sidecar, builder and prover-bridge comparison.

**Build a contract checker for existing TypeScript.** The team owns its application code and a small set of promises about what that code must do. Its agent can draft both. A human approves the promises. Pud checks them again whenever the code changes. **Try PR review as the first feature.** If an agent changes the promise itself, show the reviewer a concrete answer the edit now allows. A handwritten check in the team's existing test suite is the control for the pilot.

## The product choices

Hold the ticket constant. A SaaS team is raising the export quota for grandfathered accounts from 12 to 16 units. Which part of this work does the team give to Pud? These are competing starting points. A larger tool could combine several of them.

| What the team adopts | What it would actually do on the quota ticket | What the team takes on |
| --- | --- | --- |
| **Contract checker for existing code** | Keep the existing handler. Approve a rule that a legacy batch succeeds exactly when it fits within 16. Check that export against the rule on every edit. | Maintain an independent statement of the business rule. Pud has to support the real code. |
| **Policy compiler** | Change the quota in an executable policy table. The handler imports the decision function Pud builds from that table. | Move production decisions into Pud's language or library. The integration still needs checking. |
| **PR change reviewer** | Give Pud the base, the branch and the permitted change. Review whether any other plan or returned field changed. | Define what this PR may change. That comparison expires on merge and can preserve a bug in the base. |
| **Specification reviewer** | Before implementing the change, give Pud the proposed rule. Ask whether it still permits denying a legacy account with 9 units used and a batch of 4. | Decide which of the allowed answers the business actually wants. This tool can be useful before a handler exists. |
| **State-machine checker** | Specify how a batch reserves and consumes quota. Explore two simultaneous requests when two units remain and show an execution that overspends. | Maintain the transition model and establish how the real handler follows it. Schedule exploration inside a generic contract checker can also be an implementation feature. |
| **Reconciliation runner** | Bring an independent usage ledger and plan table. After exports settle, compare the recorded grants and remaining quota with that reference. | Own a genuinely independent calculation and decide when the state is settled. |
| **Runtime enforcer** | Put Pud on the write path. Enforce the approved cap in the same atomic operation that grants units. | Trust Pud with production latency, concurrency and failure handling. The guarantee covers operations routed through it. |
| **Proof toolchain bridge** | Bring a quota theorem, its proof and a binding to the TS export. Pud rebuilds them and reports whether the linked claim checks. | A team or its agent owns the formal artifacts. Pud must establish what the binding covers. |

**The closest alternative for this audience is the policy compiler.** It removes the need to express the quota once in the handler and again in a contract. The price is moving the production decision into Pud. The contract checker lets someone start with a handler already in service, which better fits the stated aim of adopting proofs the way teams adopt tests. That is a reason to pilot it. The quota experiments compared assertions on one fixture and give no ranking across these product choices.

Inside that choice, `*.proof.ts` versus inline annotations is an **authoring** decision. Using LemmaScript's translator versus maintaining a TS translation is an **engineering** decision. Choosing exhaustive execution or a symbolic backend determines **what evidence** Pud can return. Shipping a CLI or a Vitest integration is a **distribution** decision. Each can change without giving the customer a different product.

## The first demo

An agent edits an outage-credit policy. Both versions of the app pay **$10 for a 60-minute outage**. Both pass both versions of the policy at every minute from 0 to 120. Ordinary output comparison reports zero differences. Pud should surface the decision in review.

```text
REVIEW  Credit for a 60-minute outage
        App returned           $10 on both revisions
        Previously permitted   $10 or $15
        Now permitted          $5 or $10
```

The owner can keep the intended $10 cap and restore the $10 minimum at one hour. The $5 is a possible future payout under the edited rule. Across all 121 durations and four possible credit amounts, exactly one input/output pair became permissible and 61 ceased to be permissible. Both rules allow two answers at minute 60. A count or a single “weaker” badge would hide the decision.

Add a second promise that incidents in the same completed five-minute bucket always receive equal credit. Minute 61 must get $10 under the new rule, so minute 60 can no longer get $5 either. Show a possible answer only after considering all applicable promises. For the alpha, support this view for independent per-call rules and a declared finite output set. Mark a cross-call rule as beyond the comparison until a checker can establish a consistent whole-policy example. An implementation result and a rule-review result remain independently visible. [Runnable credit comparison](study-rule-diff.ts)

## What the team would write

Take a team raising the daily export quota for grandfathered customers from 12 to 16. A batch succeeds or fails as a whole. The output also includes the customer's retention setting. Two decisions deserve separate lifetimes.

- **Lasting policy.** Given the reported usage, the export must admit a grandfathered customer's batch exactly when it fits within 16. Enforcing the total across simultaneous requests is a separate obligation on the writer.
- **This PR.** Only the admission decision may change, only for grandfathered batches whose total lands in 13–16. Every other returned field keeps its previous value throughout the declared domain. A separate retention change next month is legitimate.

Proposed `exports.proof.ts`. The names are illustrative. The distinction between the two decisions is the API commitment.

```ts
import { policy, cases, oneOf, int } from "pud"
import { authorizeExport } from "./exports"

export default policy(authorizeExport, {
  inputs: cases({ plan: oneOf("free", "current", "legacy"), used: int(0, 16), batch: int(1, 4) }),
  always: {
    "A legacy batch is admitted exactly when it fits within 16": (r, out) =>
      r.plan !== "legacy" || out.allowed === (r.used + r.batch <= 16),
  },
  thisPR: {
    fields: ["allowed"],
    when: r => r.plan === "legacy" && r.used + r.batch > 12 && r.used + r.batch <= 16,
  },
})
```

`always` defines which answers are correct. `thisPR` defines where outputs may differ from the base. Here 68 of 204 inputs are legacy requests and 16 are owed a new answer. A no-op fails all 16. Batch size 5 is outside this fixture. A new export can start with `always` alone. Each named entry reports separately. A splitter can specify conservation, one output per weight and a rounding policy, and accept multiple valid distributions. Conservation alone leaves the division of the money undecided. [Allocation study](study-allocation.ts)

**Use ordinary, typed sidecars.** A human or their agent can draft the file. Reuse the app's input schema where it defines a finite domain. Surface any tighter bounds the author chose. In the PR, show the changed rule, its domain and a distinguishing case. For ambiguous rounding, let the owner approve either outcome, both, or leave the question open. A choice settles that case. Generalizing it requires reviewing the rule. CI reruns the approved file without an LLM. A team writes down the business promise once. Pud follows the real export and its dependencies.

**First install goes on an open PR.** Start from the ticket and an existing export. The agent drafts one lasting rule. Show the author one boundary input, the expected answer and the bounds to approve. Run `pud` for the local review. Build this around a library call so CI can enforce the identical result from an existing Vitest or Bun suite. Keep their test runner, configuration and other tests in place. Automatically restoring old code can reveal two behaviors that pass the same suite. That still leaves the reviewer to supply the business expectation. Defer automatic mutation until it beats asking for the rule directly.

**Give the comparison the lifetime of the PR.** Locally, compare the working tree to its review base. At the merge gate, compare the target tip to the prospective merge result. Pin both revisions, their dependencies, the rule and the runtime. A move on either side invalidates the result. Activate `thisPR` when the PR introduces or explicitly revises it. Retire the comparison on merge. Later implementation edits run the lasting rule. Track that rule by stable ID. Show deleted rules, newly excluded inputs and changes to imported predicates even if every remaining check passes. Flag an empty qualifying group or a base that already delivers the change. An incompatible return schema requires a reviewed mapping.

## What survived attempts to break it

| Challenge | Observed result | Consequence |
| --- | --- | --- |
| Could ordinary tests do this? | In a second synthetic case, eight boundary-aware examples missed six export batches crossing the old limit. A handwritten differential check agreed with the proposed rule on **all 1,224** combinations of 204 inputs and six possible outputs. A lookup-table oracle agreed too on the correct base. | Prove the product saves authoring or review effort, or changes a bad merge decision. Give the control the same full domain. |
| Can the old release define correctness? | With a faulty base, both relative checks accepted an inherited retention error on 68 requests. The independent policy table caught all 68. | Prefer an existing independent policy or audit when available. Confine “same as before” to the observations the owner intends to preserve. |
| Can Pud automatically keep the useful part after merge? | Retaining only “newly admitted batches succeed” missed 42 wrongful denials under the old cap and 10 grants above the new cap. The lasting exact-quota rule caught both. | Have the owner approve the enduring policy explicitly. Inferring it from the PR diff would ship weaker protection. |
| Will an ordinary source edit survive today's CLI? | Hoisting a shipping threshold from a local constant to module scope produced identical results on all 40,002 carts. The current CLI went from proved to unsupported. A different rule covering integer cents strictly between 9,999 and 10,000 proved even when nobody got free shipping. | Support ordinary local helpers and constants before a pilot. Show cohort reachability alongside truth. |
| Does the DB example generalize? | Changing only `RETURNING request_id` to `RETURNING 1` preserved the full observed HTTP and committed-state outcomes on all six Postgres scenarios. The caller reads only the row count. The public CLI moved from three proved to three unsupported. | Make replay independently available even when formal SQL support ends. The current example still requires a ledger-specific model. |

The quota comparison is standalone TypeScript. Run `bun experiments/alpha-design/study-change-review.ts` from the repository root. The shipping and SQL probes above used the public `bun run pud check … --json` on temporary source copies, with independent native execution for comparison. The reference implementations and design studies use synthetic inputs. No customer team has chosen the workflow twice in these studies. [Quota comparison](study-change-review.ts) · [Shipping study](study.ts) · [Current TS frontend](../../packages/model/src/typescript.ts) · [SQL recognizer](../debit-endpoint/internal/sql.ts)

## What earns the word “proof”

**Start by running the actual TypeScript over a complete, declared finite domain.** A small quota rule needs booleans, enums, bounded integers and immutable records. Resolve the export and its helpers using the TypeScript compiler. Execute the original code on a pinned runtime. Admit a closed deterministic fragment for the implementation, domain and predicates. Isolate each execution. Compare every field of the declared result record, including field presence. An unexpected throw on an admitted input fails a normal-return rule. An ambient clock or mutable singleton makes an all-input claim unsupported. Four independent fields with 101 values each already give 104,060,401 inputs. If a budget expires, show the count actually checked. [TypeScript compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)

The CLI and library share one report. A failure should be useful straight from the terminal.

```text
FAIL  A legacy batch is admitted exactly when it fits within 16   exports.proof.ts
      legacy · 9 used + batch of 4
      expected allowed=true   received allowed=false
      pud replay <id>
```

Show the strongest evidence each obligation earned. **Exhaustive** gives the domain, count and revision. **Proved** gives the source-linked symbolic claim and assumptions. **Failed** carries a violation reproduced against the real export. **Sampled** identifies the cases run. **Unsupported**, **inconclusive** and **tool error** explain where work stopped. Require complete evidence for each enforced promise. A report can say “6 database replays passed · symbolic SQL unsupported.” A rule edit can require **review** even when the implementation passes. Replaying the $5 example should show the app returning $10 and separately evaluate whether $5 satisfies the edited rule. The CLI and `check()` consume the same evidence. Today's CLI has discovery, `--json` and `--emit`. Watch and receipt-based replay are proposed. [Current CLI](../../packages/cli/src/cli.ts) · [Current adapter interface](../../packages/model/src/adapter.ts)

**Use Dafny/Z3 internally for supported symbolic obligations.** Z3 is a solver for logical formulas. Dafny translates a procedure and its postconditions into verification obligations which it normally discharges through Boogie and Z3. This is useful for claims such as “a successful reservation never creates seats” over unbounded integers. The costly engineering is making that formula mean what the TypeScript does. In a direct check, Bun gave `-5n / 2n === -2n`, while Dafny's native integer quotient is −3. Pud currently rejects that operator. Widen coverage only with an explicit account of JS semantics. The existing Rocq/Dafny comparison covers one `max` refactor and cannot rank provers in general. Lean and Rocq remain options when an actual rule needs an interactive proof. A checked theorem still needs the right source binding. [Dafny reference](https://dafny.org/dafny/DafnyRef/DafnyRef) · [ECMAScript BigInt division](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-bigint-divide) · [Local prover comparison](../prover-comparison/README.md) · [Lean proof validation](https://lean-lang.org/doc/reference/latest/ValidatingProofs/)

**Try pinned LemmaScript first for expanding symbolic TypeScript coverage.** We ran its published 0.6.10 CLI and Dafny 4.11.0 on a quota export with a module constant. It verified the correct body and an equivalent rewrite. It rejected a strict boundary and a quota of 15. Bun reproduced both mistakes at `admit(12n, 4n)`. Today's Pud returned unsupported on all four sources. LemmaScript also verified an always-false implementation under contradictory preconditions. Zero of the 68 replay inputs satisfied them. Pud still has a job even with a better extractor. [Reproducible head-to-head](../prover-comparison/quota.md) · [LemmaScript toolchain](https://github.com/midspiral/LemmaScript/blob/main/TOOLS.md)

Keep the typed sidecar authoritative. Prototype mechanical insertion of its reviewed claim in a pinned source copy, retaining original source locations. Inspect the generated obligation and all assumed contracts, including imported functions. Test real helper imports, exception behavior and edits that should break the rule before enabling the adapter. This trial used native annotations on one scalar function. It leaves sidecar integration, relational checks across revisions and SQL open. Start with an internal checker interface. A public adapter API can wait for a second engine that can discharge the same obligation. [LemmaScript specification](https://github.com/midspiral/LemmaScript/blob/main/SPEC.md)

## Where the database fits

An engineer supplies their handler, migrations, and the business outcome they care about. **Pud supplies the disposable database and replay adapter.** For the debit example, success includes *which tenant's balance changed* and *whether a receipt committed*. The current example executes both, but its formal scope is one normally returning serializable transaction on two known tables with a trusted tenant. A six-request PGlite replay cannot establish production concurrency, isolation across connections, or provider delivery. JS runtime internals would need their own source, semantics and properties. SaaS teams can retire redundant example tests where a Pud rule covers the same behavior and environment. Keep independent observations at the boundaries. [Debit scope](../debit-endpoint/README.md) · [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html)

The next portability trial is an inventory reservation on a second team's schema, chosen before inspecting its handler. Apply its own migrations, accept an equivalent SQL edit, and show the wrong committed row on a broken edit. Use structured keys and record the settled database revision. An unknown trigger must remain visible in the assurance report. Multi-client claims require real Postgres with controlled interleavings. If an engineer has to write a second implementation of their handler to get a result, the stock adapter failed its trial.

## What to fund next

1. **Build one vertical slice.** Bind a real export and its dependencies in two Git revisions. Verify the quota rule from a sidecar. When the rule changes, show newly permitted and excluded answers on the supported finite domain. Require a missing feature, a straddling batch, an unrelated output change, a valid refactor and an unsupported effect to give the right verdict through the public command. Target a warm edit-to-verdict under two seconds on the 204-case fixture. Measure cold installation separately. Keep the finite runner usable without installing a prover.
2. **Run an adoption trial with an honest control.** Recruit three teams. Classify their last ten consecutive PRs each and count how many were eligible. On six unseen eligible modules, compare Pud with their existing runner, including a handwritten exhaustive loop or fast-check and the same LLM access. Assign matched, disjoint edits and reverse tool order across modules. Include a later legitimate retention edit, an existing entitlement incorrectly removed and a weakened rule. A separate reviewer labels the correct merge, hold or investigate decision in advance. Score each module by the fraction of decisions correct. Count all authoring, failed setup and review time in both arms. Bun already offers discovery and watch. Fast-check already shrinks and replays failures. [Bun test runner](https://bun.com/docs/test) · [fast-check reports](https://fast-check.dev/docs/tutorials/quick-start/read-test-reports/)
3. **Decide using the pilot.** Advance if Pud improves at least two of six paired module scores, worsens none, and costs no more median setup-plus-review time. Require four of six reviewers to explain their evidence and two of three teams to choose Pud again unaided within four weeks. Report repeat use among all teams and those with a second opportunity. Withdraw a universal claim on its first false green. If ordinary checks match accuracy at equal or lower effort, keep them. If the checking library wins and teams consistently use it through Vitest, ship that integration. Mixed results warrant more observation.

### What the 26 brainstorm pitches contributed

The ballot mixes candidate products, features, interaction ideas and worked examples. Counting its rows overstated the range of product alternatives. “Explore an app world,” “play the last seat” and “fork a running checkout” all explore alternative execution histories. “Judge two outcomes blind” is an interaction a specification reviewer could use. “Accept any assignment that fills the most slots” supplies an optimization problem for a checker. The table records which ideas remain worth testing.

| Decision | Candidates from the design rounds | Reason |
| --- | --- | --- |
| Pilot as a feature | S3 · intentional-change review | A contract checker can show the effects of a PR on the actual export. How often teams use this feature needs field evidence. |
| Take constituent ideas | R1, R3, P4, S2, S4, V61, V65, V81, V82 | Use observable fields, source-linked rules and one distinguishing question now. Save retry, support, reconciliation and reversal ideas for their relevant trials. |
| Strongest competing product | Y01 · promote an existing reconciliation or rebuild into a release check | Teams with an independent recomputation already have an answer for correct state. Compare with an integration assertion around that same audit. Switch if this wins its control and earns repeat use where change review does not. [Rebuild study](study-rebuild.ts) |
| Competing technical ideas | V72 · identify missing API information. Z01 · find a plausible implementation a green rule still permits | Both show the owner a concrete decision. Pursue V72 if schema decisions recur, Z01 if owners regularly change material rules after seeing an alternative. [Interface study](study-observations.ts) · [Allocation study](study-allocation.ts) |
| Cheap independent trials | P2 · replay a support case. V63 · two edits converge while one user's intent is lost | Try these against actual support reproductions and existing reducer tests when a team brings a case. |
| Defer | R2, R4, P1, P3, S1, V62, V64, V71, V73, V74, W90 | Schedulers, production observation, multiplayer debugging, downstream consumer suites, resource guards and specialist optimization require a different owner or a stronger control. W90 already competes with rerunning an independent matching library. [Matching study](study-matching.ts) |

The workshop's 96/100 favorite outranks the API idea solely on an estimate of repeat use. The ballot gave every rival an equal or lower score on every dimension. Changing positive weights cannot produce a winner over the favorite. The hands-on comparison and the field trial carry the decision. [Design workbook and studies](README.md) · [Fifteen rounds of critique](rounds.md)
