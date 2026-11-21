// bun experiments/alpha-design/study-release-gate.ts
// IDs use [A-Za-z0-9_-]+, compared in ASCII order. Pools and weights are natural bigints.
// Each release checks one proposal. The enumeration gives finite evidence for the referee.
import assert from "node:assert/strict";
import { types } from "node:util";
type Group = readonly Readonly<{ id: string; weight: bigint }>[];
type Awards = readonly Readonly<{ id: string; credits: bigint }>[];
type Proposal = (pool: bigint, group: Group) => unknown;
const weightSum = (group: Group) => group.reduce((sum, row) => sum + row.weight, 0n);

// Only own data properties: no getters, proxies, iterators or asynchronous steps during capture.
function readAmounts(raw: unknown, field: "weight" | "credits"): Map<string, bigint> | undefined {
  if (types.isProxy(raw) || !Array.isArray(raw)) return;
  const result = new Map<string, bigint>();
  for (let index = 0; index < raw.length; index++) {
    const row = Object.getOwnPropertyDescriptor(raw, index)?.value;
    if (!row || typeof row !== "object" || types.isProxy(row)) return;
    const id = Object.getOwnPropertyDescriptor(row, "id")?.value;
    const amount = Object.getOwnPropertyDescriptor(row, field)?.value;
    if (typeof id !== "string" || id.length === 0 || /[^A-Za-z0-9_-]/.test(id) || result.has(id)) return;
    if (typeof amount !== "bigint" || amount < 0n) return;
    result.set(id, amount);
  }
  return result;
}
function referee(pool: bigint, group: Group, proposal: unknown): string | Awards {
  const amounts = readAmounts(proposal, "credits");
  if (!amounts || amounts.size !== group.length) return "shape";
  if ([...amounts.values()].reduce((a, b) => a + b, 0n) !== pool) return "conservation";
  const sum = weightSum(group);
  const ranks = [];
  for (const { id, weight } of group) {
    const credits = amounts.get(id);
    if (credits === undefined) return "shape";
    const scaled = pool * weight;
    const floor = scaled / sum;
    if (credits < floor || credits > (scaled + sum - 1n) / sum) return `quota ${id}`;
    ranks.push({ id, remainder: scaled % sum, extra: credits > floor });
  }
  const roundedDown = ranks.filter(row => !row.extra);
  for (const winner of ranks.filter(row => row.extra)) {
    for (const missed of roundedDown) {
      if (missed.remainder > winner.remainder || (missed.remainder === winner.remainder && missed.id < winner.id))
        return `priority ${missed.id} before ${winner.id}`;
    }
  }
  return Object.freeze(Array.from(amounts, ([id, credits]) => Object.freeze({ id, credits })));
}
// Trusted integration owns the only publication operation. A hung proposal remains pending;
// this study checks neither delivery nor undisclosed side effects inside a callback.
function release(pool: unknown, raw: unknown, mode: "proposal-only" | "publishes-internally",
                 propose: Proposal, publish: (result: Awards) => void): string {
  if (mode === "publishes-internally") return "UNSUPPORTED publication boundary";
  const weights = readAmounts(raw, "weight");
  if (typeof pool !== "bigint" || pool < 0n || !weights) return "HOLD invalid input";
  const group = Object.freeze(Array.from(weights, ([id, weight]) => Object.freeze({ id, weight })));
  if (weightSum(group) === 0n) return "HOLD invalid input";
  let proposal: unknown;
  try { proposal = propose(pool, group); } catch { return "HOLD proposal threw"; }
  const decision = referee(pool, group, proposal);
  if (typeof decision === "string") return `HOLD ${decision}`;
  publish(decision); // A delivery exception propagates to the publisher.
  return "RELEASED";
}
// Independent construction assigns floors, sorts fractional parts, then spends the spare credits.
function reference(pool: bigint, group: Group): Map<string, bigint> {
  const sum = weightSum(group);
  const sorted = group.map(({ id, weight }) => {
    const credits = pool * weight / sum;
    return { id, credits, remainder: pool * weight - credits * sum };
  }).sort((a, b) => {
    if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const spare = pool - sorted.reduce((used, row) => used + row.credits, 0n);
  return new Map(sorted.map((row, i) => [row.id, row.credits + (BigInt(i) < spare ? 1n : 0n)]));
}
function* allocations(count: number, total: bigint): Generator<bigint[]> {
  if (count === 1) { yield [total]; return; }
  for (let first = 0n; first <= total; first++) {
    for (const rest of allocations(count - 1, total - first)) yield [first, ...rest];
  }
}
const ids = ["Z", "A", "a"]; // Deliberately out of ASCII order.
const members = (weights: bigint[]): Group => weights.map((weight, i) => ({ id: ids[i]!, weight }));
const awards = (amounts: bigint[]) => amounts.map((credits, i) => ({ id: ids[i]!, credits }));
let cases = 0;
let candidates = 0;
for (let count = 1; count <= 3; count++) {
  for (let encoding = 1; encoding < 3 ** count; encoding++) {
    const group = members(Array.from({ length: count }, (_, i) => BigInt(Math.floor(encoding / 3 ** i) % 3)));
    for (let pool = 0n; pool <= 5n; pool++) {
      const expected = reference(pool, group);
      let winners = 0;
      for (const amounts of allocations(count, pool)) {
        const proposed = awards(amounts);
        const accepted = typeof referee(pool, group, proposed) !== "string";
        assert.equal(accepted, proposed.every(row => expected.get(row.id) === row.credits));
        if (accepted) winners++;
        candidates++;
      }
      assert.equal(winners, 1);
      cases++;
    }
  }
}
assert.deepEqual([cases, candidates], [216, 1636]);

const published: Awards[] = [];
const tie = members([1n, 1n]), unequal = members([2n, 1n]);
const publish = (result: Awards) => { published.push(result); };
function check(pool: unknown, group: unknown, proposal: unknown, expected: string) {
  let calls = 0;
  const before = published.length;
  const propose: Proposal = (_pool, input) => {
    calls++;
    assert.ok(Object.isFrozen(input) && input.every(Object.isFrozen));
    return proposal;
  };
  assert.equal(release(pool, group, "proposal-only", propose, publish), expected);
  assert.equal(calls, Number(expected !== "HOLD invalid input"));
  assert.equal(published.length, before + Number(expected === "RELEASED"));
}
const invalid = [[-1n, tie], [1, tie], [1n, members([0n, 0n])], [1n, [tie[0], tie[0]]],
  [1n, members([-1n, 2n])], [1n, [{ id: "A", weight: 1 }]],
  [1n, [{ id: "A", get weight() { throw Error("dynamic input"); } }]],
  ...["", "é", "A\n"].map(id => [1n, [{ id, weight: 1n }]])];
for (const [pool, group] of invalid) check(pool, group, [], "HOLD invalid input");
check(1n, tie, awards([1n]), "HOLD shape");
check(1n, tie, [{ id: "Z", credits: 1n }, { id: "Z", credits: 0n }], "HOLD shape");
check(1n, tie, [{ id: "A", credits: 1n }, { id: "X", credits: 0n }], "HOLD shape");
check(1n, tie, [{ id: "Z", credits: -1n }, { id: "A", credits: 2n }], "HOLD shape");
check(1n, tie, [{ id: "Z", get credits() { throw Error("unreadable"); } }, { id: "A", credits: 1n }], "HOLD shape");
check(1n, tie, awards([0n, 0n]), "HOLD conservation");
check(2n, tie, awards([2n, 0n]), "HOLD quota Z");
check(1n, tie, awards([1n, 0n]), "HOLD priority A before Z");
check(1n, unequal, awards([0n, 1n]), "HOLD priority Z before A");
assert.equal(release(1n, tie, "proposal-only", () => { throw Error("offline"); }, publish), "HOLD proposal threw");
assert.equal(published.length, 0);
const valid = awards([0n, 1n]);
check(1n, tie, valid, "RELEASED");
valid.reverse();
assert.deepEqual(published[0], awards([0n, 1n]));
assert.ok(Object.isFrozen(published[0]) && published[0]!.every(Object.isFrozen));
check(1n, unequal, awards([1n, 0n]).reverse(), "RELEASED");
const large = 2n ** 60n;
check(2n * large + 1n, tie, awards([large, large + 1n]), "RELEASED");
let unsafeCalls = 0;
assert.match(release(1n, tie, "publishes-internally", () => { unsafeCalls++; }, publish), /^UNSUPPORTED/);
assert.deepEqual([unsafeCalls, published.length], [0, 3]);
assert.throws(() => release(1n, tie, "proposal-only", () => valid, () => { throw Error("delivery"); }), /delivery/);
console.log("Scope: 1–3 recipients, weights 0–2 (positive sum), totals 0–5.");
console.log(`${cases} inputs; ${candidates} conserved candidates; exactly one accepted per input.`);
console.log(`Fixtures: ${invalid.length} invalid inputs held before invocation, 10 proposals held, 3 published,`);
console.log("1 unsupported allocator skipped, 1 publisher exception propagated.");
