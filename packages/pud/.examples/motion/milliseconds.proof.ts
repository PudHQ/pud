import { describe, expect, given, it, pud } from "@pud.dev/lib";
import { reverseDuration } from "./reverse-duration.ts";
import { millisecondsToSeconds } from "./time-conversion.ts";

describe(millisecondsToSeconds, () => {
  it("gives one second per thousand milliseconds across the number domain", {
    milliseconds: pud.number(),
  }, ({ milliseconds }) => {
    expect(millisecondsToSeconds(milliseconds)).toExactly(pud.number().sameValue(milliseconds / 1000));
  });

  it("retains the direction of negative durations, including those that underflow to zero", {
    milliseconds: pud.number().lt(0),
  }, ({ milliseconds }) => {
    expect(millisecondsToSeconds(milliseconds)).to(pud.number().refine(seconds => seconds < 0 || 1 / seconds < 0));
  });

  it("reversing a duration reverses its seconds conversion", { milliseconds: pud.number() }, ({ milliseconds }) => {
    given(!Number.isNaN(milliseconds));
    expect(millisecondsToSeconds(reverseDuration(milliseconds))).toEqual(reverseDuration(millisecondsToSeconds(milliseconds)));
  });
});
