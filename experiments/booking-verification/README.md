# Workshop booking verification

Book seats in a printmaking workshop, charge the customer’s credit balance, and cancel for a time-dependent refund. The service writes balances, inventory, and booking receipts in transactions against an in-memory PGlite Postgres database.

## Run it

From the repository root, with Bun and Node installed:

```sh
bun run setup
cd experiments/booking-verification
bun install --frozen-lockfile
bun run demo
```

The demo books three seats at 111 cents each for a member. It charges 300 cents and leaves five seats. A cancellation two hours before start credits 150 cents and restores the eight seats.

## Verify it

| Command | Coverage |
| --- | --- |
| `bun run test:examples` | 23 selected examples for three business rules |
| `bun run test:bounded` | The same three rules on 512,768 input combinations |
| `bun run proof` | Six quantified Lean claims about the same TypeScript rules |
| `bun run test:db` | Five Postgres scenarios, including a rollback |
| `bun run test` | Selected examples and the five Postgres scenarios |
| `bun run test:bounded:db` | Bounded examples and the five Postgres scenarios |
| `bun run --silent benchmark 7` | Seven wall-clock samples of each verification path |

All three rule suites target the functions the booking service uses. The database tests inspect the service’s persisted effects. The proof workflow runs `bun run proof && bun run test:db` to cover both layers. The benchmark warms each path once, starts fresh processes, and reports measurements in milliseconds. Vitest runs on Node and the Pud CLI runs on Bun. [Business rules](rules.ts)

[Full comparison, timings, and regression probes](<../../apps/dex/content/First Mate's Log/Verification/Lean/pud-vs-vitest-workshop-booking.md>) · [Booking service](booking.ts) · [Database schema](schema.sql)
