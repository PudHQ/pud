// Run with bun experiments/alpha-design/study-proof-tools.ts.
// Native TypeScript fixtures. Results cover the enumerated inputs only.
import assert from "node:assert/strict";

// Same quota calculation as experiments/prover-comparison/quota.md.
const LEGACY_QUOTA = 16n;
function admit(used: bigint, batch: bigint): boolean {
  return batch <= LEGACY_QUOTA - used;
}

type Request = { used: bigint; batch: bigint };
const requests: Request[] = [];
for (let used = 0n; used <= 16n; used++) {
  for (let batch = 1n; batch <= 4n; batch++) requests.push({ used, batch });
}

// A cache for this boolean result may share an entry only if both callers get
// the same decision. Check every unordered pair of distinct requests once.
function compareKeys(key: (request: Request) => bigint) {
  let pairs = 0;
  const conflicts: [Request, Request][] = [];
  for (const [index, left] of requests.entries()) {
    for (const right of requests.slice(index + 1)) {
      pairs++;
      if (key(left) === key(right) && admit(left.used, left.batch) !== admit(right.used, right.batch)) {
        conflicts.push([left, right]);
      }
    }
  }
  return { pairs, conflicts };
}

const byUsed = compareKeys(r => r.used);
const byTotal = compareKeys(r => r.used + r.batch);
assert.equal(requests.length, 68);
assert.equal(byUsed.pairs, 2278);
assert.equal(byTotal.pairs, 2278);
assert.equal(byUsed.conflicts.length, 10);
const witness = byUsed.conflicts[0];
assert.ok(witness);
assert.deepEqual(witness, [{ used: 13n, batch: 1n }, { used: 13n, batch: 4n }]);
assert.equal(admit(13n, 1n), true);
assert.equal(admit(13n, 4n), false);
assert.deepEqual(byTotal.conflicts, []);
console.log(`Cache keys across ${requests.length} requests and ${byUsed.pairs.toLocaleString("en-US")} pairs`);
console.log(`  used: ${byUsed.conflicts.length} conflicts. Two decisions for the same key:`);
for (const { used, batch } of witness) console.log(`    used=${used}, batch=${batch} -> ${admit(used, batch)}`);
console.log(`  used + batch: ${byTotal.conflicts.length} conflicts for the declared inputs and boolean result.`);

// A codemod would need to establish each site's input domain from the real
// source. Here the domains are supplied explicitly and no source is rewritten.
const cents = Array.from({ length: 11 }, (_, index) => index - 5);
function changedInputs(inputs: number[]) {
  return inputs.filter(amount => !Object.is(Math.floor(amount / 2), Math.trunc(amount / 2)));
}

const charge = cents.filter(amount => amount >= 0);
const paired = cents.filter(amount => amount % 2 === 0);
const changed = changedInputs(cents);
assert.deepEqual(changedInputs(charge), []);
assert.deepEqual(changedInputs(paired), []);
assert.deepEqual(changedInputs([-4, 0, 4]), []);
assert.deepEqual(changed, [-5, -3, -1]);
console.log("Candidate floor-to-trunc rewrite over whole cents from -5 to 5");
console.log(`  Bounded charge inputs (${charge.length}) and even inputs (${paired.length}): all results agree.`);
console.log(`  Signed adjustment inputs: hold the rewrite. Results differ at ${changed.join(", ")} cents.`);
