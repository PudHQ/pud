---
author: codex
date: 2026-11-25
summary: A proposal for one Pud suite API and CLI that can check laws about pure functions, database transactions, and HTTP routes.
tags: [verification, proof-suites, integration, postgres, codex]
---
# Pud proof suites from unit to end-to-end

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

Keep one `pud check` command and one `describe` / `it` / `expect` API. Let the developer choose how much of the app to verify by choosing its entry point and, when needed, a fixture. Jest is a useful precedent for one command across suites with different environments. Pud’s job is to establish a law across the admitted inputs, states, and execution histories of each suite. [Jest projects and environments](https://jestjs.io/docs/configuration#projects-arraystring--projectconfig)

## What this adds

| Scope | What the developer points Pud at | What the law can observe |
| --- | --- | --- |
| Unit | A TypeScript function such as `cancellationCredit`. | Its modeled return or exception. |
| Integration | The actual `cancel` handler with a booking database fixture. | The returned refund, committed balance and inventory, stored refund, rollback, and retries. |
| End-to-end | The actual `postDebit` export with a request and database fixture. | The request’s path through validation and the handler, its HTTP response, and committed state. |

The unit law still pays for itself. It finds a rounding error in the policy in isolation. The integration law can find a missing write even when the credit is correct. The route law can catch an invalid amount being accepted before the transaction even sees it. Each law names the part of the application whose behavior it covers. [Current refund sidecar](https://github.com/PudHQ/pud/blob/main/experiments/booking-verification/.proofs/cancellation-credit.proof.ts) · [Booking transaction](https://github.com/PudHQ/pud/blob/main/experiments/booking-verification/booking.ts) · [Debit HTTP route](https://github.com/PudHQ/pud/blob/main/experiments/debit-endpoint/route.ts)

## What the suites look like

The unit syntax works today. `cancellationCredit` is a real export, and its three existing rules pass in the Pud CLI.

```ts
describe(cancellationCredit, () => {
  it("returns the whole payment at least a day before start", {
    paid: pud.bigint().gte(0n),
    minutesUntilStart: pud.bigint().gte(1440n),
  }, ({ paid, minutesUntilStart }) => {
    expect(cancellationCredit(paid, minutesUntilStart)).to(pud.bigint().eq(paid));
  });
});
```

For a transaction, the proposed `describe` overload adds a fixture and supplies `run` alongside `it` and `expect`. The fixture binds the actual handler’s database and clock dependencies. The law can read several fields of the same history.

```ts
describe(cancel, { fixture: bookingCancellation }, ({ it, expect, run }) => {
  it("credits the customer exactly once across retries", {
    before: paidAndUncancelled,
    attempts: retriesWithHealthyAttempt,
  }, ({ before, attempts }) => {
    const history = run({ before, attempts });
    const credit = expectedRefund(before, attempts);

    expect(history.committedCredits).toEqual([credit]);
    expect(history.after.customerBalance).toEqual(before.customerBalance + credit);
    expect(history.after.bookingRefund).toEqual(credit);
  });

  it("preserves the booking when every attempt aborts", {
    before: paidAndUncancelled,
    attempts: abortingRetries,
  }, ({ before, attempts }) => {
    const history = run({ before, attempts });
    expect(history.after).toEqual(history.before);
    expect(history.committedCredits).toEqual([]);
  });
});
```

`paidAndUncancelled` describes the set of starting states. `retriesWithHealthyAttempt` describes a schedule with at least one attempt where the environment permits success. The rule then requires a credit in the resulting history, so an implementation that always aborts fails it. The separate rollback law covers schedules where all attempts are forced to abort. The expected refund comes from the policy and the scheduled clock values. The history counts actual modeled committed credits for the booking. [[First Mate's Log/Verification/runtime-checks-and-effect-proofs#A checked cancellation model|Checked Lean model and its scope]]

An HTTP suite would use the same overload. Here the fixture supplies authenticated context, a raw request, and the initial database. The route still has to parse the request itself.

```ts
describe(postDebit, { fixture: debitHttp }, ({ it, expect, run }) => {
  it("rejects an out-of-range amount and preserves the ledger", {
    before: debitLedger,
    request: outOfRangeDebitRequest,
  }, ({ before, request }) => {
    const history = run({ before, request });
    expect(history.response.status).toEqual(400);
    expect(history.after).toEqual(history.before);
  });
});
```

The HTTP example covers the boundary from `Request` to `Response` and committed rows. The existing debit route receives authenticated tenant context from its caller. A suite that starts before authentication or at a real client connection would need to include those steps and their environment. A second route law could send the same valid request twice and check the `applied` and `duplicate` response bodies alongside a single debit. [Debit route and current HTTP tests](https://github.com/PudHQ/pud/tree/main/experiments/debit-endpoint)

## What developers configure

The nearest `pud.config.ts` still chooses the proof assistant. An effectful suite names a typed fixture. That fixture declares its starting state, how to call the entry point, the environment it needs, and what the suite can observe. Reusable adapter support supplies the semantics of the database operations under that environment. Projects can use directories to select a particular scope with the existing `pud check <dir>` command. [[First Mate's Log/Verification/workflow-proof-interfaces#Fixtures-and-environments|Fixture and environment interfaces]]

An ordinary proof run reasons over the declared domain. An optional runtime run can use concrete examples from that domain to check the real implementation and compare it with an executable model. The distinction matters when the runtime exposes a mismatch or the adapter cannot model an operation. The report should name what ran and show the evidence for each result. [[Handbook/Engineering/reading-a-proof-result|Current verdicts]] · [[First Mate's Log/Verification/workflow-proof-interfaces#Results-and-compatibility|Proposed reporting]]

## What would make the first slice real

Use the actual booking handler and migration in a cancellation suite. Lower the locked read, three writes, and transaction outcomes into Lean. A probe translated the writes from the TypeScript and checked the same law in Lean. The original and reordered writes passed. Deleting either the credit or the stored refund broke the proof and changed the runtime database state. The release milestone is to get those results through `pud check` with the same sidecar and a linked handler, migration, and transaction model. [[First Mate's Log/Verification/runtime-checks-and-effect-proofs#Deriving the writes from TypeScript|Source write probe]] · [[First Mate's Log/Verification/workflow-proof-interfaces#Implementation-order|Implementation order]]
