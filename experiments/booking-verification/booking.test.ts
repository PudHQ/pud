import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { book, cancel, openBookingDatabase } from "./booking.ts";
import { readState, seedWorkshop, startMinute } from "./fixture.ts";

let db: PGlite;
const request = { id: "b-101", accountId: "alice", workshopId: "printmaking", seats: 3n };

beforeAll(async () => { db = await openBookingDatabase(); });
beforeEach(async () => { await seedWorkshop(db); });
afterAll(async () => { await db?.close(); });

test("books three seats at the member price and makes an identical retry free", async () => {
  expect(await book(db, request)).toEqual({ kind: "booked", paid: 300n });
  expect(await book(db, request)).toEqual({ kind: "booked", paid: 300n });
  expect(await readState(db, "alice")).toEqual({ balance: "2700", available: "5", bookings: 1 });
  const { rows } = await db.query("SELECT seats::text, paid::text, refund::text FROM bookings");
  expect(rows).toEqual([{ seats: "3", paid: "300", refund: null }]);
});

test("declines unavailable seats and insufficient funds without changing the database", async () => {
  expect(await book(db, { ...request, seats: 9n })).toEqual({ kind: "unavailable" });
  expect(await book(db, { ...request, accountId: "bob", seats: 2n })).toEqual({ kind: "insufficient-funds" });
  expect(await readState(db, "alice")).toEqual({ balance: "3000", available: "8", bookings: 0 });
  expect(await readState(db, "bob")).toEqual({ balance: "150", available: "8", bookings: 0 });
});

test("credits half the paid amount, restores inventory and persists the first refund", async () => {
  expect(await book(db, { ...request, accountId: "bob", seats: 1n })).toEqual({ kind: "booked", paid: 111n });
  expect(await cancel(db, request.id, startMinute - 120n)).toBe(55n);
  expect(await cancel(db, request.id, startMinute - 1440n)).toBe(55n);
  expect(await readState(db, "bob")).toEqual({ balance: "94", available: "8", bookings: 1 });
  const { rows } = await db.query("SELECT refund::text FROM bookings WHERE id = $1", [request.id]);
  expect(rows).toEqual([{ refund: "55" }]);
});

test("persists a zero credit and releases seats on a late cancellation", async () => {
  await book(db, request);
  expect(await cancel(db, request.id, startMinute - 30n)).toBe(0n);
  expect(await cancel(db, request.id, startMinute - 1440n)).toBe(0n);
  expect(await readState(db, "alice")).toEqual({ balance: "2700", available: "8", bookings: 1 });
});

test("rolls back balance and inventory if writing the booking fails", async () => {
  await db.exec("ALTER TABLE bookings ADD CONSTRAINT blocked_booking CHECK (id <> 'blocked')");
  try {
    await expect(book(db, { ...request, id: "blocked" })).rejects.toThrow("blocked_booking");
    expect(await readState(db, "alice")).toEqual({ balance: "3000", available: "8", bookings: 0 });
  } finally {
    await db.exec("ALTER TABLE bookings DROP CONSTRAINT blocked_booking");
  }
});
