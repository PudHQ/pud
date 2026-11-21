// Run with bun experiments/alpha-design/study-rule-diff.ts. This is standalone TypeScript.
// The counts are exact for whole minutes 0…120 and four credit values. When an
// input or output range is unknown, sampling can show a difference but cannot
// establish that two rules permit the same behavior throughout that range.
import assert from "node:assert/strict";

const minutes = Array.from({ length: 121 }, (_, i) => i);
const credits = [0, 5, 10, 15] as const;
type Credit = typeof credits[number];
type Rule = (minute: number, credit: Credit) => boolean;
type Offer = { minute: number; credit: Credit };

const baseRule: Rule = (minute, credit) => {
  if (minute < 30) return credit === 0;
  if (minute < 60) return credit === 5;
  return credit >= 10;
};
const revisedRule: Rule = (minute, credit) => {
  if (minute < 30) return credit === 0;
  if (minute < 60) return credit === 5;
  const floor = minute > 60 ? 10 : 5;
  return credit >= floor && credit <= 10;
};

const baseCredit = (minute: number): Credit => minute < 30 ? 0 : minute < 60 ? 5 : 10;
const revisedCredit = (minute: number): Credit => minute >= 60 ? 10 : minute >= 30 ? 5 : 0;
let checkedReturns = 0;
for (const minute of minutes) {
  assert.equal(baseCredit(minute), revisedCredit(minute));
  for (const implementation of [baseCredit, revisedCredit]) {
    for (const rule of [baseRule, revisedRule]) {
      assert.ok(rule(minute, implementation(minute)));
      checkedReturns++;
    }
  }
}
assert.equal(checkedReturns, 484);

function compare(before: Rule, after: Rule) {
  const added: Offer[] = [], removed: Offer[] = [];
  for (const minute of minutes) {
    for (const credit of credits) {
      const was = before(minute, credit), now = after(minute, credit);
      if (now && !was) added.push({ minute, credit });
      if (was && !now) removed.push({ minute, credit });
    }
  }
  return { added, removed };
}

const witness = (rule: Rule) => credits.filter(credit => rule(60, credit));
const lostOffers: Offer[] = minutes.filter(minute => minute >= 60).map(minute => ({ minute, credit: 15 }));
const changes = compare(baseRule, revisedRule);
assert.equal(lostOffers.length, 61);
assert.deepEqual(changes.added, [{ minute: 60, credit: 5 }]);
assert.deepEqual(changes.removed, lostOffers);
assert.deepEqual([witness(baseRule), witness(revisedRule)], [[10, 15], [5, 10]]);
assert.deepEqual([baseCredit(60), revisedCredit(60)], [10, 10]);

// Require one credit throughout each completed five-minute bucket. An offer
// must satisfy the rule at every minute sharing its bucket. Other buckets
// can keep the existing implementation, which already satisfies both rules.
function perBucket(rule: Rule): Rule {
  return (minute, credit) => {
    const start = minute - minute % 5;
    return minutes.every(other => other < start || other >= start + 5 || rule(other, credit));
  };
}
const oldBuckets = perBucket(baseRule), newBuckets = perBucket(revisedRule);
for (const minute of minutes) assert.equal(baseCredit(minute), baseCredit(minute - minute % 5));
assert.deepEqual(compare(oldBuckets, newBuckets), { added: [], removed: lostOffers });
assert.deepEqual([witness(oldBuckets), witness(newBuckets)], [[10, 15], [10]]);

console.log(`Both implementations agree on ${minutes.length} outage durations and pass both rules (${checkedReturns} checks).`);
console.log(`Compared ${minutes.length * credits.length} duration/credit pairs: ${changes.added.length} newly permitted, ${changes.removed.length} no longer permitted.`);
console.log("60-minute outage: both return $10. Old rule permits $10 or $15. Revised rule permits $5 or $10.");
console.log("With the five-minute promise, $5 at minute 60 is impossible: minute 61 must receive $10.");
