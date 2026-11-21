# What survived the design rounds

The [product comparison](recommendation.md#the-product-choices) revisits this brainstorm. Rounds 1–3 record the earlier exploration. Round 4 deliberately restarted with fresh agents who had seen neither the shortlist nor the implementation. Round 5 combines and challenges their results.

## Round 1 · What should a developer get back from Pud?

Four cooking agents proposed 63 ideas across authoring, SaaS infrastructure, review workflows and greenfield products. An independent critic challenged the mechanisms against examples. Several pitches shared one mechanism. A “replay capsule”, a “proof-carrying fixture” and a one-command replay all need the same small case that runs on the right revision. The workbook counts that work once.

| Original pitch | Where it broke | Patched design |
| --- | --- | --- |
| Let a developer pick the right split of the last cent. | Choosing `[1,0]` over `[0,1]` could mean “first recipient” or “oldest account”. Both fit the example. | Shuffle the IDs and ask a distinguishing follow-up. Offer “either” and “undecided”. The developer reviews any proposed general rule. |
| Show what a rule edit newly permits. | Changing `asked > 0` to `asked > 1` drops the one-cent guarantee without editing the return condition. | Compare both input domains, then compare allowed results in each direction on shared inputs. Report inconclusive searches. |
| Have an agent find an implementation that cheats. | A different implementation can be perfectly acceptable. Impossible preconditions let anything pass. | Establish a nonempty domain, check the candidate against every applicable rule and give a concrete disagreement. The reviewer decides whether the extra freedom matters. |
| Freeze the agent’s brief by pinning its rule file. | An edit to the imported `debitedOnly` predicate can change the claim while the file stays byte-identical. | Bind expanded rules, source, schema, adapter and toolchain to the result. Show changed assumptions during review. |
| Derive allowed writes and replay every database failure. | A trigger can add another write outside the modeled transaction. Six clean replays say little about unseen states. | Surface unsupported schema features. Distinguish a model witness from a reproduced violation and attach the actual row change to the latter. |
| Let a spreadsheet or documentation page specify refunds. | Two inclusive tiers can both own day 30. A catch-all can hide a missing tier. “30 days” leaves calendar versus elapsed time open. | Check coverage, overlaps and shadowed rows on a declared domain. Set the time convention and check the shipping consumer against the table. Publish the reviewed revision. |

**Observed in Pud.** A fresh `bigint` refund function passed a rule requiring full payment for valid requests. Adding `if (asked === 10n) return 0n` failed on `(10n, 0n, 10n)`. Adding a `Date.now()` condition produced a source-located `UNSUPPORTED`. Weakening the rule to `0 ≤ paid ≤ asked` allowed a manually supplied implementation consisting entirely of `return 0n`. The current CLI verified that implementation. Discovering it automatically is a proposal.

## Round 2 · Which moment would bring someone back?

A portfolio cook combined the cards into distinct products. A second critic argued for the rewrite tool as an entry point. An engineer already has two revisions whenever an agent opens a refactor PR. Rule review first requires a rule somebody cares enough to maintain. Four competing demos survived.

| Product | Minute-one demo | Critic’s patch and test |
| --- | --- | --- |
| Review a rule | Weaken a 10¢ refund from “pay exactly” to “pay up to”. Show a newly legal payout of 9¢ alongside the implementation’s actual 10¢. A separate Bun evaluation confirmed both facts. | Hand a reviewer two changes with identical inputs, one to code and one to policy. Can they identify which edit changed the amount the function returned? |
| Inspect a database write | Remove the tenant filter from the debit handler. In the actual demo a request from Acme moved Birch’s balance from 100¢ to 70¢. | Try an independently chosen inventory handler with different keys and tables. The team must get a useful result from its existing schema without modeling the handler. Keep transaction isolation and unmodeled effects visible. |
| Review a rewrite | Compare `base * rate / 100n` and `base / 100n * rate`. At 10%, Bun returned 5¢ and 0¢ for a 50¢ base. Both formulas agreed at 0¢ and 100¢. | Compare the same domain under both revisions. Pin observed fields and treatment of exceptions. An equivalence claim can preserve an existing pricing bug. |
| Review a policy table | Change an inclusive refund cutoff so two rows match day 30. A Bun check confirmed the overlap. Then change which row wins in the checkout implementation. | A clean table can still encode the wrong policy. Check a separately supplied customer example and the actual consumer’s agreement. Defer docs publishing until teams reuse the table. |

**What would settle it.** Give maintainers held-out changes in their own projects. Count setup failures and unsupported code. Record whether they explain the result unprompted, change a merge decision, and run Pud on their next PR. The probes above establish concrete behavior. Repeat use and willingness to adopt still need that pilot.

## Round 3 · Could a diff be the product?

The provisional recommendation was to lead with a comparison of two revisions and add permanent rules behind it. A third critic pointed out that a pricing feature is *supposed* to produce differences. A red cross on every intended change would make this a poor CI default. The patched comparison reports both actual returns and reserves a failed business verdict for a violated promise. A helper-only one-cent change must invalidate the comparison. A renamed helper with the same behavior is its negative control.

Two independently written refund implementations passed the same partial rule in the current CLI. That established the rule for each implementation’s supported model. It left open whether they returned the same result on other calls. Both versions of the cents-and-percentage example also reached unsupported bigint division in the current translator. Those observations motivated a separate look at engines that can run actual TS on a closed domain.

## Round 4 · Start again with the project name and a blank page

Three new cooking agents received the same premise. Pud succeeds a test runner for TypeScript developers. Each had to invent four whole products and specify what the developer authors, what runs on the next edit, how it extends and what would kill it. They received no previous concepts or implementation details. The 12 original proposals and a fourth agent’s adversarial revision to **every one** live on Product cards in the workbook.

| Different answer to “what runs?” | Critic’s counterexample | Patch or cut |
| --- | --- | --- |
| Customer journeys, permission to change a release | Preserving the old output everywhere can pass while nobody receives the promised feature. | Require an exact outcome inside a reachable cohort. Check all observed fields outside it. Keep journey replay and universal comparison as distinct evidence. |
| Actor schedules, crash forks, a two-player save | Testing both orders of two complete requests misses a race between reading and committing. A recording can also depend on a friend’s timing. | Give the scheduler explicit control of relevant boundaries and pin isolation. Preserve the human-playable save as a replayable case. Count its engine only once. |
| Per-function propositions, resource-bound approvals | A changed numeric conversion or a copied approval for a different workspace can invalidate the claim. | Pin the source semantics, assumptions and resource. An unsupported boundary stays visible. |
| A transaction receipt, a support incident, downstream subscriber programs | A disconnected billing reader looks like a missing charge. A recorded provider reply can conceal a request to the wrong invoice. A stale subscriber can blame a compatible release. | Establish evidence completeness, match replies to the requested resource, and reproduce consumer cases on both releases. These checks can establish what happened in one observed case. |
| A blind audition or a runner that asks the owner the missing question | Two poor shift plans can both deserve rejection. Adding invitation age can invalidate a policy settled using only plan and seat count. | Allow “both”, “neither” and “missing fact”. Bind decisions to a case or an explicitly approved policy family. Reopen the question when that vocabulary changes. |

The independent critic championed **challenge a green rule**. For each proposed alternative implementation, check every law across the whole declared domain, exhibit a call where the two differ and let the human decide if that difference matters. In the standalone study, a deliberately lopsided splitter passed conservation across all 10,001 totals and both retained even-total examples. A maximum one-cent difference excluded it at 4,999 totals. Run this contender against ordinary property tests with the *same* candidates. It has to earn its extra machinery. [Study](study.ts)

## Round 5 · Pick one alpha and try to break it

A synthesis cook backed a change permit. Another adversarial pass challenged the final mix of permanent rules, paired revisions, the permit and replay. A permit which computes eligibility from the **new implementation’s** idea of a net price can approve its own bug. Fix eligibility to reviewed input semantics. If normalized net cents are the input, say where that input came from and which earlier operation still needs checking.

The critic also pointed out that tax sometimes depends on shipping. For the worked market, tax is independent. In a different market, preserving tax may contradict the intended policy. Report the conflicting business rules and have the owner specify the derived total. Pin the baseline until merge, retire the temporary permit, and retain the desired lasting guarantee as an `always` rule. A third version restoring the fee failed that permanent requirement on all 10,001 eligible carts.

The cook had proposed running old and new versions on a shared deck of typed inputs. The final alpha asks more of a green result. Start with a real closed domain small enough to enumerate. A deck can still reproduce a failure. Reaching the end of a sampled deck cannot turn it into a proof over other inputs. The public release experiment and its adoption gates are in the [alpha brief](README.md).

## Round 6 · What would a proof mean outside a pure function?

Three cooks worked independently on frontend behavior, operational changes and artifacts a team already owns. They produced 30 pitches. A separate critic merged eight variants into shared mechanisms and repaired the evidence claim for each pitch. For instance, a UI marking a draft as saved and a worker acknowledging a queue message both make a promise at a particular instant. Pud could put an interruption on either side of that boundary. An editor-specific adapter would still have to observe the real badge and storage commit.

| First pitch | Counterexample | What to build or measure |
| --- | --- | --- |
| Prove two users’ edits converge. | A whole-record merge can consistently discard work. Three offline edits changed a name, lane and owner. Across all 36 pairs of delivery orders, two readers agreed every time while losing the name and lane every time. A field-wise reducer kept all three in every run. | Report convergence and preservation of each independent edit separately. Conflicting edits to the same field need an owner-approved rule. The study executes two small reducers and makes no claim about a particular collaboration library. [Run it](study-collaboration.ts) |
| Prove support can diagnose a failed import. | A cancellation and a worker failure can both emit the same support-visible transcript. Two random trace IDs may distinguish executions while conveying nothing about the cause. | Give support a decision deadline and visibility budget. Seek a pair of reachable histories with identical observations that require different actions. Try this against operators using the existing runbook. |
| Prove a service can sync every customer on time. | 600 independent reads in ten one-minute buckets at 50 calls per bucket leaves at least 100 unserved. One provider call that can serve two organizations invalidates that arithmetic. | Show the capacity calculation and its premises before writing a scheduler. Count actual distinct calls, bursts, bucket boundaries and deadlines. A capacity upper bound can refute a promise. A generous bound alone cannot establish feasibility. |
| Prove the user can recover from an invalid form. | The error focuses the right-looking field, but the allowed edit cannot change the value the server rejected. | Require a real permitted edit followed by successful resubmission. A Playwright accessibility-tree snapshot already covers much of the visible-state comparison. Pud must earn its place by finding a consequential path a snapshot misses. [Playwright](https://playwright.dev/docs/aria-snapshots) |

The two-author runner should be tried against the team’s own reducer on a held-out edit pair. Automerge documents the relevance of separate-property and same-property changes. The product opportunity is to let a team state the intentions its customers expect and see which of them survived. [Automerge merge behavior](https://automerge.org/docs/reference/documents/conflicts/)

## Round 7 · Which questions can a checker answer before a feature exists?

Two cooks changed the question itself. Across 20 pitches they proposed inverse queries, interface impossibility, the weakest sufficient dependency contract, safe parallel cuts, exact probability and validation of emitted artifacts. The independent critic folded the compiler cache-key pitch into the more general field-erasure idea. The impossible median API and the ambiguous support log share a mechanism, too. Two worlds look identical to the consumer but require different answers.

- **An impossible dashboard.** One shard can contain `[0,1,2]` or `[0,1,9]`. It reports three rows and a median of 1 either way. A second shard reports three rows and a median of 5. The pooled lower median is 2 in the first world and 4 in the second. Any deterministic client seeing only those two summaries must return the same answer. This pair rules out that interface for exact pooled medians. It gives the team a reason to change the wire contract before optimizing the client. [Reproduce both worlds](study-observations.ts)
- **A pricing tier no one should buy.** Across integer usages 0–1,000 the three equally featured plans cost `12u`, `800 + 8u` and `1200 + 3u` cents. The middle plan never wins, although neither rival beats it by itself everywhere. Lowering its fee from 800¢ to 400¢ gives 59 strict wins, from 101 to 159 units. At 100 and 160 the customer is indifferent on price. Keep features, ties and eligible customer ranges visible in the answer. [Reproduce the pricing result](study-observations.ts)
- **A dependency contract the team can afford.** A seat importer may tolerate duplicate or unordered IDs. Let procurement ask which guarantees it actually needs. An impossible supplier contract makes every downstream obligation vacuously true. The repaired check requires a valid delivery in each required customer state, then distinguishes removal of an unnecessary guarantee from a claim about minimum purchase price.
- **A proof for the package customers install.** A route compiler can move a wildcard ahead of a literal even when source-level tests pass. Compare source and emitted dispatch on a declared route language, then run the production dispatchers on the differing path. Package provenance already addresses where an artifact came from. A semantics-preservation claim needs separate evidence about what the artifact does. [npm provenance](https://docs.npmjs.com/generating-provenance-statements/)

## Round 8 · Who gets to run Pud?

A new cook gave ten different people a decision they could make with a proof. A support rep could ask the cheapest question that distinguishes two causes. A copy editor could check whether “Hide from my list” is an honest button label. A floor manager could approve the nearest feasible seating chart. A second agent broke each proposal, and six reused mechanisms already in the workbook.

The seating example exposed a defect in the proposal itself. Its checker counted four occupied seat numbers. A chart with **five people in four seats** still passed because it used all four numbers. The patched rule checks exact roster membership, legal seats and a one-to-one assignment. A real approval also needs to identify which roster revision the manager saw. This is a case where the human knows that Ada should move and the runner can calculate which counteroffers respect that choice.

For a support follow-up, two order rows sharing an ID initially appeared to distinguish a display bug from two actual orders. Two shipments for one order give the same observation. The revised design keeps an unresolved route and counts misrouted tickets as well as questions saved. A proposed question earns a permanent place in the workflow only if it improves decisions on new cases.

## Round 9 · Combine the strongest mechanisms and attack the combination

Editors assembled eleven more pitches from the three rounds. A separate reviewer challenged each recipe after composition. **Decide what the API has to carry** combines evidence that looks identical to a consumer with checks on which input contract suffices. An interface designer can run it before the consumer is written. This is a genuine alternative to the PR change permit, which needs a base and a new revision to compare.

The critic tested a plausible repair to the median example. Adding each shard’s sum distinguishes the original pair. A different pair still has identical counts, medians **and sums**, while requiring pooled lower medians 0 and 2. The patched workflow checks the revised interface against new worlds. Fixing the case on screen proves only that the case on screen was fixed. [Executable example](study-observations.ts)

Three pilot comparisons would change the shortlist. Give an API author an underspecified response and compare time to a justified schema change with ordinary design review. Give support a case where two incidents produce the same visible transcript and measure routing on a fresh incident. Give a collaboration team a reducer that converges while losing an edit and compare time to an accepted intent rule with its property-test suite. These are proposed trials. The numerical studies above were local and finite.

## Round 10 · What can Pud check on the day you install it?

Three cooks started with artifacts a team already owns and proposed 18 first runs. The critic counted 14 as variants of earlier mechanisms. A support attachment can supply the example for a regression test. A published tarball can supply a clean consumer's first import. For the latter, run publint on the same tarball and ask whether actually loading the promised value reveals another failure. [publint CLI](https://publint.dev/docs/cli)

| Four new mechanisms | Smallest useful control |
| --- | --- |
| **B04 · Check HTTP cache reuse.** A French request gets the cached English response despite `Vary: Accept-Language`. | Record distinguishable origin responses and whether the cache revalidated. A cache that always misses can honor the header. |
| **B06 · Check trace ownership.** Two requests overlap. A downstream call for A carries B's trace ID. | Label the requests independently, exercise both completion orders and allow a fresh trace at a documented restart boundary. |
| **J01 · Run the operator's repair audit.** A new signup lands on the list of accounts missing a home workspace. | Wait through the normal initialization period and check the new account's ID against the read-only audit. |
| **J05 · Reintroduce a historical mistake.** Restore a credit-note rounding bug and see whether today's suite catches it. | Reproduce the original customer's wrong total on the modified build, check today's base gives the right total, then run the same suite. |

A migration variant made the first-run question measurable. In SQLite, two workspaces and three slug spellings gave 64 legal predecessor states. A new case-insensitive key failed on 28, including `Plan` and `plan` in one workspace. A global slug key failed on 37. Keeping the old key passed all 64. Empty and single-row fixtures missed both defects. Restricting historical writers to lowercase gave 16 states, zero case-fold failures and seven global-key failures. A team would have to establish that writer assumption. Atlas already flags data-dependent uniqueness changes. Compare the value of Pud's two-row reproduction with that warning and a hand-written fixture. [SQLite study](study-first-run.ts) · [Atlas migration analyzers](https://atlasgo.io/lint/analyzers)

## Round 11 · Can yesterday's repair catch tomorrow's regression?

**Y01 · Turn repairs into release checks** earned a separate product trial. A maintainer starts with the team's existing repair list or rebuild. In a SQLite fixture a 30-minute timesheet moved from A to B. While delivery was pending, the source was at revision 2 and the totals at revision 1. Once both reached revision 2, a missed subtraction left A at 30 minutes against a rebuilt total of zero. A no-op and a correct move introduced no discrepancy. All three runs retained an unrelated 10-minute discrepancy on C. Compare against adding one integration assertion around the same audit, including setup time. The owner still has to confirm which result is authoritative. [SQLite study](study-rebuild.ts)

A reviewer found a blind spot in our first comparison. It only visited projects that already had a stored total. A SQL update on a new project could affect zero rows and still leave the comparison green. The revised check visits project IDs from both sides. Moving the same timesheet to a new project now reports “missing, expected 30 minutes” when the destination row was skipped. The correct insert passes. This fixture explicitly allows an absent total for a project with zero minutes.

**Y02 · Show what this migration forgets** stayed a SQL example of V72, the interface-design product. If paused and archived subscriptions both become inactive and the upgraded table is the only permitted restore input, a downgrade cannot recover both original statuses. A retained audit record could distinguish them. The cheapest control is an up/down test seeded with both statuses. The two SQLite studies used local synthetic fixtures. No maintainer has tried either workflow in these rounds.

## Round 12 · Who gets the next credit?

“Every unit is accounted for” is a perfectly good promise. An implementation that gives everything to the first row kept it on **20,640 calls**. It also paid a zero-weight recipient on 3,150. The interesting question for a human is what each person is owed. Two cooks proposed eight ways to express the answer. A separate critic revised each one. All eight have editable ratings, a concrete authoring sample and an adoption trial on **Rule authoring** in the workbook.

| What the owner authors | What the critic found |
| --- | --- |
| A TypeScript predicate in a sidecar | Both `every` and `reduce` skip sparse array slots. A missing recipient can disappear while the sum still passes. Check one output per enrolled input ID. |
| A choice between two payouts, followed by adoption of a general formula | One choice can fit multiple policies. Offer “either”, “neither” and “defer”. Let the owner save just the example. |
| A SQL query for rows whose payout shrank between calls | An empty earlier table hides every loss. Both runs have to succeed and return a complete set of named payouts. |
| A rule that lets one recipient challenge another for a credit | The donor must hold the disputed credit. A successful challenge should name both people and show the arithmetic. |
| A contract attached to the actual export, with an agent-written Lean proof | A theorem about quota and conservation can allow exactly the opposite tie policy. Pin the approved claim, the meaning of recipient identity, the transitive source and the trusted lowering. |
| A versioned service-credit package and field mapping | A correct allocation against the wrong account column still pays the wrong customer. The team has to own and validate its mapping. |
| A before/after board that pins each existing credit to its owner | Giving every credit to the smallest eligible account ID obeys both growth protection and reorder invariance. Proportionality needs its own decision. |
| Grounds for rejecting a proposed payout before publication | A referee that refuses every payout can satisfy “every released payout is valid.” Test correct releases, incorrect holds and the boundary before payment. |

We ran five actual allocators on three named recipients, integer weights 0–5 with positive sum, and pools of 0–15 credits. The 20,640 calls per method include all six input orders. A quota failure means at least one person gets less than the floor or more than the ceiling of their exact share. The order column counts one group of six calls. The growth column compares adjacent totals at identical weights **and** order. [Executable study](study-allocation.ts)

| Method | Quota failures / 20,640 calls | Order-dependent cases / 3,440 groups | Growth losses / 19,350 transitions |
| --- | ---: | ---: | ---: |
| Largest remainder, stable-ID ties | 0 | 0 | 180 |
| Largest remainder, input-order ties | 0 | 629 | 180 |
| Pay the first row everything | 17,580 | 3,225 | 0 |
| D’Hondt, stable-ID ties | 318 | 0 | 0 |
| Webster, stable-ID ties | 0 | 0 | 0 |

Three cases belong in the review UI:

- **Can a larger pool hurt someone?** At weights `[1,3,5]`, largest remainder pays `[1,1,2]` from four credits and `[0,2,3]` from five. No ties are involved. The 180 stable-ID losses in the study represent 30 distinct weight/total pairs, each exercised in six orders. The worksheet **Split a credit** opens on this case. [Hamilton’s method](https://www.census.gov/about/history/historical-censuses-and-surveys/census-programs-surveys/decennial-census/methods.html)
- **Can a fourth person join?** Webster passes all six checks on the three-person domain. At weights `[3,1,1,1]` and two credits it pays the first person two, although their exact share is one. With `[6,1,1,1]` and three credits the first person gets three against an exact share of two, regardless of tie order. Each case refutes that broader quota claim for Webster. Neither establishes that the requirements themselves conflict.
- **Does the entitlement reset?** For three equal-weight recipients, three independent one-credit pools under stable-ID ties pay `[3,0,0]` in aggregate. One three-credit pool pays `[1,1,1]`. A per-invoice rule and a running customer balance need different inputs even when the owner uses the word “fair” for both.

## Round 13 · What must a human approve when an LLM writes the spec?

The proposed first interaction is a policy diff. The owner enters “split whole credits fairly.” Pud drafts an exact rule and shows its consequences. Here is one possible review:

```text
Pay each account the whole part of its share.
Give leftover credits, one apiece, to the largest remainders.
Equal remainders go to the lower account ID.

At weights 1, 3, 5, A gets 1 of 4 credits and 0 of 5.
With one credit and equal weights, A wins even if B is listed first.

[Adopt this rule]   [Revise]   [Keep these examples only]
```

The cook proposed binding the adopted policy to a source-linked theorem. The first critic noticed that its draft theorem used a map keyed by name while the proposed ballot used **input position** for ties and admitted duplicate names. Each part can be reasonable and their combination is wrong. In the sample above the owner has chosen unique stable account IDs and ID-based ties. Preserve that identity in the input decoder, the policy and the theorem. A generated proof must establish the exact allocation the owner adopted if the UI claims exact agreement. Inline LemmaScript already distinguishes contract prose from formal clauses, and fast-check supplies a direct TypeScript comparison. [LemmaScript specification](https://github.com/midspiral/LemmaScript/blob/main/SPEC.md) · [fast-check properties](https://fast-check.dev/docs/introduction/what-is-property-based-testing/)

A second proposal combines the policy interview with an independent referee **before the payment is committed**. This can check individual payouts produced by an opaque allocator. A third option lets the owner write a challenge between two recipients and uses the same challenge to review a proposed payout. A highest-averages challenge and a largest-remainder referee enforce different policies. They can be combined only after the checker implements the choice the owner made.

We exercised the pre-payment idea in TypeScript. Across 216 inputs the referee examined all 1,636 ways to distribute the credits. Exactly one payout per input passed, and an independent allocator that sorts remainders chose the same one. With weights `Z=2, A=1` and one credit in the pool, giving it to A conserves the total and stays within each person's quota. The referee withheld it because Z has the larger remainder. The range was one to three recipients, weights zero to two with positive sum, and zero to five credits. The runner also exercised a separate bigint case above JavaScript's safe integer range. A production integration must control the only publication path. [Release-gate study](study-release-gate.ts)

There is already an alternative for teams pursuing model-to-runtime agreement. LemmaScript’s crosscheck companion samples an executable model and JavaScript and can return a differing input. Include it alongside fast-check when estimating how much source-linked universal evidence would buy. [LemmaScript crosscheck](https://github.com/midspiral/lemmascript-crosscheck)

**Pilot.** Give six owners the same LLM and the same weighted-split requirement. Compare Pud with a Markdown PR, a small independent TypeScript reference and property tests. Counterbalance order, seed a reversed tie and hold back a pool-growth loss. Measure wrong policies approved, review time, repair time after a harmless source edit and voluntary use for a second rule. For a syntax comparison, give the TS sidecar, SQL query and board exactly the same two-call promise and identity convention. Otherwise a preference for a stronger policy could be misread as a preference for its syntax. These studies establish behavior on the declared examples. Owners have yet to try the interfaces.

## Round 14 · When several answers are correct, what should a green check mean?

Two cooks independently proposed eight checks for outputs that can legitimately vary. A CI sharder can choose which worker runs a test. A translator can move the “amount due” token. A restore can assign new invoice IDs. Finance can read a single export or twelve shards. The team needs to say which observations matter, and where Pud can get independent evidence of them. The workbook records each proposal’s example, alternative test and critic’s revision.

**Try an appointment scheduler.** A can take 09:00, 10:00 or 11:00. B and C can only take 09:00. The business asks to fill as many slots as possible, with one appointment per person and one person per slot. A at 10:00 with B at 09:00 works. A at 11:00 with C at 09:00 also works. A snapshot naming the first schedule would reject the second.

Pud can accept both using a short argument. Every eligible booking uses **either person A or the 09:00 slot**. Those two resources can each be used once. Two bookings are therefore an upper bound, and either proposed schedule attains it. The team supplies its authoritative eligibility data and objective. The scheduling adapter checks the assignments and the upper-bound argument against the same snapshot. A solver can supply both pieces of evidence.

| Evidence available | What the runner can tell the developer |
| --- | --- |
| A at 09:00, plus the two-resource bound | One appointment is filled. The best possible count is between one and two. The one-booking result still needs defending. |
| A valid schedule filling two, alongside a claimed maximum of one | The one-booking claim is false. Replay the larger schedule. This refutation works even when a third booking might be possible. |
| Two filled slots plus an independently valid two-resource bound | This schedule fills the most slots possible on the supplied eligibility data. Other equally full schedules are welcome. |
| An assignment somebody is ineligible for, or a bound that omits a new eligible booking | Identify which witness fails against this revision. An invalid bound alone says nothing about whether the offer was optimal. |

On all 512 three-person, three-slot eligibility graphs, **298 had multiple best schedules**. Across 1,114,112 combinations of candidate schedule and proposed bound, every accepted optimality claim agreed with brute force. The reasoning about the upper bound applies at any finite size under the one-per-person and one-per-slot premises. The executable comparison covered the stated three-by-three domain. Two certified two-booking schedules earned **$220 and $70**. A team that means “most revenue” needs a different objective. [Run the study](study-matching.ts)

An ordinary maximum-matching library run on the same frozen graph is a strong baseline. NetworkX can already return a minimum vertex cover given a maximum matching. OR-Tools reports whether its solver found a feasible solution or established optimality. Pud would have to earn its place by checking a team's actual output and eligibility source cheaply and showing the exact changed booking on a bad PR. [NetworkX](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.bipartite.matching.to_vertex_cover.html) · [OR-Tools](https://developers.google.com/optimization/cp/cp_solver)

## Round 15 · Could the ballot actually overturn the favorite?

A critic inspected the saved ballot. The five ratings I gave **Declare the allowed change** were 5, 4, 5, 5 and 5. Every one of the other 23 products in that edition received an equal or lower rating on each criterion. Giving more weight to surprise, evidence or first use could produce a tie. None could earn a strictly higher weighted score. My earlier sensitivity comparison made the result look more independently supported than it was.

The six-point lead over **Decide what the API has to carry** comes entirely from repeat use. The two products have the same four other ratings. Under the default weights, lowering the favorite’s repeat-use rating from 5 to 4 ties the displayed scores at 90. Lowering it to 3 puts the API product ahead, 90 to 84. On **Challenge the ballot**, the blue cells let a reviewer change that judgment locally, compare two products, and see every rival that could get ahead by changing priorities alone. Cost and eligibility for the starter budget are separate from this score.

The audit found that **Challenge a green rule**, the critic's preferred rival, had a priced mix and no whole-product vote. Z01 now puts it on the same ballot. An independent reviewer rated it 64/100 and priced its existing recipe at 21 points. It can establish that two implementations obey the same rules on the admitted inputs while producing different payouts. A direct loop over the same ordered inputs and the same candidates proves that too. Use a shared candidate pair to check correctness, then let each tool discover alternatives independently from the same PR brief at equal total engineer and owner time. The proposed gate is at least two more distinct owner-confirmed policy decisions from Pud across ten real PRs. Record the decision before revealing which tool found it. An owner can explicitly allow both outcomes for a class of cases. Allowing both on one example leaves the general rule open.

The updated ballot scores 26 pitches, several of which share an approach. Across all 1,001 ways to distribute ten equal weight units among the five criteria, the change permit leads alone 660 times and ties for first 341 times. Among the 13 intact starters affordable at 22 points it leads alone 705 times and ties 296 times. Equal scores count as ties even when the workbook orders them by ID. All 126 grid points giving every criterion some weight select it outright. These figures describe the editorial ratings and this grid. With one-decimal display rounding, sufficiently small positive weights can still lead to displayed ties. The new scheduling starter costs 13 points, including the five shared with every starter. At capacities of 13–15 it is the only affordable experiment.

**What would settle repeat use?** Enroll teams before choosing the PRs. Give each the same observation window and identify eligible work from the original requests, independently of whether anyone ran Pud. Record natural second uses over all enrolled teams, the number with a second eligible opportunity and why setup failed. A tool can do well among the developers who run it twice and still have almost no role in a team's actual week. The [alpha brief](README.md) sets the comparative decision rule and the inconclusive outcome.
