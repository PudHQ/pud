import { describe, expect, given, it, pud } from "pud.dev";
import { reverseDuration } from "./reverse-duration.ts";
import { secondsToMilliseconds } from "./time-conversion.ts";

describe(secondsToMilliseconds, () => {
  it("keeps every nonnegative duration nonnegative", { seconds: pud.number().gte(0) }, ({ seconds }) => {
    expect(secondsToMilliseconds(seconds)).to(pud.number().gte(0));
  });

  it("gives a thousand milliseconds per second, including fractional seconds", { seconds: pud.number() }, ({ seconds }) => {
    expect(secondsToMilliseconds(seconds)).toExactly(pud.number().sameValue(1000 * seconds));
  });

  it("reversing a duration reverses its millisecond conversion", { seconds: pud.number() }, ({ seconds }) => {
    given(!Number.isNaN(seconds));
    expect(secondsToMilliseconds(reverseDuration(seconds))).toEqual(reverseDuration(secondsToMilliseconds(seconds)));
  });
});
