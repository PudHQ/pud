import { expect, test } from "bun:test";
import { meltDuration, meltFrame } from "../src/lib/melt-timeline";

test("the page slows as the overlay fades in and stops at full opacity", () => {
  const frames = [1000, 1275, 1550, 1825, 2100, 2375, meltDuration].map(meltFrame);
  expect(meltFrame(0)).toEqual({ travel: 0, sceneTime: 0, reveal: 0, speed: 0 });
  expect(meltFrame(420)).toMatchObject({ reveal: 0, speed: 1 });
  for (let i = 1; i < frames.length; i++) {
    const previous = frames[i - 1];
    const frame = frames[i];
    expect(frame.travel).toBeGreaterThan(previous.travel);
    expect(frame.reveal).toBeGreaterThan(previous.reveal);
    expect(frame.speed).toBeLessThan(previous.speed);
  }
  expect(meltFrame(meltDuration)).toMatchObject({ travel: 1, reveal: 1, speed: 0 });
  expect(meltFrame(meltDuration + 1000)).toEqual(meltFrame(meltDuration));
});
