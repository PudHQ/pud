// Three offline edits start at the same board revision. Two readers independently
// receive all three messages once. Delivery order is the only variable.
type Card = { name: string; lane: string; owner: string };
type Edit = { stamp: number; key: keyof Card; value: string };
const initial: Card = { name: "Draft", lane: "Todo", owner: "Alice" };
const intended: Card = { name: "Ready", lane: "Done", owner: "Ben" };
const edits: Edit[] = [
  { stamp: 1, key: "name", value: "Ready" },
  { stamp: 2, key: "lane", value: "Done" },
  { stamp: 3, key: "owner", value: "Ben" },
];

function orders(remaining: Edit[]): Edit[][] {
  if (remaining.length === 0) return [[]];
  return remaining.flatMap(next =>
    orders(remaining.filter(edit => edit !== next)).map(tail => [next, ...tail]));
}

const same = (a: Card, b: Card) =>
  a.name === b.name && a.lane === b.lane && a.owner === b.owner;

// Each editor sent a snapshot of the card as seen when that editor made the edit.
const snapshot = (edit: Edit): Card => ({ ...initial, [edit.key]: edit.value });
function readNewestSnapshot(delivery: Edit[]): Card {
  let stamp = 0;
  let card = initial;
  for (const edit of delivery) {
    if (edit.stamp > stamp) {
      stamp = edit.stamp;
      card = snapshot(edit);
    }
  }
  return card;
}

function applyIndependentFields(delivery: Edit[]): Card {
  const card = { ...initial };
  for (const edit of delivery) card[edit.key] = edit.value;
  return card;
}

const schedules = orders(edits);
for (const read of [readNewestSnapshot, applyIndependentFields]) {
  let pairs = 0, agree = 0, keptEdits = 0;
  for (const leftOrder of schedules) {
    for (const rightOrder of schedules) {
      const left = read(leftOrder), right = read(rightOrder);
      pairs++;
      if (same(left, right)) agree++;
      if (same(left, intended) && same(right, intended)) keptEdits++;
    }
  }
  console.log(read.name, { pairs, agree, keptEdits, example: read(edits) });
}
