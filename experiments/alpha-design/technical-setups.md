# What would I actually write in Pud?

Take one exported TypeScript function, `admit(used: bigint, batch: bigint): boolean`. A grandfathered account can export a positive batch exactly when its nonnegative usage plus the batch fits within 16 units. At 12 used, a batch of four succeeds. At 13 used, it fails. The implementation reads the quota from a module constant. The independently reviewable rule says **16**. Reusing the implementation's constant in the rule would let a mistaken edit to 15 change both at once.

These setups address three choices that can be combined. **Where does the guarantee live? What language states it? How does the checker connect it to the code?** A sidecar could contain a Zod-like expression and use LemmaScript to generate a Dafny obligation. The location of the file commits us to neither the syntax nor the prover.

## Four setups for the same guarantee

### 1. An inline contract in the application source

```ts
const LEGACY_QUOTA = 16n
export function admit(used: bigint, batch: bigint): boolean {
  //@ verify
  //@ requires used >= 0n && batch > 0n
  //@ ensures \result === (used + batch <= 16n)
  return batch <= LEGACY_QUOTA - used
}
```

This is the LemmaScript form we ran. A developer reading `admit` sees both the promise and its implementation. The extractor gets an unambiguous target. The team adopts an annotation grammar, and reviewing a code edit includes checking whether the same edit relaxed the comment. LemmaScript/Dafny verified the original and an equivalent rewrite and rejected two faulty edits. This tested source extraction on one function. [Reproduction](../prover-comparison/quota.md)

### 2. A plain TypeScript sidecar

```ts
// quota.proof.ts
import { proof } from "@pud/cli"
import { admit } from "./quota"

export default proof(admit, "admit exactly the batches that fit", (used, batch, allowed) => {
  if (used < 0n || batch <= 0n) return true
  return allowed === (used + batch <= 16n)
})
```

This is the current Pud API. The real export supplies parameter types. The owner can review the policy file separately, and an array of named properties gives each rule its own verdict. The early return puts invalid usage and batch sizes outside this promise. It also illustrates the case for displaying preconditions explicitly in the reporter. Pud's checker must understand the callback and target. On the quota trial the existing frontend needed the source constant inlined. A separate file caused none of that limitation. [Working sidecars](../../packages/cli/demo/seats.proof.ts) · [Quota trial](../prover-comparison/quota.md)

### 3. A Zod-style language for relations

```ts
// Proposed Pud API. The named values below are expressions.
const used = p.bigint("used").min(0n)
const batch = p.bigint("batch").positive()

export default p.contract(admit)
  .args(used, batch)
  .returns(used.add(batch).lte(16n))
```

Here Pud receives an expression tree. It can print the rule, generate inputs and translate the same arithmetic to a checker. A schema saying “two bigints in, one boolean out” accepts `admit(12n, 4n) === false`. The relational `.returns(...)` is the part that rules it out. Zod itself supports refinements on values supplied to it. Checking an arbitrary refinement on a concrete tuple supplies runtime evidence for that tuple. A universal check needs semantics for the refinement. The cost of the builder is owning operators for sums, quantification, identities, multiple calls and effects as users ask for them. [Zod refinements](https://zod.dev/api#refinements)

### 4. A bridge to a native proof file

```ts
// quota.proof.ts — adapted from the existing Rocq bridge
export default [{
  subject: admit,
  property: (u: bigint, b: bigint, ok: boolean) =>
    u < 0n || b <= 0n || ok === (u + b <= 16n),
  proof: "./Quota.v",
  theorem: "admit_correct",
}]
```

The Rocq file proves `Theorem admit_correct : Subject.claim.` Pud generates the subject and expected claim from the linked export and predicate. An agent can write or repair the proof without changing the human's rule. A different bridge could put the specification itself in Rocq or Lean. Then the native proposition becomes the artifact the owner must approve. In both cases the build has to check the exact theorem type, assumptions and current source binding. A theorem about a hand-transcribed `admit` can remain true while the deployed function changes. The repo exercises this bridge on `max` and `min`; the quota binding above illustrates the design. [Existing bindings](../../packages/cli/demo/bounds.proof.ts)

## Other setups worth trying

| Setup | The quota rule in context | What adopting it buys or costs |
| --- | --- | --- |
| **Dedicated spec file**, e.g. `quota.pud` | `for quota.admit(u, b) where u >= 0 and b > 0: result iff u + b <= 16` | Concise, deterministic syntax for quantified rules and cross-call relations. Pud owns the grammar, editor support, source resolution and semantics. |
| **Prose plus a reviewed formal artifact** | The owner writes “admit exactly the positive batches that fit within 16 for nonnegative usage.” An agent proposes a typed predicate or native theorem. The PR shows the formula and both boundary calls. | The owner can begin in English. CI checks the approved formal artifact. Silent regeneration after a prose edit could replace the guarantee, so changing either reopens review. |
| **Executable policy table** | An entry `legacy → dailyLimit: 16` plus a reviewed rule `used + batch <= dailyLimit` generates the decision function the app imports. | One definition to maintain. The team moves production logic into Pud and must establish that real call sites use the generated function and the right plan. |
| **Independent reference implementation** | `equivalent(admit, referenceQuota).when(valid)` compares the optimized export with a small owner-approved calculation. | Attractive when the business already has an authoritative calculation. Shared helpers can make both sides agree on the same mistake. |
| **Contract wrapper in production** | Wrap the real export so each valid call checks `out === (u + b <= 16n)` before returning. | Covers calls through the wrapper, including code an extractor cannot translate. Per-call checks add overhead. Enforcing a balance update also requires control of the transaction. |
| **Property in Vitest or Bun** | Generate valid pairs, call the real `admit`, and assert the equality in the existing suite. | Existing team workflow and a strong baseline. Sampling can find the 12+4 mistake. An explicit finite loop can cover every member of a declared domain. Both can use the same reviewed rule. |

Except for the identified repo and LemmaScript examples, the syntax illustrates proposed interfaces. An LLM can author any of these. Having an agent supply a proof of a fixed claim and having it decide which claim to prove are two different allocations of responsibility.

## Can a real checker already handle a rule about two calls?

Yes, for this quota case. We ran the following second function **in the same module** as the annotated `admit` above. Its proposition is exactly what the proposed cache tool needs. Requests with the same key must have the same answer.

```ts
export function sameDecision(u1: bigint, b1: bigint, u2: bigint, b2: bigint): boolean {
  //@ verify
  //@ requires u1 >= 0n && b1 > 0n && u2 >= 0n && b2 > 0n
  //@ requires u1 + b1 === u2 + b2
  //@ ensures \result === true
  return admit(u1, b1) === admit(u2, b2)
}
```

Using the [pinned quota trial setup](../prover-comparison/quota.md), put the two functions in a fresh `quota.ts` and run `lsc check --backend=dafny quota.ts`. LemmaScript 0.6.10 and Dafny 4.11.0 reported **5 verified, 0 errors**. The generated verification unit contained the actual bodies of both functions. This establishes the same-total relation in that integer model for all nonnegative usages and positive batches. In a second fresh directory we replaced only the second `requires` with `u1 === u2`. The check returned **4 verified, 1 error**. Native execution independently reproduced the violation at 13 used, with batches of one and four. The theorem covers the pure boolean decision. A production cache still has to account for the policy version and any mutable inputs. [Native comparison](study-proof-tools.ts)

## The example that would decide the syntax

Give the authors a harder task before settling on the nicest-looking quota snippet. Split a nonnegative pool of whole credits across unique recipient IDs with nonnegative integer weights and a positive weight sum. State four independently reportable rules. The output has exactly the input IDs, once each, with nonnegative whole amounts. The amounts sum to the pool. Each amount lies between the floor and the ceiling of its exact weighted share. Increasing the pool by one must never reduce a recipient's payout. That fourth rule compares two calls while holding identities, weights, order and tie policy fixed.

Largest remainder pays the three recipients weighted 1, 3 and 5 the amounts **1, 1, 2** from a pool of four and **0, 2, 3** from a pool of five. No tie occurred. The owner has to decide whether the loss is allowed. A good interface lets them edit that fourth rule alone, see the two actual returns and preserve the other three. This is where a compact builder might earn its syntax, or an agent-written native lemma might earn the bridge. [Allocation study](study-allocation.ts)

**My starting choice is the typed sidecar with named ordinary predicates.** Let the agent draft it. Support a restricted, explicit language fragment. Try a pinned LemmaScript adapter behind the same source binding. Attach the obligation to the actual function declaration or independently discharge any helper contract the generated program assumes. A wrapper that imports the function as an axiom can accidentally assume the very promise being checked. Put the sidecar and inline setup in front of teams on the same quota and allocation tasks before choosing between their editing experiences. [LemmaScript cross-file semantics](https://github.com/midspiral/LemmaScript/blob/93283ec6f8c7094f0281b7c5f144e619b1f85aea/SPEC.md#29-cross-file-calls)
