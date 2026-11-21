// Can any deterministic dashboard compute the exact pooled lower median from
// two (row count, lower median) summaries? Find two worlds that require
// different answers despite giving it identical observations.
type Rows = readonly number[];
function lowerMedian(rows: Rows) {
  const ordered = [...rows].sort((a, b) => a - b);
  if (!ordered.length) throw new Error("The study requires nonempty shards.");
  return ordered[Math.floor((ordered.length - 1) / 2)]!;
}
function summary(rows: Rows) {
  return [rows.length, lowerMedian(rows)];
}

const right = [4, 5, 6];
for (const left of [[0, 1, 2], [0, 1, 9]]) {
  console.log("Shard observations", JSON.stringify([summary(left), summary(right)]),
    "required answer", lowerMedian([...left, ...right]));
}

// Adding each shard's sum distinguishes the first pair. Look again with the
// revised interface. Different legal inputs still share every reported field.
function withSum(rows: Rows) {
  return [...summary(rows), rows.reduce((sum, item) => sum + item, 0)];
}
const nextRight = [0, 0, 10];
for (const left of [[0, 3, 9], [2, 3, 7]]) {
  console.log("Revised observations", JSON.stringify([withSum(left), withSum(nextRight)]),
    "required answer", lowerMedian([...left, ...nextRight]));
}

// Does any integer usage in the offered range make the middle plan strictly
// cheaper than both rivals? Different rivals may win at different volumes.
for (const middleFee of [800, 400]) {
  const wins: number[] = [];
  const ties: number[] = [];
  for (let units = 0; units <= 1000; units++) {
    const middle = middleFee + 8 * units;
    const bestOther = Math.min(12 * units, 1200 + 3 * units);
    if (middle < bestOther) wins.push(units);
    if (middle === bestOther) ties.push(units);
  }
  console.log("Plan fee in cents", middleFee, {
    strictWins: wins.length, firstWin: wins.at(0), lastWin: wins.at(-1), ties
  });
}
