import { Database } from "bun:sqlite";
import { deepStrictEqual } from "node:assert/strict";

// A synthetic timesheet service keeps minutes by project in a read model.
// Rebuild the same quantity from the source rows at a known revision.
function openFixture() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE timesheet(id INTEGER PRIMARY KEY, project TEXT NOT NULL, minutes INTEGER NOT NULL);
    CREATE TABLE totals(project TEXT PRIMARY KEY NOT NULL, minutes INTEGER NOT NULL);
    CREATE TABLE revisions(source INTEGER, projection INTEGER);
    INSERT INTO timesheet VALUES (1, 'A', 30), (2, 'C', 60), (3, 'Zero', 0);
    INSERT INTO totals VALUES ('A', 30), ('B', 0), ('C', 70);
    INSERT INTO revisions VALUES (1, 1);
  `);
  return db;
}

type Drift = { project: string; stored: number | null; rebuilt: number };

function discrepancies(db: Database) {
  // This read model exposes minutes, with an absent project reading as zero.
  // A stored zero with no source, and a zero-minute source with no total, both agree.
  // Preserve a missing stored row as null in reports so it is visible when it matters.
  return db.query<Drift, []>(`
    WITH rebuilt AS (
      SELECT project, SUM(minutes) AS minutes FROM timesheet GROUP BY project
    ), projects AS (
      SELECT project FROM rebuilt UNION SELECT project FROM totals
    )
    SELECT projects.project, totals.minutes AS stored, COALESCE(rebuilt.minutes, 0) AS rebuilt
    FROM projects LEFT JOIN totals USING(project) LEFT JOIN rebuilt USING(project)
    WHERE COALESCE(totals.minutes, 0) <> COALESCE(rebuilt.minutes, 0)
    ORDER BY projects.project
  `).all();
}

function observe(db: Database, baseline: Drift[]) {
  const revisions = db.query<{ source: number; projection: number }, []>(
    "SELECT source, projection FROM revisions"
  ).get()!;
  if (revisions.source !== revisions.projection) return { status: "pending", ...revisions };

  const drifts = discrepancies(db);
  const changed = drifts.filter(row => {
    const prior = baseline.find(other => other.project === row.project);
    const priorDifference = prior ? (prior.stored ?? 0) - prior.rebuilt : 0;
    return (row.stored ?? 0) - row.rebuilt !== priorDifference;
  });
  return { status: changed.length ? "new divergence" : "no new divergence", changed, drifts };
}

const legacyDrift = { project: "C", stored: 70, rebuilt: 60 };
const staleOrigin = { project: "A", stored: 30, rebuilt: 0 };
const missingDestination = { project: "D", stored: null, rebuilt: 30 };
const cases = [
  { mode: "no-op", destination: "A", changed: [], drifts: [legacyDrift] },
  { mode: "correct move", destination: "B", changed: [], drifts: [legacyDrift] },
  { mode: "lost subtraction", destination: "B", changed: [staleOrigin], drifts: [staleOrigin, legacyDrift] },
  { mode: "correct move to new project", destination: "D", changed: [], drifts: [legacyDrift] },
  { mode: "missing destination row", destination: "D", changed: [missingDestination], drifts: [legacyDrift, missingDestination] },
];

for (const { mode, destination, changed, drifts } of cases) {
  const db = openFixture();
  try {
    const baseline = discrepancies(db);
    deepStrictEqual(baseline, [legacyDrift]);
    db.transaction(() => {
      db.query("UPDATE timesheet SET project = ? WHERE id = 1").run(destination);
      db.exec("UPDATE revisions SET source = 2");
    })();
    const pending = observe(db, baseline);
    deepStrictEqual(pending, { status: "pending", source: 2, projection: 1 });
    console.log(mode, "before delivery", JSON.stringify(pending));
    db.transaction(() => {
      if (destination !== "A") {
        if (mode !== "lost subtraction") db.exec("UPDATE totals SET minutes = minutes - 30 WHERE project = 'A'");
        if (mode === "missing destination row") {
          // UPDATE silently affects zero rows when this is the first entry for D.
          db.query("UPDATE totals SET minutes = minutes + 30 WHERE project = ?").run(destination);
        } else {
          db.query(`
            INSERT INTO totals(project, minutes) VALUES (?, 30)
            ON CONFLICT(project) DO UPDATE SET minutes = totals.minutes + excluded.minutes
          `).run(destination);
        }
      }
      db.exec("UPDATE revisions SET projection = 2");
    })();
    const observed = observe(db, baseline);
    deepStrictEqual(observed, { status: changed.length ? "new divergence" : "no new divergence", changed, drifts });
    console.log(mode, "after delivery", JSON.stringify(observed));
  } finally {
    db.close();
  }
}
