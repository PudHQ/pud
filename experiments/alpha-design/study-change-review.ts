// Run with bun experiments/alpha-design/study-change-review.ts.
// This synthetic comparison runs entirely in plain TypeScript and does not call Pud.
// The PR raises the daily export quota for grandfathered Team accounts from 12 to 16.
// A batch is accepted in full if it fits. Free keeps 8 units and current Team keeps 12.
// Account retention stays at 7, 30 and 30 days respectively for Free, current and legacy.
// After merge, the owner keeps the exact legacy quota and allows later retention changes.
import assert from "node:assert/strict";

const plans = ["free", "current", "legacy"] as const;
type Plan = typeof plans[number];
type ExportRequest = { plan: Plan; used: number; batch: number };
type Decision = { allowed: boolean; retentionDays: 7 | 30 | 60 };
type Policy = (request: ExportRequest) => Decision;

// An account can already be over quota after a downgrade.
const requests: ExportRequest[] = [];
for (const plan of plans) {
  for (let used = 0; used <= 16; used++) {
    for (let batch = 1; batch <= 4; batch++) requests.push({ plan, used, batch });
  }
}
const possibleDecisions: Decision[] = [];
for (const allowed of [false, true]) {
  for (const retentionDays of [7, 30, 60] as const) {
    possibleDecisions.push({ allowed, retentionDays });
  }
}

const before: Policy = ({ plan, used, batch }) => ({
  allowed: used + batch <= (plan === "free" ? 8 : 12),
  retentionDays: plan === "free" ? 7 : 30,
});
const intended: Policy = request => {
  const decision = before(request);
  if (request.plan === "legacy") decision.allowed = request.batch <= 16 - request.used;
  return decision;
};
const lateBonus: Policy = request => request.used >= 12 ? intended(request) : before(request);
const revisions: Record<string, Policy> = {
  intended,
  "feature omitted": before,
  "exclusive upper limit": request => request.plan === "legacy"
    ? { ...before(request), allowed: request.batch < 16 - request.used } : before(request),
  "bonus unlocked only once 12 used": lateBonus,
  "bonus leaks to current Team": request => request.plan === "current"
    ? intended({ ...request, plan: "legacy" }) : intended(request),
  "retention changed in feature PR": request => request.plan === "legacy"
    ? { ...intended(request), retentionDays: 60 } : intended(request),
  "later repeal of quota increase": before,
  "later reject legacy under old cap": request => request.plan === "legacy" && request.used + request.batch <= 12
    ? { ...intended(request), allowed: false } : intended(request),
  "later omit legacy ceiling": request => request.plan === "legacy"
    ? { ...intended(request), allowed: true } : intended(request),
};

function sameDecision(left: Decision, right: Decision) {
  return left.allowed === right.allowed && left.retentionDays === right.retentionDays;
}

// Ordinary absolute oracle. The test author supplies the whole policy independently.
const policyTable = {
  free: { quota: 8, retentionDays: 7 },
  current: { quota: 12, retentionDays: 30 },
  legacy: { quota: 16, retentionDays: 30 },
} as const;
const reference: Policy = ({ plan, used, batch }) => {
  const { quota, retentionDays } = policyTable[plan];
  return { allowed: used + batch <= quota, retentionDays };
};

// The proposed PR relation describes the required change relative to a pinned base.
function permitted(request: ExportRequest, old: Decision): Decision {
  const total = request.used + request.batch;
  if (request.plan === "legacy" && total > 12 && total <= 16) return { ...old, allowed: true };
  return old;
}

// An ordinary hand-written differential assertion against that same pinned base.
function ordinaryDiff(request: ExportRequest, old: Decision, next: Decision) {
  if (old.retentionDays !== next.retentionDays) return false;
  const total = request.used + request.batch;
  if (request.plan !== "legacy" || total <= 12 || total > 16) return next.allowed === old.allowed;
  return next.allowed;
}

// Two ways to keep the guarantee after merge. Only the second owns the whole quota.
function keepsPromotedSlice(request: ExportRequest, next: Decision) {
  const total = request.used + request.batch;
  if (request.plan === "legacy" && total > 12 && total <= 16) return next.allowed;
  return true;
}
function keepsPermanentQuota(request: ExportRequest, next: Decision) {
  return request.plan !== "legacy" || next.allowed === (request.batch <= 16 - request.used);
}

// Example tests pin the complete return on eight requests, including a four-unit batch.
type Example = [plan: Plan, used: number, batch: number, allowed: boolean, days: Decision["retentionDays"]];
const examples: Example[] = [
  ["free", 7, 1, true, 7], ["free", 8, 1, false, 7],
  ["current", 11, 1, true, 30], ["current", 12, 1, false, 30],
  ["legacy", 11, 1, true, 30], ["legacy", 12, 1, true, 30],
  ["legacy", 12, 4, true, 30], ["legacy", 16, 1, false, 30],
];
assert.deepEqual([examples.length, requests.length, possibleDecisions.length], [8, 204, 6]);

console.log("Counts of failing inputs per check; 8 fixed examples, all other columns 204 inputs.");
console.log("version\texamples\tabsolute oracle\told==new\tPR relation\tordinary diff\tpromoted slice\tpermanent quota");
const results: Record<string, number[]> = {};
for (const [name, policy] of Object.entries(revisions)) {
  const exampleFailures = examples.filter(([plan, used, batch, allowed, retentionDays]) =>
    !sameDecision(policy({ plan, used, batch }), { allowed, retentionDays })).length;
  const runs = requests.map(request => ({ request, old: before(request), next: policy(request) }));
  const counts = [
    exampleFailures,
    runs.filter(({ request, next }) => !sameDecision(next, reference(request))).length,
    runs.filter(({ old, next }) => !sameDecision(old, next)).length,
    runs.filter(({ request, old, next }) => !sameDecision(next, permitted(request, old))).length,
    runs.filter(({ request, old, next }) => !ordinaryDiff(request, old, next)).length,
    runs.filter(({ request, next }) => !keepsPromotedSlice(request, next)).length,
    runs.filter(({ request, next }) => !keepsPermanentQuota(request, next)).length,
  ];
  results[name] = counts;
  console.log([name, ...counts].join("\t"));
}
assert.deepEqual(results, {
  intended: [0, 0, 16, 0, 0, 0, 0],
  "feature omitted": [2, 16, 0, 16, 16, 16, 16],
  "exclusive upper limit": [1, 4, 12, 4, 4, 4, 4],
  "bonus unlocked only once 12 used": [0, 6, 10, 6, 6, 6, 6],
  "bonus leaks to current Team": [1, 16, 32, 16, 16, 0, 0],
  "retention changed in feature PR": [4, 68, 68, 68, 68, 0, 0],
  "later repeal of quota increase": [2, 16, 0, 16, 16, 16, 16],
  "later reject legacy under old cap": [1, 42, 58, 42, 42, 0, 42],
  "later omit legacy ceiling": [1, 10, 26, 10, 10, 0, 10],
});

// Compare the three checks on every possible return, including ones none of the
// nine revisions produced. The absolute oracle agrees here because the base is correct.
for (const request of requests) {
  const old = before(request);
  for (const next of possibleDecisions) {
    const accepts = sameDecision(next, permitted(request, old));
    assert.equal(ordinaryDiff(request, old, next), accepts);
    assert.equal(sameDecision(next, reference(request)), accepts);
  }
}
console.log(`Exact acceptance-set agreement on ${requests.length} inputs × ${possibleDecisions.length} possible outputs.`);

const straddle = requests.find(request => !sameDecision(reference(request), lateBonus(request)));
assert.ok(straddle);
assert.deepEqual(straddle, { plan: "legacy", used: 9, batch: 4 });
assert.deepEqual(reference(straddle), { allowed: true, retentionDays: 30 });
assert.deepEqual(lateBonus(straddle), { allowed: false, retentionDays: 30 });
console.log("First missed straddle:", JSON.stringify(straddle), "expected", JSON.stringify(reference(straddle)),
  "returned", JSON.stringify(lateBonus(straddle)));

const newlyAdmitted = requests.filter(request => !before(request).allowed && reference(request).allowed).length;
const unchanged = requests.filter(request => sameDecision(before(request), reference(request))).length;
assert.deepEqual([newlyAdmitted, unchanged], [16, 188]);
console.log(`${newlyAdmitted} newly admitted batches, ${unchanged} inputs preserve their old result.`);

// Seed a defect in the base and preserve it in the feature. The independently
// specified retention policy can still distinguish the wrong Free decision.
const wrongBase: Policy = request => request.plan === "free"
  ? { ...before(request), retentionDays: 30 } : before(request);
const inheritsBug: Policy = request => request.plan === "free" ? wrongBase(request) : intended(request);
const inherited = requests.map(request => ({ request, old: wrongBase(request), next: inheritsBug(request) }));
const absoluteFailures = inherited.filter(({ request, next }) => !sameDecision(reference(request), next)).length;
const relationFailures = inherited.filter(({ request, old, next }) => !sameDecision(permitted(request, old), next)).length;
const differentialFailures = inherited.filter(({ request, old, next }) => !ordinaryDiff(request, old, next)).length;
assert.deepEqual([absoluteFailures, relationFailures, differentialFailures], [68, 0, 0]);
console.log(`Inherited free-plan retention error: absolute oracle rejects ${absoluteFailures}; both relative checks reject 0.`);
