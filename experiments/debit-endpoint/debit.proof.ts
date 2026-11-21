import { debit } from "./handler.ts";
import type { DebitObservation } from "./ledger.ts";
export { ledger as adapter } from "./ledger.ts";

export default [
  {
    subject: debit,
    name: "Charge only the requested account",
    property: (tx: DebitObservation) => !tx.seen && tx.funded
      ? tx.result === "applied" && tx.debitedOnly && tx.recordedOnly
      : true,
  },
  {
    subject: debit,
    name: "Decline unfunded requests without a write",
    property: (tx: DebitObservation) => !tx.seen && !tx.funded
      ? tx.result === "declined" && tx.unchanged
      : true,
  },
  {
    subject: debit,
    name: "Recognize a retry without charging twice",
    property: (tx: DebitObservation) => tx.seen ? tx.result === "duplicate" && tx.unchanged : true,
  },
];
