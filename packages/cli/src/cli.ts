#!/usr/bin/env bun
import { relative } from "node:path";
import chalk, { chalkStderr } from "chalk";
import { readManifest, type ProofDefinition } from "./manifest.ts";
import { checkProof, ProofFailure } from "./rocq.ts";
import { translate, subjectModule } from "./translate.ts";

if (process.env.NO_COLOR) {
  chalk.level = 0;
  chalkStderr.level = 0;
}

const synopsis = `Usage: pud [--verbose] FILE.proof.ts [MORE.proof.ts ...]
       pud --emit FILE.proof.ts [SUBJECT]`;
const usage = `${synopsis}

Check each TypeScript function against its linked Rocq theorem.
--emit     Print one Subject.v. Pass the imported name for a file with several subjects.
--verbose  Show the full Rocq diagnostic.
Exit: 0 verified, 1 proof rejected, 2 invalid input or tool error.`;

function resultLine(status: "PASS" | "FAIL" | "ERROR", file: string, proof?: ProofDefinition) {
  const passed = status === "PASS";
  const color = passed ? chalk : chalkStderr;
  const badge = passed ? `🍮 ${color.bold.green(status)}` : `🦠 ${color.bold.red(status)}`;
  const target = proof ? `${proof.subject} vs ${proof.spec}  ${color.dim(file)}` : file;
  return `${badge}  ${target}`;
}

function diagnostic(error: unknown, proof: ProofDefinition | undefined, verbose: boolean) {
  const message = error instanceof Error ? error.message : String(error);
  if (verbose || !(error instanceof ProofFailure) || !proof) return message;

  // Compact Rocq's standard source diagnostic. Preserve unfamiliar formats verbatim.
  const match = /^File ("[^\n]+"), line (\d+), characters \d+-\d+:\r?\nError:\s*([\s\S]+)/m.exec(message);
  if (!match || match[1] !== JSON.stringify(proof.proof)) return message;
  const location = `${relative(process.cwd(), proof.proof)}:${match[2]}`;
  const reason = match[3]!.replace(/^In environment\r?\n(?:[^\n]+ : [^\n]*\n)+(?=\S)/, "");
  return `${chalkStderr.dim(location)}  ${reason}`;
}

function reportError(error: unknown, file: string, verbose: boolean, proof?: ProofDefinition) {
  const rejected = error instanceof ProofFailure;
  const header = resultLine(rejected ? "FAIL" : "ERROR", file, proof);
  const reason = diagnostic(error, proof, verbose).replaceAll("\n", "\n   ");
  process.stderr.write(`${header}\n   ${reason}\n`);
  return rejected ? 1 : 2;
}

function selectSubject(definitions: ProofDefinition[], name?: string): ProofDefinition {
  const subjects = new Map(definitions.map(proof => [proof.binding, proof]));
  if (name === undefined && subjects.size === 1) return definitions[0]!;
  const match = name === undefined ? undefined : subjects.get(name);
  if (match) return match;
  const problem = name === undefined ? "Select a subject for --emit." : `Unknown subject '${name}'.`;
  throw new Error(`${problem} Available subjects: ${[...subjects.keys()].join(", ")}.`);
}

function main(args: string[]) {
  if (args.length === 1 && ["-h", "--help"].includes(args[0]!)) {
    console.log(usage);
    return 0;
  }
  const emit = args[0] === "--emit";
  const verbose = args[0] === "--verbose";
  const operands = emit || verbose ? args.slice(1) : args;
  if (!operands.length || operands.some(arg => arg.startsWith("-")) || (emit && operands.length > 2)) {
    process.stderr.write(`${resultLine("ERROR", synopsis)}\n`);
    return 2;
  }
  const files = emit ? operands.slice(0, 1) : operands;
  let status = 0;
  for (const file of files) {
    let definitions: ProofDefinition[];
    try {
      definitions = readManifest(file);
      if (emit) definitions = [selectSubject(definitions, operands[1])];
    } catch (error) {
      status = Math.max(status, reportError(error, file, verbose));
      continue;
    }
    for (const proof of definitions) {
      try {
        const model = translate(proof.source, proof.subject);
        if (emit) {
          process.stdout.write(subjectModule(model));
        } else {
          checkProof(proof, model);
          console.log(resultLine("PASS", file, proof));
        }
      } catch (error) {
        status = Math.max(status, reportError(error, file, verbose, proof));
      }
    }
  }
  return status;
}

process.exitCode = main(process.argv.slice(2));
