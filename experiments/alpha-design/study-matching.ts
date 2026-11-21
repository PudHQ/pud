import { deepStrictEqual, equal, ok, throws } from "node:assert/strict";

// A dispatcher wants to fill as many unit-capacity slots as possible. The caller
// supplies the authoritative eligibility snapshot separately from both witnesses.
type Edge = readonly [job: string, slot: string];
type Schedule = { revision: string; assignments: readonly Edge[] };
type Cover = { revision: string; jobs: readonly string[]; slots: readonly string[] };

function snapshot(revision: string, jobs: readonly string[], slots: readonly string[], eligible: readonly Edge[]) {
  const neighbors = new Map(jobs.map(job => [job, new Set<string>()] as const));
  const slotIds = new Set(slots);
  if (neighbors.size !== jobs.length || slotIds.size !== slots.length) throw Error("duplicate ID");
  for (const [job, slot] of eligible) {
    const row = neighbors.get(job);
    if (!row || !slotIds.has(slot)) throw Error("unknown endpoint");
    if (row.has(slot)) throw Error("duplicate edge");
    row.add(slot);
  }
  return { revision, neighbors, slotIds };
}
type Snapshot = ReturnType<typeof snapshot>;

function matchingSize(graph: Snapshot, schedule: Schedule): number | undefined {
  if (schedule.revision !== graph.revision) return;
  const jobs = new Set<string>(), slots = new Set<string>();
  for (const [job, slot] of schedule.assignments) {
    if (!graph.neighbors.get(job)?.has(slot) || jobs.has(job) || slots.has(slot)) return;
    jobs.add(job);
    slots.add(slot);
  }
  return jobs.size;
}

function coverSize(graph: Snapshot, cover: Cover): number | undefined {
  if (cover.revision !== graph.revision) return;
  const jobs = new Set(cover.jobs), slots = new Set(cover.slots);
  if (jobs.size !== cover.jobs.length || slots.size !== cover.slots.length) return;
  for (const job of jobs) if (!graph.neighbors.has(job)) return;
  for (const slot of slots) if (!graph.slotIds.has(slot)) return;
  for (const [job, neighbors] of graph.neighbors) {
    if (!jobs.has(job)) for (const slot of neighbors) if (!slots.has(slot)) return;
  }
  return jobs.size + slots.size;
}

// At any finite size, each edge of any matching touches a cover vertex. Distinct
// matched edges have disjoint endpoints, so they need distinct cover vertices.
// Thus the supplied assignment size <= optimum <= the independently checked cover size.
function review(graph: Snapshot, schedule: Schedule, witness: Cover | Schedule) {
  const lower = matchingSize(graph, schedule);
  if (lower === undefined) return { status: "invalid schedule" } as const;
  if ("assignments" in witness) {
    const replacementSize = matchingSize(graph, witness);
    if (replacementSize === undefined) return { status: "invalid alternative" } as const;
    if (replacementSize > lower) {
      return { status: "not maximum", offeredSize: lower, replacementSize, replacement: witness } as const;
    }
    return { status: "no improvement", offeredSize: lower, alternativeSize: replacementSize } as const;
  }
  const upper = coverSize(graph, witness);
  if (upper === undefined) return { status: "invalid cover" } as const;
  if (lower === upper) return { status: "maximum", size: lower } as const;
  return { status: "bounds", lower, upper } as const;
}

// Two dispatchers submit different optima. All eligible assignments are incident
// to either job A or slot 09. This remains true even with three jobs and three slots.
const jobs = ["A", "B", "C"], slots = ["09", "10", "11"];
const eligible: Edge[] = [["A", "09"], ["A", "10"], ["A", "11"], ["B", "09"], ["C", "09"]];
const revision = "tuesday-v1";
const graph = snapshot(revision, jobs, slots, eligible);
const cover: Cover = { revision, jobs: ["A"], slots: ["09"] };
const plan = (...assignments: Edge[]): Schedule => ({ revision, assignments });
const first = plan(["A", "10"], ["B", "09"]), second = plan(["A", "11"], ["C", "09"]);
const greedy = plan(["A", "09"]); // Maximal. Neither remaining job can use a free slot.
const optimum = { status: "maximum", size: 2 };
deepStrictEqual(review(graph, first, cover), optimum);
deepStrictEqual(review(graph, second, cover), optimum);
equal(coverSize(graph, cover), 2); // The cover alone supplies the upper bound.
const open = review(graph, greedy, cover);
deepStrictEqual(open, { status: "bounds", lower: 1, upper: 2 });
// A feasibility check plus the dispatcher's claimed objective accepts the greedy result.
const reportedMaximum = 1;
const acceptsClaim = matchingSize(graph, greedy) === reportedMaximum;
equal(acceptsClaim, true);
deepStrictEqual(review(graph, first, { revision, jobs, slots: [] }), { status: "bounds", lower: 2, upper: 3 });
console.log("Two schedules, one cover", JSON.stringify({ first, second, cover, result: optimum }));
console.log("Greedy schedule", JSON.stringify({ greedy, reportedMaximum, acceptsClaim, checked: open }));

// Two maximum-cardinality plans give the business different revenue on the same jobs.
const feeUSD = new Map([["A", 20], ["B", 200], ["C", 50]]);
const revenue = (schedule: Schedule) => schedule.assignments.reduce((sum, [job]) => sum + feeUSD.get(job)!, 0);
const revenueUSD = { first: revenue(first), second: revenue(second) };
deepStrictEqual(revenueUSD, { first: 220, second: 70 });
deepStrictEqual(review(graph, second, first), { status: "no improvement", offeredSize: 2, alternativeSize: 2 });
console.log("Both schedules certified at size 2, revenue in USD", JSON.stringify(revenueUSD));

const invalidSchedule = { status: "invalid schedule" }, invalidCover = { status: "invalid cover" };
for (const wrong of [
  plan(["A", "10"], ["B", "11"], ["C", "09"]), // perfect count, ineligible edge
  plan(["A", "09"], ["B", "09"]), plan(["A", "10"], ["A", "11"]), plan(["A", "10"], ["A", "10"]),
  plan(["D", "09"]), plan(["A", "12"]), { ...first, revision: "monday-v1" },
]) deepStrictEqual(review(graph, wrong, cover), invalidSchedule);
for (const wrong of [
  { ...cover, slots: ["10"] }, { ...cover, jobs: ["A", "A"] }, { ...cover, slots: ["09", "09"] },
  { ...cover, jobs: ["D"] }, { ...cover, slots: ["12"] }, { ...cover, revision: "monday-v1" },
]) deepStrictEqual(review(graph, first, wrong), invalidCover);
// Deliberately reuse the revision label. Checking actual edges catches stale evidence.
const added = snapshot(revision, jobs, slots, [...eligible, ["B", "10"]]);
const removed = snapshot(revision, jobs, slots, eligible.filter(([job, slot]) => job !== "A" || slot !== "10"));
deepStrictEqual(review(added, first, cover), invalidCover);
deepStrictEqual(review(removed, first, cover), invalidSchedule);
// On the expanded graph a size-two alternative refutes the size-one claim even
// though a third dispatcher can fill all three slots. Review the improvement alone.
const challenge = review(added, greedy, first);
deepStrictEqual(challenge, { status: "not maximum", offeredSize: 1, replacementSize: 2, replacement: first });
const three = plan(["A", "11"], ["B", "10"], ["C", "09"]);
deepStrictEqual(review(added, three, { revision, jobs, slots: [] }), { status: "maximum", size: 3 });
deepStrictEqual(review(added, first, greedy), { status: "no improvement", offeredSize: 2, alternativeSize: 1 });
deepStrictEqual(review(added, greedy, plan(["A", "09"], ["C", "11"])), { status: "invalid alternative" });
deepStrictEqual(review(added, greedy, { ...first, revision: "monday-v1" }), { status: "invalid alternative" });
console.log("Larger feasible plan on expanded graph", JSON.stringify(challenge));
throws(() => snapshot(revision, [...jobs, "A"], slots, eligible), /duplicate ID/);
throws(() => snapshot(revision, jobs, [...slots, "09"], eligible), /duplicate ID/);
throws(() => snapshot(revision, jobs, slots, [...eligible, ["B", "09"]]), /duplicate edge/);
throws(() => snapshot(revision, jobs, slots, [...eligible, ["D", "09"]]), /unknown endpoint/);

// Independent finite oracle. For each job, skip it or try every eligible, unused
// slot. Nine edge bits specify the graph and six vertex bits specify a possible cover.
function enumerateMatches(graphMask: number, job = 0, usedSlots = 0, chosen = 0): number[] {
  if (job === 3) return [chosen];
  const matches = enumerateMatches(graphMask, job + 1, usedSlots, chosen);
  for (let slot = 0; slot < 3; slot++) {
    const edgeBit = 1 << (3 * job + slot), slotBit = 1 << slot;
    if ((graphMask & edgeBit) && !(usedSlots & slotBit)) {
      matches.push(...enumerateMatches(graphMask, job + 1, usedSlots | slotBit, chosen | edgeBit));
    }
  }
  return matches;
}

const pairs = jobs.flatMap(job => slots.map(slot => [job, slot] as const));
const edgeSets = Array.from({ length: 512 }, (_, mask) => pairs.filter((_, i) => mask & (1 << i)));
const possibleMatches = enumerateMatches(511);
const covers = Array.from({ length: 64 }, (_, mask) => {
  const witness = { revision, jobs: jobs.filter((_, i) => mask & (1 << i)), slots: slots.filter((_, i) => mask & (8 << i)) };
  let uncoveredEdges = 0;
  for (let i = 0; i < 9; i++) {
    if (!(mask & (1 << Math.floor(i / 3))) && !(mask & (8 << (i % 3)))) uncoveredEdges |= 1 << i;
  }
  return { witness, uncoveredEdges, size: witness.jobs.length + witness.slots.length };
});
let multipleOptima = 0, certified = 0, bounded = 0, witnessPairs = 0;
for (const [mask, edges] of edgeSets.entries()) {
  const current = snapshot(revision, jobs, slots, edges);
  const feasible = new Set(enumerateMatches(mask));
  const maximum = Math.max(...Array.from(feasible, m => edgeSets[m]!.length));
  const best = [...feasible].filter(m => edgeSets[m]!.length === maximum);
  if (best.length > 1) multipleOptima++;
  for (const [candidate, assignments] of edgeSets.entries()) {
    equal(matchingSize(current, { revision, assignments }), feasible.has(candidate) ? assignments.length : undefined);
  }

  const certifiedMatches = new Set<number>();
  for (const { witness, uncoveredEdges, size } of covers) {
    const isCover = (mask & uncoveredEdges) === 0;
    equal(coverSize(current, witness), isCover ? size : undefined);
    for (const candidate of possibleMatches) {
      const assignments = edgeSets[candidate]!;
      const result = review(current, { revision, assignments }, witness);
      witnessPairs++;
      if (!feasible.has(candidate)) equal(result.status, "invalid schedule");
      else if (!isCover) equal(result.status, "invalid cover");
      else if (assignments.length === size) {
        deepStrictEqual(result, { status: "maximum", size: maximum });
        certifiedMatches.add(candidate);
        certified++;
      } else {
        deepStrictEqual(result, { status: "bounds", lower: assignments.length, upper: size });
        ok(assignments.length <= maximum && maximum <= size);
        bounded++;
      }
    }
  }
  deepStrictEqual(certifiedMatches, new Set(best));
}
equal(witnessPairs, 512 * 64 * 34);
console.log("3×3 graphs", JSON.stringify({ graphs: 512, multipleOptima, witnessPairs, certified, bounded }));
// These counts cover the named 3×3 domain. The size argument concerns recorded
// eligibility and assignment count. Priorities, revenue, and upstream availability
// would each need their own specified claim and evidence.
