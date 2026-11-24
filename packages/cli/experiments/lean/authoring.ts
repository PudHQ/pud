type Value = bigint | boolean | readonly bigint[];
declare const valueType: unique symbol;
declare const termType: unique symbol;

interface Schema<T extends Value> {
  readonly [valueType]: T;
}

interface LeanTerm {
  readonly [termType]: true;
}

interface IntSchema extends Schema<bigint> {
  eq(value: bigint): IntSchema;
  gt(value: bigint): IntSchema;
  gte(value: bigint): IntSchema;
  lt(value: bigint): IntSchema;
  lte(value: bigint): IntSchema;
  satisfies(term: LeanTerm): IntSchema;
}

interface BoolSchema extends Schema<boolean> {
  eq(value: boolean): BoolSchema;
  satisfies(term: LeanTerm): BoolSchema;
}

// Bun reads these declarations as syntax in a *.proof.ts file.
export declare const lean: {
  int(): IntSchema;
  bool(): BoolSchema;
  array(items: IntSchema): Schema<readonly bigint[]>;
  use(file: string): void;
  ref(name: string, ...args: Value[]): LeanTerm;
  inline(term: string, ...args: Value[]): LeanTerm;
};

export declare function describe(subject: (...args: never[]) => Value, suite: () => void): void;

export declare const it: {
  <D extends Record<string, Schema<Value>>>(
    name: string,
    inputs: D,
    property: (args: { [K in keyof D]: D[K][typeof valueType] }) => void,
  ): { by(proof: LeanTerm): void };
  todo(name: string): void;
};

export declare function given(condition: boolean): void;
export declare function expect<T extends Value>(value: T): { to(schema: Schema<NoInfer<T>>): void };
