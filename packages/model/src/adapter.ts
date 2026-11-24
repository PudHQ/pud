/** A construct for which the selected frontend or adapter has no semantics. */
export class Unsupported extends Error {}

export interface ReviewedProperty {
  file: string;
  source: string;
  expression: string;
  line: number;
  column: number;
  offset: number;
}

export interface SubjectSource {
  name: string;
  file: string;
  source: string;
  /** Read a UTF-8 model input, relative to the subject's directory or by absolute path.
   * During a check the first read is shared across the batch and changes invalidate dependent results. */
  readDependency?(path: string): string;
  /** Read a linked source with its canonical location and track any import resolution that selected it. */
  readModule?(path: string, resolveAgain?: () => string): { canonical: string; source: string };
}

export interface Counterexample {
  summary: string;
  input: Record<string, string>;
  result: string;
  difference?: { subject: string; expected: string; received: string };
}

export interface Predicate<Observation, Claim> {
  claim: Claim;
  violation(observation: Observation): Counterexample | undefined;
}

/** The same method is checked against each reviewed predicate. A true visitor result ends replay. */
export interface PreparedSubject<Observation, Model, Claim, Input = never> {
  model: Model;
  bind(property: ReviewedProperty): Predicate<Observation, Claim>;
  replay(visit: (observation: Observation) => boolean): void | Promise<void>;
  /** Execute a candidate input on the same implementation used for ordinary replay. */
  observe?(input: Input): Observation | undefined | Promise<Observation | undefined>;
}

export interface ProofBackend<Model, Claim, Input = never> {
  emit(model: Model, claim: Claim): string;
  verify(model: Model, claims: readonly Claim[], suggest?: (index: number, input: Input) => void): Promise<readonly boolean[]>;
}

export interface DomainAdapter<Observation, Model, Claim, Input = never> {
  backend: ProofBackend<Model, Claim, Input>;
  prepare(subject: SubjectSource): PreparedSubject<Observation, Model, Claim, Input> | Promise<PreparedSubject<Observation, Model, Claim, Input>>;
}
