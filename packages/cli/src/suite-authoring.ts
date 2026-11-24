import type { ProofAssistant } from "@pud/model/assistant";

type Value = bigint | boolean | string | readonly unknown[];
type Subject = (...args: never[]) => Value;
declare const valueType: unique symbol;
declare const assistantType: unique symbol;
declare const nativeType: unique symbol;

export interface Schema<T, Id extends string = never> {
  readonly [valueType]: T;
  readonly [assistantType]: Id;
}

export interface NativeTerm<Id extends string> {
  readonly [nativeType]: { kind: "term"; id: (id: Id) => Id };
}

export interface NativeModule<Id extends string> {
  readonly [nativeType]: { kind: "module"; id: (id: Id) => Id };
  readonly path: string;
}

export interface NativeSyntax<Id extends string> {
  (parts: TemplateStringsArray, ...args: Value[]): NativeTerm<Id>;
  ref(name: string, ...args: Value[]): NativeTerm<Id>;
  module(path: string): NativeModule<Id>;
}

interface BigIntSchema<Id extends string> extends Schema<bigint, Id> {
  eq(value: bigint): BigIntSchema<Id>;
  gt(value: bigint): BigIntSchema<Id>;
  gte(value: bigint): BigIntSchema<Id>;
  lt(value: bigint): BigIntSchema<Id>;
  lte(value: bigint): BigIntSchema<Id>;
  satisfies(term: NativeTerm<Id>): BigIntSchema<Id>;
}

interface BooleanSchema<Id extends string> extends Schema<boolean, Id> {
  eq(value: boolean): BooleanSchema<Id>;
  satisfies(term: NativeTerm<Id>): BooleanSchema<Id>;
}

interface ArraySchema<T, Id extends string> extends Schema<readonly T[], Id> {
  satisfies(term: NativeTerm<Id>): ArraySchema<T, Id>;
}

interface SchemaBuilders<Id extends string> {
  bigint(): BigIntSchema<Id>;
  boolean(): BooleanSchema<Id>;
  int(): BigIntSchema<Id>;
  bool(): BooleanSchema<Id>;
  opaque<T>(): Schema<T, Id>;
  array<T>(items: Schema<T, Id>): ArraySchema<T, Id>;
  textOrArray<T>(items: Schema<T, Id>): Schema<string | readonly T[], Id>;
}

interface SuiteAuthoring<Id extends string> {
  pud: SchemaBuilders<Id>;
  it: {
    <D extends Record<string, Schema<Value, Id>>>(
      name: string,
      inputs: D,
      property: (args: { [K in keyof D]: D[K][typeof valueType] }) => void,
    ): { by(proof: NativeTerm<Id>): void };
    todo(name: string): void;
  };
  given(condition: boolean): void;
  expect<T extends Value>(value: T): { to(schema: Schema<NoInfer<T>, Id>): void };
  use(module: NativeModule<Id>): void;
}

export interface PudConfig<Id extends string = string> extends SchemaBuilders<Id> {
  adapter: ProofAssistant<Id>;
  describe(subject: Subject, suite: (helpers: SuiteAuthoring<Id>) => void): void;
}

function sourceOnly(): never {
  throw new Error("Pud reads proof declarations from *.proof.ts source. Run pud check.");
}

const schemaBuilders = {
  bigint: sourceOnly, boolean: sourceOnly, int: sourceOnly, bool: sourceOnly,
  opaque: sourceOnly, array: sourceOnly, textOrArray: sourceOnly,
};
export const pud: SchemaBuilders<never> = schemaBuilders;
export const it: SuiteAuthoring<never>["it"] = Object.assign(sourceOnly.bind(undefined), { todo: sourceOnly });
export const given: SuiteAuthoring<never>["given"] = sourceOnly;
export const expect: SuiteAuthoring<never>["expect"] = sourceOnly;
export const describe: (subject: Subject, suite: () => void) => void = sourceOnly;

/** A static tag for an adapter's native proof text. */
export function native<const Id extends string>(_id: Id): NativeSyntax<Id> {
  return Object.assign(sourceOnly.bind(undefined), { ref: sourceOnly, module: sourceOnly });
}

export function defineConfig<const Id extends string>(config: { adapter: ProofAssistant<Id> }): PudConfig<Id> {
  return { ...schemaBuilders, ...config, describe: sourceOnly };
}
