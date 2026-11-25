import { expect, test } from "bun:test";
import { debit } from "../handler.ts";
import { lower } from "../internal/lower.ts";
import { replayDebit, type ReplayWitness } from "../replay.ts";
import { checkHttpRoute } from "./http.ts";

test("HTTP routing and input validation run through PostgreSQL", checkHttpRoute, 20_000);

test("replay observes committed balances and receipts after each request", async () => {
  const schema = await Bun.file(new URL("../schema.sql", import.meta.url)).text();
  const source = await Bun.file(new URL("../handler.ts", import.meta.url)).text();
  const samples: ReplayWitness[] = [];
  const report = await replayDebit(debit, schema, sample => {
    samples.push(sample);
    return false;
  }, lower(source, schema).queries);
  expect(report.checks).toHaveLength(6);
  expect(samples.map(sample => sample.observed.status)).toEqual([
    "applied", "duplicate", "applied", "declined", "applied", "declined",
  ]);
  expect(samples[0]?.observed.balances).toEqual({
    "acme/primary": "70", "acme/reserve": "40", "birch/primary": "100", "birch/savings": "100",
  });
  expect(samples[1]?.observed.balances).toEqual(samples[1]?.before.balances);
  expect(samples[3]?.observed.receipts).toEqual(samples[3]?.before.receipts);
  expect(samples[4]?.observed.receipts).toContain("acme/order-2");
  expect(samples.every(sample => !sample.observed.transactionIssue && !sample.observed.threw)).toBe(true);
}, 20_000);
