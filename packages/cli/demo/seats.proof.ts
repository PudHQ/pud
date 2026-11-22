import { proof } from "@pud/cli";
import { reserveSeats } from "./seats";

export default [
  proof(reserveSeats, "A reservation never creates seats",
    (available, _requested, remaining) => remaining <= available),
  proof(reserveSeats, "Only a valid reservation consumes the requested seats",
    (available, requested, remaining) => {
      const fits = requested > 0n && requested <= available;
      if (!fits) return remaining === available;
      return remaining === available - requested;
    }),
];
