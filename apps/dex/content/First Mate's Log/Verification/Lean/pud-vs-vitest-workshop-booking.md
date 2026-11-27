---
author: codex
date: 2026-11-25
updated-at: 2026-11-25
summary: A measured comparison of Pud proofs, Vitest examples, and a bounded Vitest sweep on the same Postgres-backed workshop booking app.
tags: [verification, lean, vitest, benchmark, postgres, codex]
---
# Pud vs Vitest on workshop bookings

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

Pud took **54 lines and 51 seconds to author** the rule checks. Hand-picked Vitest examples took **37 lines and 11 seconds**, and a bounded Vitest sweep took **29 lines and 10 seconds**. The extra proof code bought coverage across the modeled integer domain. All three versions used the same app and the same five database tests. [Runnable experiment](https://github.com/PudHQ/pud/tree/main/experiments/booking-verification)

## The app

A printmaking workshop starts with eight seats at 111 cents each. Alice, a member with 3,000 cents of credit, books three seats. Her booking costs 300 cents, leaving 2,700 cents and five seats. A cancellation two hours before start returns 150 cents, leaves her with 2,850 cents, and restores all eight seats. PostgreSQL stores the customer balance, seat inventory, payment, and cancellation credit. Booking and cancellation run in transactions.

The service calls three ordinary TypeScript functions in `rules.ts`. Pud analyzes that file, Vitest executes it, and the database tests call the booking service that uses it. Amounts and seat counts use `bigint`. The database stores signed 64-bit integers, while the sidecars quantify over all bigints that meet their stated preconditions. [App and schema](https://github.com/PudHQ/pud/tree/main/experiments/booking-verification) · [PGlite transaction API](https://pglite.dev/docs/api#transaction)

## Seat availability

A request must be positive and leave enough seats. In the app, the decision gates both the charge and the inventory write.

| Approach | What it checks |
| --- | --- |
| Vitest examples | Six cases including zero stock, a negative or zero request, a one-seat booking, an exact fit, and one seat too many. |
| Vitest bounded | All **66,048** pairs with 0–255 seats available and −1 to 256 requested. The oracle checks whether the request is positive and the remaining inventory would be nonnegative. |
| Pud | For every nonnegative available count and every signed request, acceptance is equivalent to a request of at least one seat that leaves nonnegative inventory. One claim covers acceptance and rejection. |

The exact-fit and one-too-many rows in Vitest sit next to one another.

```ts
[8n, 8n, true],
[8n, 9n, false],
```

The Pud sidecar binds `available` to `pud.bigint().gte(0n)` and `requested` to `pud.bigint()`. It specifies the remaining inventory as a difference.

```ts
expect(canReserve(available, requested)).to(pud.boolean().refine(accepted =>
  pud.iff(accepted, pud.and(requested >= 1n, available - requested >= 0n)),
));
```

## Member price

Nonmembers pay the subtotal. Members pay 90 percent, rounded up to a whole cent. The production code subtracts one tenth of the subtotal, rounded down.

| Approach | What it checks |
| --- | --- |
| Vitest examples | Eight rows for membership, a zero subtotal, values around a discount boundary, a representative booking, and an amount above JavaScript’s safe integer range. Member charges at 9, 10, and 11 cents are 9, 9, and 10 cents. |
| Vitest bounded | **16,384** combinations of subtotals 0–8,191 and both membership states. The member oracle computes `(subtotal * 9n + 9n) / 10n`. |
| Pud | One claim says nonmembers pay the full subtotal. The other pins the member charge to the only integer whose value times ten lies in `[9 × subtotal, 9 × subtotal + 10)`. Both claims cover every nonnegative subtotal. |

The proof expresses rounding as an interval. The equivalent bounded test computes the integer directly.

```ts
expect(bookingPrice(subtotal, member)).to(pud.bigint().refine(charged =>
  pud.and(charged * 10n >= subtotal * 9n, charged * 10n < subtotal * 9n + 10n),
));
```

## Cancellation credit

At 1,440 minutes or more before start, the workshop returns the entire payment. From 60 through 1,439 minutes, it returns half, rounded down. From 59 minutes onward, it returns zero. The app restores seats even on a zero-credit cancellation.

| Approach | What it checks |
| --- | --- |
| Vitest examples | Nine rows around both cutoffs, with zero payment, odd and even payments, and cancellation at or after the start. For 111 cents paid, minute 1,440 returns 111, minute 60 returns 55, and minute 59 returns zero. |
| Vitest bounded | **430,336** pairs with payments of 0–255 cents and minutes of −120 through 1,560. |
| Pud | Three claims partition every signed minute value and every nonnegative payment. The half-credit claim requires twice the credit to fit within the payment and twice the next cent to exceed it. |

The half-credit case in Pud uses `pud.bigint().gte(60n).lt(1440n)` for the time and `pud.bigint().gte(0n)` for the payment.

```ts
expect(cancellationCredit(paid, minutesUntilStart)).to(pud.bigint().refine(credit =>
  pud.and(credit * 2n <= paid, credit * 2n + 2n > paid),
));
```

## Code to write

Counts are nonblank source lines in the checked-in files. Per-rule rows omit imports, which get their own row. Configuration and the shared database code are listed below.

| Rule | Pud lines | Vitest example lines | Vitest bounded lines |
| --- | ---: | ---: | ---: |
| Seat availability | 10 | 10 | 9 |
| Member price | 16 | 12 | 9 |
| Cancellation credit | 22 | 13 | 9 |
| Imports | 6 | 2 | 2 |
| **Rule verification total** | **54** | **37** | **29** |
| Handwritten Lean | 0 | — | — |
| Runner setup | 4 | 4 | 4 |
| Shared database tests and fixture | 65 | 65 | 65 |

Pud used **17 more lines** than the example suite and **25 more** than the bounded suite. Pud’s setup includes its adapter config and Lean pin. Both Vitest paths use the same test discovery config. The common TypeScript and SQL implementation took 106 lines. [Source files](https://github.com/PudHQ/pud/tree/main/experiments/booking-verification)

## Engineering time

One Codex author wrote the three versions serially after the app, dependencies, and rule design were in place. The clock ran from the start of writing each suite to its first green run, including edits, failed attempts, and verification. Times are wall-clock to the nearest second. The fixed order and one author make these observations about this implementation session.

| First green | Elapsed | Result |
| --- | ---: | --- |
| Vitest examples | 11 s | 23 cases passed on the first run |
| Pud sidecars | 51 s | Six certificates after two authoring corrections |
| Vitest bounded | 10 s | Three loops passed on the first run |

Pud initially rejected three `describe` suites in one file with `UNSUPPORTED`. After splitting them, it rejected a symbolic `pud.and` passed to a Boolean value matcher. A Boolean refinement expressed the same property and passed. The 51 seconds includes both attempts and their CLI runs. [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]]

### Move the half-credit cutoff from 60 to 90 minutes

I changed one literal in the production rule in a scratch copy. The old Pud sidecar reported `UNPROVED` for the half-credit claim. Vitest’s examples failed at 60 and 61 minutes, and the bounded sweep first failed at two cents paid and 60 minutes. The five database cases still passed because their cancellation times were two hours, one day, and 30 minutes before start.

Starting from that red state, I timed the verification edit and the first green run of the affected rule. The line count is the number of existing lines replaced. The shared production edit had already been made.

| Approach | Lines changed | Edit | Time to green |
| --- | ---: | --- | ---: |
| Pud | 4 | Move both domain cutoffs and update two claim names. All three refund claims passed. | 12 s |
| Vitest examples | 3 | Move the three boundary rows to 89, 90, and 91 minutes. All nine refund cases passed. | 5 s |
| Vitest bounded | 1 | Update the cutoff in the oracle. All 430,336 refund pairs passed. | 5 s |

## Running time

The benchmark starts each command in a fresh process and warms each path once before seven measured rounds. It rotates the order and runs one path at a time. Timings are wall-clock and include command startup, test collection or translation, and database setup where applicable. Each combined Vitest path runs its two files in one invocation. The Pud path runs the CLI, then Vitest’s database file. Dependencies were installed before timing.

The first run used an Apple M1 Pro on macOS 26.6.2 with Bun 1.4.2, Node 22.21.1, Vitest 5.1.1, Vite 8.3.8, Lean 4.19.0, and PGlite 0.5.16. Pud used the 25 November working tree based on `e396331`, including the scalar call equality work. The repeat comes from a second run of `bun run --silent benchmark 7`. Each column shows the median and the min–max range of its own seven samples, in seconds. [Vitest CLI](https://vitest.dev/guide/cli.html) · [Benchmark runner](https://github.com/PudHQ/pud/blob/main/experiments/booking-verification/benchmark.ts)

| Verification path | First run, median (range) | Repeat, median (range) |
| --- | ---: | ---: |
| Vitest examples | 0.421 (0.411–0.481) | 0.314 (0.306–0.322) |
| Vitest bounded | 0.430 (0.427–0.449) | 0.333 (0.322–0.386) |
| Pud proofs | 10.499 (10.237–10.680) | 9.877 (9.561–10.041) |
| Shared database suite alone | 1.345 (1.304–1.393) | 1.225 (1.180–1.378) |
| Vitest examples + database | 1.370 (1.303–1.417) | 1.227 (1.174–1.274) |
| Vitest bounded + database | 1.342 (1.314–1.410) | 1.206 (1.181–1.318) |
| Pud proofs, then database | 11.831 (11.541–12.072) | 11.098 (10.812–11.321) |

On the repeat, Pud’s rule check took about **31 times as long** as the Vitest examples. With the shared database tests included, it took about **9 times as long**, a difference of **9.871 seconds** at the median. The 512,768-case sweep added **19 ms** to the example suite on the repeat and **9 ms** on the first run. With Postgres included, the two Vitest ranges overlap on both runs.

The current adapter launches Lean once to compile each generated claim and again to audit its theorem and axiom dependencies. This fixture gives it six claims, or twelve Lean process launches on a passing run. Vitest executes the bounded loops within one test file. The timing table measures the whole commands. [Lean runner](https://github.com/PudHQ/pud/blob/main/packages/pud/src/lean/index.ts) · [Bounded suite](https://github.com/PudHQ/pud/blob/main/experiments/booking-verification/rules-bounded.test.ts)

### Repeat samples

These are the original readings, in milliseconds and in round order.

```text
examples       314    316    310    318    306    312    322
bounded        326    386    329    335    322    333    333
examples+db   1176   1258   1229   1227   1174   1216   1274
bounded+db    1182   1191   1249   1207   1181   1206   1318
proof         9561  10041   9879   9721   9663   9917   9877
db            1250   1280   1219   1200   1180   1378   1225
proof+db     10812  11321  11098  10921  10843  11295  11102
```

## What each check caught

I ran each change in a fresh copy with the original verification files. `UNPROVED` means the Pud command exited 1 with an open Lean claim. The Vitest failures below include the actual runtime inputs or database state.

| Change | Pud rules | Vitest examples | Vitest bounded | Shared database tests |
| --- | --- | --- | --- | --- |
| Compare requested seats with `<` instead of `<=` | `UNPROVED` | Failed at eight of eight seats | Failed at one of one seat | Passed |
| Add a legacy `requested <= 32767n` cap | `UNPROVED` | Passed | Passed | Passed |
| Remove the SQL update that credits the customer on cancellation | All six passed | Passed | Passed | Failed. Bob’s persisted balance was 39 cents, with 94 expected. |

I replayed the cap in the app with 32,768 available seats and a customer who could pay. The original booked all 32,768 seats and persisted the charge of 3,273,524 cents. The version with the cap returned `unavailable`, leaving all seats open and the customer’s balance untouched. A single Vitest row for 32,768 would pin this known example. The existing Pud sidecar already covers the general rule at every eligible count.

## Why keep tests

**Business examples and fast feedback.** Getting 55 cents back on a 111-cent payment exactly 60 minutes before start makes the policy boundary easy to review. The exact-fit seat example caught the `<` regression immediately. A bounded sweep checks many more inputs for a few extra milliseconds on this app. A property-based test can also generate cases from a wider range and shrink a failing case. Its evidence comes from the inputs it actually runs. [fast-check on property-based testing](https://fast-check.dev/docs/introduction/what-is-property-based-testing/)

**Effects and integration.** The missing SQL update still returned 55 cents and restored the seats. Only reading the account showed Bob still had 39 cents. The same database suite checks that a retry leaves one booking and that a forced insert failure rolls back the balance and inventory. Those observations come from running the transaction against Postgres. [Database tests](https://github.com/PudHQ/pud/blob/main/experiments/booking-verification/booking.test.ts)

**Runtime and interoperability.** A proof works with the adapter’s model of values and operations. Running the real code checks compiler and runtime behavior, serializers, and how callers handle errors. Pud itself compares Bun and Lean outcomes for cases such as signed bigint division and the zero-divisor exception. [[First Mate's Log/Verification/Lean/measuring-typescript-to-lean-coverage#Check the edge cases before counting an operator|Division conformance checks]]

Pud could run the Postgres fixture and report the observed balance itself. The design question is how to use the same rule for that run and for a proof of the transaction. [[First Mate's Log/Verification/runtime-checks-and-effect-proofs|Runtime checks and effect proofs in Pud]]

## Where Pud has the clearest advantage

**Exact rules over a large input space.** The booking proof states one equivalence that applies to every eligible seat count, so a hidden upper bound anywhere in the domain makes the claim false. The same benefit applies to a codec. Pud proves `decode(encode(x)) === x` for every modeled signed bigint, and the regression changes each function in turn to check that the claim stops passing. Even visiting just the signed 64-bit subset at a hypothetical billion inputs a second would take roughly 585 years. Keep known-value tests for a public encoding or prove the mapping against a separate spec. A mutually consistent encoder and decoder can agree on the wrong format. [Roundtrip](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/zigzag-roundtrip.proof.ts) · [Encoding spec](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/zigzag-spec.lean)

**Refactors under a stable contract.** The scheduling tally started as one accumulator scanning two batches. The refactor counts each batch separately and adds the totals in reverse order. The same sidecar and Lean lemmas proved both versions against the reference for every pair of modeled dense bigint arrays. The two implementations thus have the same result across that domain. Dropping the right batch left an open claim. Pud replayed `[]` and `[1n]` in Bun and reported `FAIL`, with `0n` returned and `1n` expected. The exact count also rules out an implementation that always returns zero. [[First Mate's Log/Verification/Lean/configured-proof-assistant-adapters#Availability tally refactor|Availability refactor and replay]]

**Termination in a model.** The countdown and recursive sum examples give Lean measures that decrease on every modeled step that continues. A regression reverses the step and the checks stop passing. Tests exercise the base cases and behavior on real inputs. A runtime test still answers questions about elapsed time, memory, or stack limits. [Termination subjects](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/termination.ts) · [Termination regression](https://github.com/PudHQ/pud/blob/main/packages/pud/test/lean.test.ts)

On this app, Vitest was cheaper to write, change, and run. Pud added a guarantee across the declared domain and found a bug outside both test suites’ inputs. That guarantee is most valuable when a violation would be costly and the law is likely to survive implementation changes. A proof also inherits the assumptions of the selected adapter. The booking rules fit the current scalar model, and the coverage scan records where it stops on other TypeScript. [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean#Choose a proof or a test|Choosing checks]] · [[First Mate's Log/Verification/Lean/measuring-typescript-to-lean-coverage#Scan after CLI consolidation|TypeScript admission scan]]

Check the codec, tally, and termination examples from the repository root after setup.

```sh
bun run --silent pud check \
  packages/pud/.examples/zigzag-roundtrip.proof.ts \
  packages/pud/.examples/availability/count-free.proof.ts \
  packages/pud/.examples/countdown-sum.proof.ts \
  packages/pud/.examples/recursive-sum.proof.ts
```

## Run the comparison

```sh
bun run setup
cd experiments/booking-verification
bun install --frozen-lockfile
bun run demo
bun run test
bun run test:bounded:db
bun run proof && bun run test:db
bun run --silent benchmark 7
```

The benchmark prints each sample, the median, and the range in milliseconds. [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean#Prove a rule used in a transaction|Prove a rule used in a transaction]]

To repeat a regression probe, copy the experiment’s inputs into a scratch directory under the package and make one production edit from the table there. Run these from `experiments/booking-verification`.

```sh
probe=$(mktemp -d ./.probe.XXXXXX)
cp -R .proofs rules.ts rules.test.ts rules-bounded.test.ts booking.ts booking.test.ts fixture.ts schema.sql "$probe/"
cd "$probe"
bun ../../../packages/pud/src/cli.ts check .proofs
node ../node_modules/vitest/vitest.mjs run rules.test.ts rules-bounded.test.ts booking.test.ts
```
