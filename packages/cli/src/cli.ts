#!/usr/bin/env bun
import { relative } from "node:path";
import chalk, { chalkStderr } from "chalk";
import { findCounterexample, formatValue } from "./counterexample.ts";
import { readManifest, type ProofDefinition } from "./manifest.ts";
import { checkProof, ProofFailure } from "./rocq.ts";
import { translate, subjectModule } from "./translate.ts";

if (process.env.NO_COLOR) {
  chalk.level = 0;
  chalkStderr.level = 0;
}

const synopsis = `Usage: pud [--verbose] FILE.proof.ts [MORE.proof.ts ...]
       pud --emit FILE.proof.ts [SUBJECT[.THEOREM]]`;
const usage = `${synopsis}

Check a reviewed TypeScript property or a linked Rocq specification.
--emit     Print one Subject.v, including the claim the proof must establish.
--verbose  Show the full Rocq diagnostic.
Exit: 0 all proved, 1 unproved or disproved, 2 invalid input or tool error.`;

function resultLine(status: "PASS" | "UNPROVED" | "DISPROVED" | "ERROR", file: string, proof?: ProofDefinition) {
  const passed = status === "PASS";
  const color = passed ? chalk : chalkStderr;
  const badge = passed ? `🍮 ${color.bold.green(status)}` : `🦠 ${color.bold.red(status)}`;
  let target = file;
  if (proof?.property) {
    const line = proof.property.node.loc?.start.line;
    target = `${proof.subject}  ${color.dim(line ? `${file}:${line}` : file)}`;
  } else if (proof) {
    target = `${proof.subject} vs ${proof.spec}  ${color.dim(file)}`;
  }
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
  const header = resultLine(rejected ? "UNPROVED" : "ERROR", file, proof);
  const reason = diagnostic(error, proof, verbose).replaceAll("\n", "\n   ");
  const context = rejected && proof?.property ? "   No counterexample found in the sample. The proof did not establish this property.\n" : "";
  process.stderr.write(`${header}\n${context}   ${reason}\n`);
  return rejected ? 1 : 2;
}

function selectSubject(definitions: ProofDefinition[], name?: string): ProofDefinition {
  const subjects = [...new Set(definitions.map(proof => proof.binding))];
  const matches = definitions.filter(p => name === undefined || name === p.binding || name === `${p.binding}.${p.theorem}`);
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1 && new Set(matches.map(p => p.binding)).size === 1) {
    // Legacy references all use the same generated implementation and agreement relation.
    if (matches.every(p => !p.property)) return matches[0]!;
    const choices = matches.map(p => `${p.binding}.${p.theorem}`).join(", ");
    throw new Error(`Select a single property for --emit. Available: ${choices}. Use distinct theorem names per subject to select individually.`);
  }
  const problem = name === undefined ? "Select a subject for --emit." : `Unknown subject or theorem '${name}'.`;
  throw new Error(`${problem} Available subjects: ${subjects.join(", ")}.`);
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
        const model = translate(proof.source, proof.subject, proof.property);
        if (emit) {
          process.stdout.write(subjectModule(model));
          continue;
        }
        const witness = findCounterexample(model);
        if (witness) {
          const invocation = `${proof.binding}(${witness.args.map(formatValue).join(", ")})`;
          const header = resultLine("DISPROVED", file, proof);
          process.stderr.write(`${header}\n   ${invocation} returned ${formatValue(witness.result)}. The property evaluated to false.\n`);
          status = Math.max(status, 1);
          continue;
        }
        checkProof(proof, model);
        console.log(resultLine("PASS", file, proof));
      } catch (error) {
        status = Math.max(status, reportError(error, file, verbose, proof));
      }
    }
  }
  return status;
}

process.exitCode = main(process.argv.slice(2));
