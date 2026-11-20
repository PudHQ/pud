import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { check, type Report } from "./lib.ts";
import { banner, format, ink } from "./reporter.ts";

type Expectation = { status: "proved" } | { status: "disproved"; contract: string };

function meetsExpectation(report: Report, expected: Expectation): boolean {
  if (expected.status === "proved") return report.status === "proved";
  return report.status === "disproved" && !report.modelDisagreement
    && report.contracts.some(c => c.name === expected.contract && c.status === "disproved");
}

async function demo(dir: string): Promise<number> {
  const file = join(dir, "handler.ts");
  const original = await readFile(new URL("./handler.ts", import.meta.url), "utf8");
  await copyFile(new URL("./schema.sql", import.meta.url), join(dir, "schema.sql"));
  const guard = /\ba\.tenant_id\s*=\s*r\.tenant_id\s+AND\b\s*/i;
  const scenarios: { title: string; source: string; expected: Expectation }[] = [
    { title: "Original handler", source: original, expected: { status: "proved" } },
    { title: "Remove the SQL tenant filter", source: original.replace(guard, ""), expected: { status: "disproved", contract: "debit" } },
  ];

  console.log(banner("Debit endpoint"));
  let matched = 0;
  for (const [index, { title, source, expected }] of scenarios.entries()) {
    if (index > 0 && source === original) {
      console.error("\nCannot apply the demo edit. The example handler is missing the SQL tenant filter.");
      return 2;
    }
    const expectation = expected.status === "proved" ? "expect all contracts to pass" : `expect ${expected.contract} to fail`;
    console.log(`\n${ink.bold(`${index + 1}/${scenarios.length}  ${title}`)}  ${ink.dim(`(${expectation})`)}`);
    await writeFile(file, source);
    const start = performance.now();
    const report = await check(file);
    console.log(format({ ...report, file: basename(file) }, { elapsedMs: performance.now() - start }));
    if (!meetsExpectation(report, expected)) {
      console.error(`\nDemo stopped · ${matched}/${scenarios.length} scenarios matched expectations.`);
      return "contracts" in report ? 1 : 2;
    }
    matched++;
  }
  console.log("\n" + ink.green.bold(`✓ ${matched}/${scenarios.length} scenarios matched expectations`));
  return 0;
}

const dir = await mkdtemp(join(tmpdir(), "pud-debit-demo-"));
try {
  process.exitCode = await demo(dir);
} finally {
  await rm(dir, { recursive: true, force: true });
}
