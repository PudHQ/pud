# What should a proof runner run?

Start with [What could Pud be?](tool-directions.md) for the broad recommendation and [What would I actually write?](technical-setups.md) for competing technical setups on the same function.

The [formal recommendation](recommendation.md#the-product-choices) compares what a team would adopt for the same quota change and explains the choice of a contract checker. This brief records the earlier design exploration.

**A developer should be able to tell an agent what it may change, run `pud`, and see the first customer who would get the wrong result.** The team should also be able to keep that promise after the PR merges. That gives Pud a job on the day someone writes a feature and another job six months later.

The workbook scores **26 brainstorm pitches** and lists 109 mechanisms the authors could combine. The pitches include product ideas, features, interactions and scenarios. New pitches contains 86 proposals with worked examples and independent critiques. Thirty-seven share a mechanism already on the ballot. On **Alpha**, the shortlist shows the five highest-rated starters that fit the current budget. Change priorities on **Weights**, edit ingredients on **Recipes**, or use **Challenge the ballot** to ask what happens if one judgment is wrong. The change-permit starter costs 16 of 22 workshop points. Adding permanent rules brings the proposed alpha to 21. [Open the workbook](../../outputs/01a1e8bb-8ab5-7851-b8af-0102fd39202e/pud-alpha.xlsx)

**Rule authoring** ranks eight ways a team could express the same business problem. You can pair one with a pitch on **Alpha**. **Split a credit** lets you change the amounts and try the policy decision yourself.

## The alpha I’d try

A test runner discovers examples and reports what happened on each one. Pud would discover **promises**. Each promise names the real export, the inputs it covers, and the relationship the result must satisfy. A successful exhaustive run carries its domain with it. The useful failure is an actual input you can run again.

I’d give the first runner two words. **`always`** keeps a business promise on the current code. **`change`** describes the exact difference a PR owes its callers relative to a pinned base. Consider a team giving Pro customers free shipping from $100 after discounts. Here is proposed syntax for a small market whose shipping quote accepts up to $200. The public return contains shipping and tax. This market calculates tax independently of shipping.

```text
use quote from "./checkout.ts"

domain cart = { pro: boolean, netCents: cents(0..20000) }

change free_pro_shipping on quote(cart)
  when cart.pro && cart.netCents >= 10000
    expect { ...before, shipping: 0 }
  otherwise expect before

always shipping_is_nonnegative on quote(cart)
  result.shipping >= 0
```

The developer writes or approves two lines that matter to the business. Every other returned field, including tax, has to keep its old value. A feature that nobody implemented fails on a qualifying cart. Free shipping for everybody fails on an ineligible one. On a new export, the team can start directly with an `always` rule.

- **Run.** `pud` discovers rules, binds each export and compares the pinned base with the working tree where needed. `pud --watch` reruns affected rules on save. The first line on failure names the rule, input, expected result and actual result. `pud replay <id>` reruns the actual call locally.
- **Review.** Show a qualifying cart where the old quote charged shipping. If the eligible domain is empty, the promise needs attention. If every eligible cart already shipped free, tell the reviewer that the baseline already meets the requirement. Authored rules and imported assumptions get ordinary, reviewable diffs.
- **Merge.** Retire the temporary comparison against its original base. If free shipping is now policy, keep `pro && netCents >= 10000 ⇒ shipping == 0` as a permanent rule. A later change that reinstates the $6 fee should fail that rule. The temporary requirement to preserve this PR’s exact tax behavior can expire.

**The first engine can execute real TypeScript over every member of a small, declared domain.** For this quote there are 40,002 carts. A closed deterministic execution environment, exact integer cents, supported immutable inputs, termination and complete enumeration are part of the claim. If an import reaches a live clock, undeclared I/O or an unsupported operation, report the boundary. If a budget expires, show the inspected subset. A real customer with a $500 cart lies outside this particular rule. That matters when deciding whether the feature is ready.

## Evidence from a clean-sheet experiment

I exercised the shipping proposal with an independent TypeScript program. No Pud package participates. Of the 40,002 carts, 10,001 qualify and 30,001 fall outside the offer. These are exact counts for the stated domain.

| Change under review | Carts that break the promise | What the reviewer learns |
| --- | ---: | --- |
| Implement the stated policy | 0 | All declared carts received the specified quote. |
| Leave shipping untouched | 10,001 | Every intended beneficiary still pays $6. |
| Use `>` at the threshold | 1 | A Pro customer spending exactly $100 still pays $6. |
| Make shipping free for everybody | 30,001 | The change reaches people outside the offer. |
| Add one cent to tax | 40,002 | A shipping permit also protects the other quoted field. |
| Restore the fee in a later release | 10,001 | The permanent policy survives the PR that introduced it. |

The input already contains the net price. To check coupon normalization, a rule must bind the earlier cart operation too. A $105 cart with a $10 coupon is a good distinguishing case. Run the independent shipping and refund-splitting studies with `bun experiments/alpha-design/study.ts`. [Study source](study.ts)

## Three bets worth keeping alive

| Product | What someone would show a colleague | What would make it the lead |
| --- | --- | --- |
| **Challenge a green rule** | Two splitters conserve every cent. At 3¢ one pays `[2,1]`, the other pays `[3,0]`. The owner decides whether to add “within one cent of each other”. | At equal discovery and review time, it finds material policy choices the ordinary tooling misses. A shared pair of candidates controls for checker correctness. This rival fits in 21 points. |
| **Two-player save game** | Two developers each claim the last seat in a workspace. Either can send the four-move replay to the agent. CI can reproduce the extra membership without a person clicking. | Teams’ costly errors cluster around retries or interleavings, and the stock adapter can reproduce an independently chosen real handler without requiring its author to model it. |
| **Ask the missing question** | “There are no seats left. Can I resend an existing invitation?” Pud asks only when two admissible policies give different answers. The app can import the settled decision function. | Product owners can settle actual policy tables faster this way, and the tool correctly reopens them when a new input makes two rules disagree. |

The change permit leads at 96/100 under the initial weights. **Decide what the API has to carry** ranks second at 90. It can run before the consumer exists. For example, two shard summaries give identical row counts, medians and sums, yet require different answers on a dashboard. The six-point lead comes entirely from my repeat-use estimate. Lower the permit’s repeat-use rating from 5 to 4 and the scores tie. The **Challenge the ballot** sheet makes that assumption editable. [Run the observations](study-observations.ts)

Other contenders answer questions developers can act on immediately. Can support tell two incident causes apart using the logs it can actually read? Which eligible customers would ever choose the middle pricing tier? When two people edit the same card, do both changes survive even if every replica agrees? The workbook records a control for each question and the point where the evidence runs out. [New design rounds](rounds.md) · [Concurrent-edit study](study-collaboration.ts)

**The cheapest whole-product starter accepts any schedule that fills the most appointments.** A team supplies eligible people and times plus the scheduler’s actual output. A checked upper bound can certify several different schedules. A single better feasible schedule refutes a claimed maximum. The 13-point trial competes with running an independent matching library. On 298 of the 512 three-person, three-slot graphs in the study, more than one best answer existed. [Scheduling study](study-matching.ts)

## What if nobody has written a rule yet?

**Let a team bring a repair it already runs.** An engineer moves a 30-minute timesheet from project A to B. The app adds 30 to B and forgets to subtract 30 from A. Once the update settles, Pud could show the move, A’s stored total of 30 and the existing rebuild’s answer of zero. Our SQLite experiment also left a 10-minute error on an unrelated project. Comparing before and after let us assign only the fresh discrepancy to the move. A team with a trusted audit can try this against the cost of adding one integration assertion to its normal suite. This starter costs 18 points in the workbook. [Rebuild study](study-rebuild.ts)

**Let the previous database schema supply a case.** A migration added case-insensitive uniqueness to project names. It succeeded on every empty or single-row fixture and failed on 28 of 64 legal small databases, including a workspace with both `Plan` and `plan`. Assuming every historical writer lowercased names changed the result to zero failures on 16 states. For a real PR, Pud should show the two rows and the engine error. The owner can then decide whether those rows could exist and whether this release owes them a successful upgrade. [Migration study](study-first-run.ts) · [First-run alternatives and controls](rounds.md#round-10--what-can-pud-check-on-the-day-you-install-it)

## One library, several ways to earn a result

For an LLM-assisted spec, I’d trial a **policy diff**. The owner types “split whole credits fairly by weight.” Pud proposes the exact treatment of rounding and ties, then runs a case that distinguishes it from another plausible policy. At weights 1, 3 and 5, largest remainder gives the first person one credit from a pool of four and zero from a pool of five. There are no ties. “May this happen?” earns space in the interface. Once the owner chooses the general rule, the reviewed version supplies the expectation for every subsequent check. Choosing an outcome for just this example can also be saved as such. [Authoring experiment](rounds.md#round-12--who-gets-the-next-credit)

Two implementations of that experience deserve separate trials. A pre-payment check can inspect what the actual TypeScript returned and withhold a payout that breaks policy. A source-linked proof can establish a rule for every admitted input if the backend represents the export, the helpers it calls and the relevant TypeScript semantics. “LLM wrote a Lean theorem” leaves both the meaning of the theorem and its connection to the shipping code to be checked. [Lean proof validation](https://lean-lang.org/doc/reference/latest/ValidatingProofs/)

The public library needs `check(targets)` and a typed report shared with the CLI. Every result carries the law, resolved source revision, input domain, assumptions and evidence kind. A runtime counterexample carries a replay. A completed finite check carries the domain and count. A later symbolic backend can attach a checked claim over a wider domain. A single support incident carries that one observed outcome. Human preference becomes input to a rule after someone approves its generalization.

Keep two internal extension points. A **domain adapter** supplies supported values, controllable effects, observations and replay bindings. A **checker** consumes the exact obligation and returns typed evidence. An adapter can provide runtime evidence before it has formal semantics for an operation. The default reporter uses the same result record for humans and agents. A team should get its first local result without installing a prover, choosing an LLM or writing a SQL mock.

For a database alpha, Pud should own the stock adapter. Trial an inventory reservation on a separately chosen schema with the app’s migrations and actual handlers. Check whether it finds a wrong-row write, preserves an equivalent query edit and identifies an unmodeled trigger. A second app that needs a bespoke handler model fails the portability test. The current debit example is a feasibility observation only. [Existing database experiment](../debit-endpoint/README.md)

## Why now, and what would change the decision?

- **Verification is already part of an AI developer’s day.** In Stack Overflow’s 2026 survey, 48% of 14,304 respondents to the trust question chose the answer conditioned on being able to verify output easily. That supports trying a local, inspectable result. Demand for this specific product needs a pilot. [Survey data](https://survey.stackoverflow.co/2026/ai/data)
- **A fast runner and a reproducible failure are already expected.** Bun offers one-command discovery and watch. Fast-check gives developers minimized inputs and replay information. Pud’s differentiator has to be the business decision a proof makes possible. [Bun test runner](https://bun.com/docs/test) · [fast-check reports](https://fast-check.dev/docs/tutorials/quick-start/read-test-reports/)
- **Formal-methods tools offer several kinds of evidence.** Quint exposes simulation, model checking and model-based testing. LemmaScript documents TypeScript extraction and prover backends. These are routes to greater coverage if the first run earns a second one. [Quint documentation](https://quint.sh/docs/getting-started) · [LemmaScript toolchain](https://github.com/midspiral/LemmaScript/blob/main/TOOLS.md)

**Decision trial.** Counterbalance two workflows on six unseen pricing or entitlement modules from at least three teams. Give them the same time, domains and held-out changes. Compare Pud with ordinary property tests and old/new differential checks on a missing feature, an unauthorized change, a legitimate unrelated change and an unsupported operation. Score each author's merge decision against the independently specified outcome. Count failed setup attempts. Record cold setup and second-edit time separately.

Advance the change permit if it improves at least two of the six paired module outcomes, makes none worse, and median setup-plus-review time stays at or below the control. At least four of six authors should identify each kind of evidence correctly. Follow all enrolled teams through the same window and record the next eligible PR, including any where nobody used Pud. Require two teams to choose it again unaided. If the ordinary checks match or exceed decision accuracy on every pair and take no more time at the median, choose those checks for this workflow. Mixed results are inconclusive. A false universal verdict stops the proof claim. If an owner instead needs to know what a green rule still permits, trial the separate law challenger on its ability to discover a useful disagreement, with a shared pair as the correctness control. These are prospective decision rules. [Round-by-round decisions](rounds.md)
