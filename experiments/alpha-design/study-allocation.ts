import { deepStrictEqual, equal } from "node:assert/strict";

// Exhaustive only for three named recipients, weights 0..5 (at least one positive),
// 0..15 indivisible credits, and all six input orders. Run with Bun.
// The quota check's largest product is 15 credits * 15 total weight = 225.
const ids = ["A", "B", "C"] as const;
type Id = typeof ids[number];
type Amounts = Record<Id, number>;
type Order = readonly [Id, Id, Id];
type Allocator = (weights: Amounts, credits: number, order: Order) => Amounts;
const orders: readonly Order[] = [
  ids, ["A", "C", "B"], ["B", "A", "C"], ["B", "C", "A"], ["C", "A", "B"], ["C", "B", "A"],
];

const zero = (): Amounts => ({ A: 0, B: 0, C: 0 });
const sum = (amounts: Amounts) => amounts.A + amounts.B + amounts.C;

function hamilton(tie: "id" | "order"): Allocator {
  return (weights, credits, order) => {
    const denominator = sum(weights);
    const paid = zero();
    const remainders = zero();
    for (const id of order) {
      const numerator = credits * weights[id];
      const remainder = numerator % denominator;
      paid[id] = (numerator - remainder) / denominator;
      remainders[id] = remainder;
    }
    // Stable sorting retains the supplied order when the comparator returns zero.
    const ranked = [...order].sort((a, b) =>
      remainders[b] - remainders[a] || (tie === "id" ? ids.indexOf(a) - ids.indexOf(b) : 0)
    );
    const remaining = credits - sum(paid);
    for (const id of ranked.slice(0, remaining)) paid[id]++;
    return paid;
  };
}

// D'Hondt uses consecutive positive divisors and Webster uses consecutive odd divisors.
// Each credit goes to the largest weight / divisor, with ties settled by ID.
// The exhaustive matrix's cross-products are at most 5 * (2 * 15 + 1) = 155.
function highestAverages(method: "dhondt" | "webster") {
  const step = method === "dhondt" ? 1 : 2;
  return <K extends string>(weights: Record<K, number>, credits: number, order: readonly [K, ...K[]]) => {
    const rankedIds = [...order].sort();
    const paid = { ...weights };
    for (const id of rankedIds) paid[id] = 0;
    for (let credit = 0; credit < credits; credit++) {
      let winner = rankedIds[0]!;
      for (const id of rankedIds) {
        const challengerScore = weights[id] * (step * paid[winner] + 1);
        const winningScore = weights[winner] * (step * paid[id] + 1);
        if (challengerScore > winningScore) winner = id;
      }
      paid[winner]++;
    }
    return paid;
  };
}

const allToFirst: Allocator = (_weights, credits, order) => {
  const paid = zero();
  paid[order[0]] = credits;
  return paid;
};

function countFailures(allocate: Allocator) {
  const failures = { total: 0, wholeNonnegative: 0, zeroWeight: 0, quota: 0, order: 0, largerPool: 0 };
  for (let A = 0; A <= 5; A++) for (let B = 0; B <= 5; B++) for (let C = 0; C <= 5; C++) {
    const weights = { A, B, C };
    const denominator = sum(weights);
    if (denominator === 0) continue;
    let previous: Amounts[] = [];
    for (let credits = 0; credits <= 15; credits++) {
      const outputs = orders.map(order => allocate(weights, credits, order));
      for (const [i, paid] of outputs.entries()) {
        if (sum(paid) !== credits) failures.total++;
        if (ids.some(id => !Number.isInteger(paid[id]) || paid[id] < 0)) failures.wholeNonnegative++;
        if (ids.some(id => weights[id] === 0 && paid[id] !== 0)) failures.zeroWeight++;
        // For integral payments, strictly less than one credit away from ideal is
        // exactly the floor-or-ceiling condition, including when the ideal is integral.
        if (ids.some(id => Math.abs(paid[id] * denominator - credits * weights[id]) >= denominator)) {
          failures.quota++;
        }
        const prior = previous[i];
        if (prior && ids.some(id => paid[id] < prior[id])) failures.largerPool++;
      }
      const canonical = outputs[0]!;
      if (outputs.some(paid => ids.some(id => paid[id] !== canonical[id]))) failures.order++;
      previous = outputs;
    }
  }
  return failures;
}

const byId = hamilton("id");
const byOrder = hamilton("order");
const dhondt = highestAverages("dhondt");
const webster = highestAverages("webster");
console.log("Failures per rule. Total, wholeNonnegative, zeroWeight and quota each cover 20,640 calls.");
console.log("Order covers 3,440 (weights, credits) cases comparing all six orders by recipient ID.");
console.log("LargerPool covers 19,350 adjacent credit totals at the same weights and input order.");
for (const [name, allocate] of Object.entries({ byId, byOrder, allToFirst, dhondt, webster })) {
  const failures = countFailures(allocate);
  if (name === "webster") deepStrictEqual(Object.values(failures), [0, 0, 0, 0, 0, 0]);
  console.log(name, JSON.stringify(failures));
}

const reverse: Order = ["C", "B", "A"];
const equalWeights = { A: 1, B: 1, C: 1 };
const aWins = { A: 1, B: 0, C: 0 };
const cWins = { A: 0, B: 0, C: 1 };
for (const order of [ids, reverse]) {
  const stable = byId(equalWeights, 1, order);
  const positional = byOrder(equalWeights, 1, order);
  deepStrictEqual(stable, aWins);
  deepStrictEqual(positional, order[0] === "A" ? aWins : cWins);
  console.log("Tied weights, one credit", order.join(""), JSON.stringify({ stable, positional }));
}

const untied = { A: 1, B: 3, C: 5 };
for (const [credits, expected] of [[4, { A: 1, B: 1, C: 2 }], [5, { A: 0, B: 2, C: 3 }]] as const) {
  const remainders = ids.map(id => credits * untied[id] % sum(untied));
  equal(new Set(remainders).size, 3);
  const paid = byId(untied, credits, ids);
  deepStrictEqual(paid, expected);
  console.log("Hamilton, weights 1:3:5", credits, "credits", JSON.stringify(paid), "remainders / 9", remainders);
}

const skewed = { A: 5, B: 1, C: 1 };
const outcomes = { dhondt: dhondt(skewed, 4, ids), hamilton: byId(skewed, 4, ids), webster: webster(skewed, 4, ids) };
deepStrictEqual(outcomes.dhondt, { A: 4, B: 0, C: 0 });
deepStrictEqual(outcomes.hamilton, { A: 3, B: 1, C: 0 });
deepStrictEqual(outcomes.webster, { A: 3, B: 1, C: 0 });
console.log("Weights 5:1:1, four credits, A's ideal is 20/7", JSON.stringify(outcomes));

// These two individual calls extend the domain of the three-recipient matrix.
const fourIds = ["A", "B", "C", "D"] as const;
for (const [aWeight, credits, expectedIdeal] of [[3, 2, 1], [6, 3, 2]] as const) {
  const weights = { A: aWeight, B: 1, C: 1, D: 1 };
  const paid = webster(weights, credits, fourIds);
  const idealA = credits * weights.A / (aWeight + 3);
  equal(idealA, expectedIdeal);
  deepStrictEqual(paid, { A: credits, B: 0, C: 0, D: 0 });
  // A's last winning priority is 3/3 or 6/5. Each other recipient still has priority 1.
  const tieForLast = aWeight === 2 * (credits - 1) + 1;
  equal(tieForLast, aWeight === 3);
  console.log("Webster, four recipients", JSON.stringify({ weights, credits, idealA, paid, tieForLast }));
}

const resetEveryPool = zero();
for (const credits of [1, 1, 1]) {
  const paid = webster(equalWeights, credits, ids);
  for (const id of ids) resetEveryPool[id] += paid[id];
}
const onePool = webster(equalWeights, 3, ids);
deepStrictEqual(resetEveryPool, { A: 3, B: 0, C: 0 });
deepStrictEqual(onePool, { A: 1, B: 1, C: 1 });
console.log("Webster, equal weights, three credits", JSON.stringify({ resetEveryPool, onePool }));
