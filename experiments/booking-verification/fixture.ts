import type { PGlite } from "@electric-sql/pglite";

export const startMinute = 1_000_000n;

export async function seedWorkshop(db: PGlite) {
  await db.exec(`
    TRUNCATE bookings, workshops, accounts;
    INSERT INTO accounts (id, balance, member) VALUES ('alice', 3000, true), ('bob', 150, false);
  `);
  await db.query(
    "INSERT INTO workshops (id, available, seat_price, starts_minute) VALUES ('printmaking', 8, 111, $1)",
    [startMinute.toString()],
  );
}

export async function readState(db: PGlite, accountId: string) {
  const { rows: [state] } = await db.query<{ balance: string; available: string; bookings: number }>(
    `SELECT a.balance::text, w.available::text, (SELECT count(*)::int FROM bookings) AS bookings
     FROM accounts a CROSS JOIN workshops w WHERE a.id = $1 AND w.id = 'printmaking'`,
    [accountId],
  );
  return state;
}
