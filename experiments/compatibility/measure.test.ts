import { expect, test } from "bun:test";
import { checkProgress, type Snapshot } from "./measure.ts";
import { admits, domains, projects, schemaFor } from "./projects.ts";
import { areaStatus, roadmap } from "./roadmap.ts";
import inventory from "./test262/inventory.json";

const snapshot = () => Bun.file(new URL("./baseline.json", import.meta.url)).json() as Promise<Snapshot>;

test("the published pilot contains every registered target and upstream file exactly once", async () => {
  const data = await snapshot();
  const ids = projects.flatMap(project => project.targets.map(target => project.repo + "/" + target.name));
  expect(new Set(ids).size).toBe(ids.length);
  expect(data.dropIn.map(row => row.project + "/" + row.name)).toEqual(ids);
  expect(data.arithmetic.map(row => row.operator)).toEqual(inventory.files.map(file => file.path.split("/").at(-2)!));
  const seen = new Set<string>();
  for (const branch of roadmap) {
    expect(seen.has(branch.id)).toBe(false);
    expect(branch.depends.every(id => seen.has(id))).toBe(true);
    seen.add(branch.id);
  }
});

test("a map area reflects partial and fully demonstrated work", () => {
  const done = ["Direct calls", "Demonstrated", "Checked by a real-project law."] as const;
  const open = ["Callbacks", "Open", "The callback law is blocked."] as const;
  expect(areaStatus([[...done], [...open]])).toBe("Partial");
  expect(areaStatus([[...done]])).toBe("Demonstrated");
});

test("an equal score cannot hide a lost project proof or a different failing upstream assertion", async () => {
  const before = await snapshot(), after = structuredClone(before);
  before.dropIn[0]!.verdict = "proved";
  after.dropIn[1]!.verdict = "proved";
  expect(() => checkProgress(before, after)).toThrow("Drop-in regression");
  before.dropIn = after.dropIn;
  before.arithmetic[0]!.unsupported = [1];
  after.arithmetic[0]!.unsupported = [2];
  expect(() => checkProgress(before, after)).toThrow("Test262 regression");
});

test("missing observations and silent cohort changes fail the comparison", async () => {
  const before = await snapshot(), after = structuredClone(before);
  after.cohort = "changed";
  expect(() => checkProgress(before, after)).toThrow("Version the pilot");
  after.cohort = before.cohort;
  after.dropIn.pop();
  expect(() => checkProgress(before, after)).toThrow("Missing or extra");
});

test("the native controls use the same bounded integer domains as the proof inputs", () => {
  expect(schemaFor(domains.year)).toContain(".gte(100).lte(9999)");
  expect([99, 100, 2000.5, 9999, 10000].map(value => admits(domains.year, value))).toEqual([false, true, false, true, false]);
  expect(admits(domains.number, NaN)).toBe(true);
  expect(admits(domains.bigint, 3)).toBe(false);
});
