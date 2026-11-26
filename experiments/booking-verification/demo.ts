import { book, cancel, openBookingDatabase } from "./booking.ts";
import { readState, seedWorkshop, startMinute } from "./fixture.ts";

const db = await openBookingDatabase();
try {
  await seedWorkshop(db);
  const request = { id: "b-101", accountId: "alice", workshopId: "printmaking", seats: 3n };
  console.log("Booking", await book(db, request));
  console.log("After booking", await readState(db, request.accountId));
  console.log("Cancellation credit", await cancel(db, request.id, startMinute - 120n));
  console.log("After cancellation", await readState(db, request.accountId));
} finally {
  await db.close();
}
