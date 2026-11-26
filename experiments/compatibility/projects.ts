type Domain = "bigint" | "number" | "year" | "timestamp" | "middlewareCount";

interface InputDomain {
  type: "number" | "bigint";
  integerRange?: readonly [min: number, max: number];
}

export const domains: Record<Domain, InputDomain> = {
  bigint: { type: "bigint" }, number: { type: "number" },
  year: { type: "number", integerRange: [100, 9999] },
  timestamp: { type: "number", integerRange: [-8.64e15, 8.64e15] },
  middlewareCount: { type: "number", integerRange: [0, 32] },
};

export function schemaFor(domain: InputDomain) {
  const schema = "pud." + domain.type + "()";
  const range = domain.integerRange;
  return range ? schema + ".gte(" + range[0] + ").lte(" + range[1] + ").refine(x => Number.isInteger(x))" : schema;
}

export function admits(domain: InputDomain, value: unknown) {
  if (typeof value !== domain.type) return false;
  const range = domain.integerRange;
  return !range || (typeof value === "number" && Number.isInteger(value) && value >= range[0] && value <= range[1]);
}

type Input = readonly [name: string, domain: Domain];
export interface Target {
  name: string;
  file: string;
  law: string;
  inputs: readonly [Input, ...Input[]];
  /** The same observation is quantified by Pud and exercised by the native controls. */
  body: string;
  controls: readonly [string, string, ...string[]];
  extraImport?: string;
  async?: boolean;
}

export interface Project {
  repo: string;
  revision: string;
  sha256: string;
  targets: Target[];
}

export const profile = "drop-in-v2";
export const projects: Project[] = [
  {
    repo: "juanelas/bigint-mod-arith", revision: "8f97d626a5bf53e0ea27d4e983250075ab4abde5",
    sha256: "c8abe4fe082182ca0c6f13fde1bec410bbfe820fa91ccfa53791292d5f466692",
    targets: [
      { name: "abs", file: "src/ts/abs.ts", law: "Absolute value has the correct magnitude for every bigint.",
        inputs: [["a", "bigint"]], body: "return target(a) === (a < 0n ? -a : a);", controls: ["-7n", "0n", "13n"] },
      { name: "max", file: "src/ts/max.ts", law: "Maximum selects the greater of any two bigints.",
        inputs: [["a", "bigint"], ["b", "bigint"]], body: "return target(a, b) === (a >= b ? a : b);", controls: ["-2n, -1n", "4n, 2n", "0n, 0n"] },
    ],
  },
  {
    repo: "date-fns/date-fns", revision: "313b902b9a72c64501074db9bc2b9897d2db5140",
    sha256: "f35721c15c3f82b8a51b84e211b0e91364d24740e6ae82e07261c012a7240e86",
    targets: [
      { name: "isLeapYear", file: "src/isLeapYear/index.ts", law: "For each calendar year from 100 through 9999, a leap year has a February 29.",
        inputs: [["year", "year"]], body: "return target(new Date(year, 1, 1)) === (new Date(year, 1, 29).getMonth() === 1);",
        controls: ["1900", "2000", "2023", "2024"] },
      { name: "clamp", file: "src/clamp/index.ts", law: "Every valid timestamp inside a closed interval stays put. Outside it, the nearest endpoint wins.",
        inputs: [["time", "timestamp"], ["a", "timestamp"], ["b", "timestamp"]],
        body: `const start = Math.min(a, b), end = Math.max(a, b);
  const result = target(new Date(time), { start: new Date(start), end: new Date(end) });
  return result.getTime() === (time < start ? start : time > end ? end : time);`, controls: ["5, 10, 20", "15, 20, 10", "25, 10, 20", "-4, -4, -4"] },
    ],
  },
  {
    repo: "TanStack/query", revision: "18b1aded329058c074cda6b1c1a08aba73fdc914",
    sha256: "858530e9327e3ed9f57050982bd878d90cb68a16b50c300812757c4646a14f57",
    targets: [
      { name: "functionalUpdate", file: "packages/query-core/src/utils.ts", law: "An updater receives the previous number exactly once and its return value becomes the new value.",
        inputs: [["previous", "number"], ["replacement", "number"]],
        body: `let calls = 0, receivedPrevious = false;
  const result = target((value: number) => {
    calls++;
    receivedPrevious = Object.is(value, previous);
    return replacement;
  }, previous);
  return calls === 1 && receivedPrevious && Object.is(result, replacement);`, controls: ["3, 4", "-0, NaN", "NaN, -0"] },
      { name: "hashKey", file: "packages/query-core/src/utils.ts", law: "Reordering the two numeric fields of a query key preserves its hash for every pair of values.",
        inputs: [["account", "number"], ["page", "number"]], body: "return target([{ account, page }]) === target([{ page, account }]);",
        controls: ["1, 2", "-3, 0.5", "NaN, -0"] },
    ],
  },
  {
    repo: "honojs/hono", revision: "9c2f2948498434506f9ebc77a213bf67a2da5603",
    sha256: "671bfcf836225067442b0b9e9ed5ced25ed0cf14cb6daae6d8d10078f6425e92",
    targets: [
      { name: "getPath", file: "src/utils/url.ts", law: "An order route retains its numeric ID and drops the query for every numeric page value.",
        inputs: [["id", "number"], ["page", "number"]],
        body: 'const path = "/orders/" + id;\n  return target(new Request("https://example.test" + path + "?page=" + page)) === path;',
        controls: ["1, 2", "-2.5, 10", "1e25, NaN"] },
      { name: "compose", file: "src/compose.ts", law: "For each length from 0 to 32, the chain runs forwarding middleware in order, calls the terminal handler once and returns its context.",
        inputs: [["count", "middlewareCount"]], extraImport: 'import { Context } from "../src/context.ts";', async: true,
        body: `const context = new Context(new Request("https://example.test/"));
  const visited: number[] = [];
  let terminalCalls = 0;
  const middleware = Array.from({ length: count }, (_, index): [[(_context: Context, next: () => Promise<void>) => Promise<void>]] => [[async (_context, next) => {
    visited.push(index);
    await next();
  }]]);
  const result = await target(middleware)(context, async () => { terminalCalls++; });
  return result === context && terminalCalls === 1 && visited.length === count && visited.every((value, index) => value === index);`,
        controls: ["0", "1", "4", "32"] },
    ],
  },
];
