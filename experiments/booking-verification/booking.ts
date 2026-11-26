import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { bookingPrice, cancellationCredit, canReserve } from "./rules.ts";

interface Request {
  id: string;
  accountId: string;
  workshopId: string;
  seats: bigint;
}

type BookingResult = { kind: "booked"; paid: bigint } | { kind: "unavailable" | "insufficient-funds" };

interface BookingRow {
  account_id: string;
  workshop_id: string;
  seats: string;
  paid: string;
  refund: string | null;
}

export async function openBookingDatabase() {
  const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  const db = await PGlite.create();
  try {
    await db.exec(schema);
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

export async function book(db: PGlite, request: Request): Promise<BookingResult> {
  return db.transaction(async tx => {
    const { id, accountId, workshopId, seats } = request;
    const { rows: [account] } = await tx.query<{ balance: string; member: boolean }>(
      "SELECT balance::text, member FROM accounts WHERE id = $1 FOR UPDATE", [accountId],
    );
    const { rows: [workshop] } = await tx.query<{ available: string; seat_price: string }>(
      "SELECT available::text, seat_price::text FROM workshops WHERE id = $1 FOR UPDATE", [workshopId],
    );
    if (!account || !workshop) throw new Error("Unknown account or workshop");

    const { rows: [prior] } = await tx.query<Omit<BookingRow, "refund">>(
      "SELECT account_id, workshop_id, seats::text, paid::text FROM bookings WHERE id = $1", [id],
    );
    if (prior) {
      if (prior.account_id !== accountId || prior.workshop_id !== workshopId || BigInt(prior.seats) !== seats) {
        throw new Error("Booking ID already belongs to a different request");
      }
      return { kind: "booked", paid: BigInt(prior.paid) };
    }

    if (!canReserve(BigInt(workshop.available), seats)) return { kind: "unavailable" };
    const paid = bookingPrice(seats * BigInt(workshop.seat_price), account.member);
    if (paid > BigInt(account.balance)) return { kind: "insufficient-funds" };

    await tx.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [paid.toString(), accountId]);
    await tx.query("UPDATE workshops SET available = available - $1 WHERE id = $2", [seats.toString(), workshopId]);
    await tx.query(
      "INSERT INTO bookings (id, account_id, workshop_id, seats, paid) VALUES ($1, $2, $3, $4, $5)",
      [id, accountId, workshopId, seats.toString(), paid.toString()],
    );
    return { kind: "booked", paid };
  });
}

export async function cancel(db: PGlite, bookingId: string, nowMinute: bigint) {
  return db.transaction(async tx => {
    const { rows: [booking] } = await tx.query<BookingRow & { starts_minute: string }>(
      `SELECT b.account_id, b.workshop_id, b.seats::text, b.paid::text, b.refund::text, w.starts_minute::text
       FROM bookings b JOIN workshops w ON w.id = b.workshop_id WHERE b.id = $1 FOR UPDATE OF b`,
      [bookingId],
    );
    if (!booking) throw new Error("Unknown booking");
    if (booking.refund !== null) return BigInt(booking.refund);

    const credit = cancellationCredit(BigInt(booking.paid), BigInt(booking.starts_minute) - nowMinute);
    await tx.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [credit.toString(), booking.account_id]);
    await tx.query("UPDATE workshops SET available = available + $1 WHERE id = $2", [booking.seats, booking.workshop_id]);
    await tx.query("UPDATE bookings SET refund = $1 WHERE id = $2", [credit.toString(), bookingId]);
    return credit;
  });
}
