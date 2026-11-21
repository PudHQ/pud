import { Database } from "bun:sqlite";

// Every subset is legal under the predecessor schema. Each migration runs on
// a fresh in-memory database. No application code or inferred business rule
// participates in this experiment.
const oldSchema = `
  CREATE TABLE project (
    workspace TEXT NOT NULL,
    slug TEXT NOT NULL,
    PRIMARY KEY (workspace, slug)
  );
`;
type Row = { workspace: string; slug: string };
const spellings = ["Plan", "plan", "Notes"];

const migrations = {
  preserveKey: "CREATE UNIQUE INDEX next_slug ON project (workspace, slug)",
  foldCase: "CREATE UNIQUE INDEX next_slug ON project (workspace, lower(slug))",
  globalSlug: "CREATE UNIQUE INDEX next_slug ON project (slug)",
};

function attempt(rows: Row[], sql: string): string | undefined {
  const db = new Database(":memory:");
  try {
    db.exec(oldSchema);
    const add = db.prepare("INSERT INTO project VALUES (?, ?)");
    for (const { workspace, slug } of rows) add.run(workspace, slug);
    try {
      db.exec(sql);
      return undefined;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("UNIQUE constraint failed")) throw error;
      return error.message;
    }
  } finally {
    db.close();
  }
}

function check(domain: string, slugs: string[], name: string, sql: string) {
  const possibleRows = ["north", "south"].flatMap(workspace =>
    slugs.map(slug => ({ workspace, slug })));
  let failures = 0;
  let emptyOrSingleFailures = 0;
  let smallest: { rows: Row[]; message: string } | undefined;
  const states = 2 ** possibleRows.length;
  for (let mask = 0; mask < states; mask++) {
    const rows = possibleRows.filter((_, i) => (mask & (1 << i)) !== 0);
    const message = attempt(rows, sql);
    if (message === undefined) continue;
    failures++;
    if (rows.length <= 1) emptyOrSingleFailures++;
    if (!smallest || rows.length < smallest.rows.length) smallest = { rows, message };
  }
  console.log(domain, name, JSON.stringify({ states, failures, emptyOrSingleFailures, smallest }));
}

for (const [name, sql] of Object.entries(migrations)) {
  check("schema accepts", spellings, name, sql);
  // Comparison domain: suppose *every* historical writer normalized these
  // slugs. This assumption must be established separately for a real app.
  check("all writers lowercase", [...new Set(spellings.map(s => s.toLowerCase()))], name, sql);
}
