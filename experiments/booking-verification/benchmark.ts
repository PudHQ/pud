const iterations = Number(process.argv[2] ?? 7);
if (!Number.isSafeInteger(iterations) || iterations < 1) throw new Error("Pass a positive sample count.");

const cwd = import.meta.dir;
const env = { ...process.env, CI: "true", FORCE_COLOR: "0" };

async function elapsed(script: string) {
  const start = performance.now();
  const child = Bun.spawn([process.execPath, "run", "--silent", script], { cwd, env, stdout: "pipe", stderr: "pipe" });
  const [exit, stdout, stderr] = await Promise.all([child.exited, child.stdout.text(), child.stderr.text()]);
  const ms = performance.now() - start;
  if (exit !== 0) throw new Error(`bun run ${script} exited ${exit}\n${stdout}\n${stderr}`);
  return Math.round(ms);
}

async function pudWithDatabase() {
  const start = performance.now();
  const proof = await elapsed("proof");
  const db = await elapsed("test:db");
  return { proof, db, "proof+db": Math.round(performance.now() - start) };
}

const groups: (() => Promise<Record<string, number>>)[] = [
  async () => ({ examples: await elapsed("test:examples") }),
  async () => ({ bounded: await elapsed("test:bounded") }),
  async () => ({ "examples+db": await elapsed("test") }),
  async () => ({ "bounded+db": await elapsed("test:bounded:db") }),
  pudWithDatabase,
];

for (const run of groups) await run();

const samples: Record<string, number[]> = {};
for (let i = 0; i < iterations; i++) {
  for (let offset = 0; offset < groups.length; offset++) {
    const run = groups[(i + offset) % groups.length]!;
    for (const [name, ms] of Object.entries(await run())) {
      samples[name] ??= [];
      samples[name].push(ms);
    }
  }
  console.error(`Sample round ${i + 1}/${iterations}`);
}

const results = Object.fromEntries(Object.entries(samples).map(([name, values]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const median = (sorted[Math.floor((sorted.length - 1) / 2)]! + sorted[Math.floor(sorted.length / 2)]!) / 2;
  return [name, { median, min: sorted[0], max: sorted.at(-1), samples: values }];
}));
console.log(JSON.stringify({ unit: "ms", iterations, results }, null, 2));
