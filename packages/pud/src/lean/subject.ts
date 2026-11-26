import { getOuterBindingIdentifiers, traverseFast, type ArrowFunctionExpression, type AssignmentExpression, type FunctionDeclaration, type Node, type Program, type Statement } from "@babel/types";
import { invalid } from "../source.ts";
import { scalarSource } from "./scalar.ts";
import { asOutcome, bigintLiteral, errorKinds, invoke, isScalar, leanTypes, nameOf, ofSort, readValue, sequence, tsSort, type ExecutableExpressions, type Sort, type Value } from "./syntax.ts";

type Binding = Value & { mutable?: boolean };
export type Parameter = Value & { name: string };

export interface Subject {
  file: string;
  name: string;
  code: string;
  params: Parameter[];
  result: Sort;
  itemType?: string;
  definition: string;
  fallible: boolean;
  countdown: boolean;
  fold: boolean;
  loopConformance: readonly { name: string; definition: string }[];
  recursive: boolean;
  callees: ReadonlySet<Subject>;
  sourceExpression?: string;
}

function exits(node: Node | undefined): boolean {
  switch (node?.type) {
    case "ReturnStatement":
    case "ThrowStatement": return true;
    case "BlockStatement": return exits(node.body.at(-1));
    case "IfStatement": return exits(node.consequent) && exits(node.alternate ?? undefined);
    case "TryStatement": return !!node.handler && exits(node.block) && exits(node.handler.body);
    default: return false;
  }
}

function tuple(parts: string[]): string {
  return parts.length === 1 ? parts[0]! : `(${parts.join(", ")})`;
}

function singleStatement(node: Statement): Statement {
  return node.type === "BlockStatement" && node.body.length === 1 ? node.body[0]! : node;
}

function localUpdate(node: Statement): AssignmentExpression | undefined {
  const statement = singleStatement(node);
  if (statement.type === "ExpressionStatement" && statement.expression.type === "AssignmentExpression" &&
      statement.expression.left.type === "Identifier") return statement.expression;
}

function truthy(value: Value, code: string) {
  return value.sort === "integer" ? `(decide (${code} ≠ (0 : Int)))` : code;
}

export function lowerFunction(
  file: string, program: Program, fn: FunctionDeclaration | ArrowFunctionExpression, symbol: string, code: string,
  resolveCall: (name: string, at: Node) => Subject,
): Subject {
  if (fn.async || fn.generator || fn.typeParameters) invalid(file, fn, "Expected a synchronous, non-generic function.");
  const interfaces = new Set(program.body.flatMap(statement => {
    const node = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    return node?.type === "TSInterfaceDeclaration" && !node.typeParameters ? [node.id.name] : [];
  }));
  let itemType: string | undefined;
  function sort(annotation: Node | null | undefined, at: Node) {
    return tsSort(file, annotation, at, (name, node) => {
      if (!interfaces.has(name) || (itemType && itemType !== name)) {
        invalid(file, node, "Use one locally declared interface as the opaque array element type.");
      }
      itemType = name;
    });
  }
  const result = sort(fn.returnType, fn);
  if (result === "textOrItems") invalid(file, fn, "Return a scalar or a supported readonly array.");
  const params = fn.params.map((node, i) => ({
    name: nameOf(file, node),
    sort: sort(node.type === "Identifier" ? node.typeAnnotation : undefined, node),
    code: `p${i}`,
  }));
  const scope = new Map<string, Binding>(params.map(p => [p.name, p]));
  const moduleNames = new Set(program.body.flatMap(node => Object.keys(getOuterBindingIdentifiers(node))));
  const localNames = new Set(scope.keys());
  let recursive = false;
  traverseFast(fn.body, node => {
    if (node.type === "VariableDeclarator") for (const name of Object.keys(getOuterBindingIdentifiers(node.id))) localNames.add(name);
    if (node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === symbol) recursive = true;
  });
  const signature = [itemType && "{Item : Type}", ...params.map(p => `(${p.code} : ${leanTypes[p.sort]})`)].filter(Boolean);

  let nextLocal = 0;
  const fresh = () => `v${nextLocal++}`;
  const lines: string[] = [];
  let arrayGuard: Node | undefined;
  let fallible = false;
  let countdown = false;
  let fold = false;
  const loopConformance: Subject["loopConformance"][number][] = [];
  const callTargets = new Map<string, Subject>();
  const executable: ExecutableExpressions = {
    fresh, recursive,
    call(node, read) {
      if (node.typeArguments || node.callee.type !== "Identifier" || localNames.has(node.callee.name)) {
        invalid(file, node, "Call a directly declared function without shadowing its name.");
      }
      const linked = node.callee.name === symbol ? undefined : resolveCall(node.callee.name, node);
      const callee = linked ?? { params, result, itemType, code, fallible: false };
      if (callee.itemType || node.arguments.length !== callee.params.length) {
        invalid(file, node, "Call a supported function with its exact argument count and types.");
      }
      if (linked) callTargets.set(node.callee.name, linked);
      const args = node.arguments.map((arg, index) => {
        const value = read(arg);
        ofSort(file, arg, value, callee.params[index]!.sort);
        return value;
      });
      return invoke(callee, args, fresh);
    },
  };
  const read = (node: Node, bindings: ReadonlyMap<string, Binding>) => readValue(file, node, bindings, undefined, executable);

  function returned(node: Node, bindings: ReadonlyMap<string, Binding>): Value {
    if (node.type === "ArrayExpression" && !node.elements.length && !isScalar(result)) return { sort: result, code: "[]" };
    const value = read(node, bindings);
    ofSort(file, node, value, result);
    return value;
  }

  function assignment(node: AssignmentExpression, bindings: ReadonlyMap<string, Binding>) {
    const name = nameOf(file, node.left);
    const binding = bindings.get(name);
    if (!binding?.mutable || !isScalar(binding.sort)) invalid(file, node.left, "Only scalar let bindings can be assigned.");
    const rhs = read(node.right, bindings);
    ofSort(file, node.right, rhs, binding.sort);
    if (node.operator === "=") return { name, binding, rhs };
    if (binding.sort === "integer" && (node.operator === "+=" || node.operator === "-=")) {
      return { name, binding, rhs: sequence([rhs], fresh, ([value]) => ({
        sort: "integer", code: `(${binding.code} ${node.operator[0]} ${value})`,
      })) };
    }
    return invalid(file, node, `Unsupported assignment '${node.operator}'.`);
  }

  function line(indent: number, code: string) { lines.push(" ".repeat(indent) + code); }

  function force(value: Value, indent: number) {
    if (!value.fallible) return value.code;
    fallible = true;
    const name = fresh();
    line(indent, `let ${name} ← ${value.code}`);
    return name;
  }

  function certifyGuardedUpdate(
    node: Extract<Statement, { type: "IfStatement" }>, bindings: ReadonlyMap<string, Binding>, item: string, itemCode: string,
  ) {
    if (recursive || arrayGuard === node.test) return;
    const yes = localUpdate(node.consequent);
    const no = node.alternate && localUpdate(node.alternate);
    if (yes?.left.type !== "Identifier" || (node.alternate && !no)) return;
    const target = yes.left.name;
    const accumulator = bindings.get(target);
    if (!accumulator?.mutable || !isScalar(accumulator.sort) ||
        (no && (no.left.type !== "Identifier" || no.left.name !== target))) return;

    const state = fresh();
    const scope = new Map(bindings);
    scope.set(target, { ...accumulator, code: state });
    const test = read(node.test, scope);
    const updated = assignment(yes, scope).rhs;
    const otherwise = no ? assignment(no, scope).rhs : { sort: accumulator.sort, code: state };
    if (test.fallible || updated.fallible || otherwise.fallible) return;
    const guard = truthy(test, test.code);

    function delta(update: AssignmentExpression) {
      const { operator, right } = update;
      if (operator === "+=" || operator === "-=") return { operator: operator[0], code: read(right, scope).code };
      if (operator === "=" && right.type === "BinaryExpression" && (right.operator === "+" || right.operator === "-") &&
          right.left.type === "Identifier" && right.left.name === target) {
        return { operator: right.operator, code: read(right.right, scope).code };
      }
    }

    // Match the fold used by an assignment with a conditional operand. Lean
    // checks the step equality, including the identity update on a skipped arm.
    let step = `(if ${guard} then ${updated.code} else ${otherwise.code})`;
    const taken = delta(yes), skipped = no && delta(no);
    if (taken && (!no || skipped?.operator === taken.operator)) {
      step = `(${state} ${taken.operator} (if ${guard} then ${taken.code} else ${skipped?.code ?? "(0 : Int)"}))`;
    }

    const used = new Set<string>();
    for (const expression of [node.test, yes.right, no?.right]) {
      if (expression) traverseFast(expression, child => { if (child.type === "Identifier") used.add(child.name); });
    }
    const captured = [...bindings].filter(([name]) => name !== target && name !== item && used.has(name));
    const parameters = captured.map(([, value]) => `(${value.code} : ${leanTypes[value.sort]})`);
    if (captured.some(([, value]) => value.sort === "items" || value.sort === "textOrItems")) parameters.unshift("{Item : Type}");
    const name = `${code}Loop${loopConformance.length}Conforms`;
    loopConformance.push({ name, definition: `theorem ${[name, ...parameters].join(" ")}
    (values : List Int) (initial : ${leanTypes[accumulator.sort]}) :
    forIn (m := Id) values initial (fun ${itemCode} ${state} =>
      if ${guard} then ForInStep.yield (${updated.code}) else ForInStep.yield (${otherwise.code})) =
    values.foldl (fun ${state} ${itemCode} => ${step}) initial := by
  apply forIn_foldl_of_step_eq
  intro ${itemCode} ${state}
  by_cases h : (${guard}) = true <;> simp only [h, Bool.false_eq_true, if_true, if_false, Int.add_zero, Int.sub_zero]` });
  }

  function emitArrayGuard(node: Extract<Statement, { type: "IfStatement" }>, bindings: Map<string, Binding>, indent: number, inLoop: boolean) {
    const test = node.test;
    if (test.type !== "CallExpression" || test.callee.type !== "MemberExpression" || test.callee.computed ||
        test.callee.object.type !== "Identifier" || test.callee.object.name !== "Array" ||
        test.callee.property.type !== "Identifier" || test.callee.property.name !== "isArray") return false;
    if (test.typeArguments || test.arguments.length !== 1) invalid(file, test, "Pass one named union value to Array.isArray.");
    const name = nameOf(file, test.arguments[0]);
    const value = bindings.get(name);
    if (value?.sort !== "textOrItems") invalid(file, test, "Array.isArray expects a string-or-record-array binding.");
    arrayGuard = test;
    const narrowed = new Map(bindings), code = fresh();
    narrowed.set(name, { sort: "items", code });
    line(indent, `match ${value.code} with`);
    line(indent, `| some ${code} =>`);
    branch(node.consequent, narrowed, indent + 2, inLoop);
    line(indent, "| none =>");
    if (node.alternate) branch(node.alternate, bindings, indent + 2, inLoop);
    else line(indent + 2, "pure ()");
    return true;
  }

  function emitWhile(node: Extract<Statement, { type: "WhileStatement" }>, bindings: Map<string, Binding>, indent: number) {
    const { test, body } = node;
    const counter = test.type === "BinaryExpression" && (test.operator === ">" || test.operator === ">=") &&
      test.left.type === "Identifier" ? test.left.name : undefined;
    if (!counter || test.type !== "BinaryExpression" || body.type !== "BlockStatement") {
      invalid(file, node, "Use a braced while loop guarded by a decreasing bigint counter and a literal lower bound.");
    }
    const binding = bindings.get(counter);
    const bound = bigintLiteral(test.right);
    const last = body.body.at(-1);
    const assignment = last?.type === "ExpressionStatement" && last.expression.type === "AssignmentExpression" ? last.expression : undefined;
    const amount = assignment?.operator === "-=" && assignment.left.type === "Identifier" && assignment.left.name === counter
      ? bigintLiteral(assignment.right) : undefined;
    if (binding?.sort !== "integer" || !binding.mutable || bound === undefined || amount === undefined || amount <= 0n) {
      invalid(file, node, "A while loop needs a mutable bigint counter and a final counter -= positiveLiteral update.");
    }
    const statements = body.body.slice(0, -1);
    for (const child of statements) traverseFast(child, part => {
      if (part.type === "ReturnStatement" || part.type === "BreakStatement" || part.type === "ContinueStatement") {
        invalid(file, part, "Use a while body that reaches its counter update on every continuing path.");
      }
    });
    countdown = true;
    const limit = test.operator === ">=" ? bound - 1n : bound;
    const state = [...bindings].filter(([name, value]) => name !== counter && value.mutable);
    const stateValues = state.map(([, value]) => value.code);
    const nextCounter = fresh();
    const nextState = state.map(fresh);
    const counterArg = fresh(), stateArg = fresh();
    const loopScope = new Map(bindings);
    loopScope.set(counter, { ...binding, code: counterArg, mutable: false });
    line(indent, `let (${nextCounter}, ${state.length ? tuple(nextState) : "_"}) ← countdownWhile ${binding.code} (${limit} : Int) (${amount} : Int) (by decide)`);
    line(indent + 2, `(fun ${counterArg} ${stateArg} => do`);
    const stateInputs = state.map(fresh);
    if (state.length) line(indent + 4, `let ${tuple(stateInputs)} := ${stateArg}`);
    for (const [index, [name, value]] of state.entries()) {
      const code = fresh();
      line(indent + 4, `let mut ${code} := ${stateInputs[index]}`);
      loopScope.set(name, { ...value, code });
    }
    for (const child of statements) statement(child, loopScope, indent + 4, false);
    line(indent + 4, `return ${tuple(state.map(([name]) => loopScope.get(name)!.code))}) ${tuple(stateValues)}`);
    line(indent, `${binding.code} := ${nextCounter}`);
    for (const [index, original] of stateValues.entries()) line(indent, `${original} := ${nextState[index]}`);
  }

  function statement(node: Statement, bindings: Map<string, Binding>, indent: number, inLoop: boolean): void {
    switch (node.type) {
      case "EmptyStatement": return;
      case "ReturnStatement": {
        if (!node.argument) invalid(file, node, "Return a value.");
        line(indent, `return ${force(returned(node.argument, bindings), indent)}`);
        return;
      }
      case "ThrowStatement": {
        const value = node.argument;
        if (value.type !== "NewExpression" || value.callee.type !== "Identifier" || value.typeArguments ||
            !Object.hasOwn(errorKinds, value.callee.name) || moduleNames.has(value.callee.name) || localNames.has(value.callee.name) ||
            value.arguments.length > 1 || (value.arguments[0] && value.arguments[0].type !== "StringLiteral")) {
          invalid(file, value, "Throw an unshadowed Error, RangeError, or TypeError with an optional string literal.");
        }
        fallible = true;
        line(indent, `throw ErrorKind.${errorKinds[value.callee.name as keyof typeof errorKinds]}`);
        return;
      }
      case "TryStatement": {
        const [attempt] = node.block.body;
        if (!node.handler || node.handler.param || node.finalizer || node.block.body.length !== 1 || attempt?.type !== "ReturnStatement" || !attempt.argument) {
          invalid(file, node, "Use try { return expression } with an unbound catch and no finally.");
        }
        const value = returned(attempt.argument, bindings);
        const success = fresh();
        line(indent, `match (${asOutcome(value)} : Except ErrorKind (${leanTypes[result]})) with`);
        line(indent, `| .ok ${success} => return ${success}`);
        line(indent, "| .error _ =>");
        branch(node.handler.body, bindings, indent + 2, inLoop);
        return;
      }
      case "BreakStatement":
      case "ContinueStatement": {
        if (!inLoop || node.label) invalid(file, node, "Loop control must be unlabelled and inside a for-of loop.");
        line(indent, node.type === "BreakStatement" ? "break" : "continue");
        return;
      }
      case "VariableDeclaration": {
        if (node.kind !== "const" && node.kind !== "let") invalid(file, node, "Expected a const or let declaration.");
        for (const decl of node.declarations) {
          const name = nameOf(file, decl.id);
          if (!decl.init || bindings.has(name)) invalid(file, decl, "Expected a new, initialized binding.");
          const value = read(decl.init, bindings);
          if (!isScalar(value.sort)) invalid(file, decl, "Keep array and union inputs as named parameters.");
          if (decl.id.type === "Identifier" && decl.id.typeAnnotation) {
            ofSort(file, decl, value, tsSort(file, decl.id.typeAnnotation, decl));
          }
          const code = fresh(), mutable = node.kind === "let";
          const rhs = force(value, indent);
          bindings.set(name, { sort: value.sort, code, mutable });
          line(indent, `let ${mutable ? "mut " : ""}${code} := ${rhs}`);
        }
        return;
      }
      case "ExpressionStatement": {
        if (node.expression.type !== "AssignmentExpression") invalid(file, node, "Expected a local assignment.");
        const { binding, rhs } = assignment(node.expression, bindings);
        line(indent, `${binding.code} := ${force(rhs, indent)}`);
        return;
      }
      case "IfStatement": {
        if (emitArrayGuard(node, bindings, indent, inLoop)) return;
        const value = read(node.test, bindings);
        if (value.sort !== "integer") ofSort(file, node.test, value, "boolean");
        const test = truthy(value, force(value, indent));
        line(indent, `if ${recursive ? `_${fresh()} : ` : ""}${test} then`);
        branch(node.consequent, bindings, indent + 2, inLoop);
        if (node.alternate) {
          line(indent, "else");
          branch(node.alternate, bindings, indent + 2, inLoop);
        }
        return;
      }
      case "WhileStatement": emitWhile(node, bindings, indent); return;
      case "ForOfStatement": {
        const decl = node.left.type === "VariableDeclaration" && node.left.kind === "const" &&
          node.left.declarations.length === 1 ? node.left.declarations[0] : undefined;
        if (node.await || !decl || decl.init) invalid(file, node, "Expected a synchronous for (const item of values) loop.");
        const iterable = read(node.right, bindings);
        ofSort(file, node.right, iterable, "integers");
        const item = nameOf(file, decl.id), values = force(iterable, indent);
        if (bindings.has(item)) invalid(file, decl, "The loop item must have a new name.");
        const loopScope = new Map(bindings), itemCode = fresh();
        loopScope.set(item, { sort: "integer", code: itemCode });
        const update = localUpdate(node.body);
        if (update?.left.type === "Identifier") {
          const target = update.left.name, accumulator = bindings.get(target);
          if (accumulator?.mutable && accumulator.sort === "integer") {
            const stateCode = fresh();
            const { rhs } = assignment(update, new Map([...loopScope, [target, { ...accumulator, code: stateCode }]]));
            if (!rhs.fallible) {
              fold = true;
              const step = `(fun (${stateCode} ${itemCode} : Int) => ${rhs.code})`;
              line(indent, `${accumulator.code} := List.foldl ${step} ${accumulator.code} ${values}`);
              return;
            }
          }
        }
        line(indent, `for ${itemCode} in ${values} do`);
        branch(node.body, loopScope, indent + 2, true);
        const inner = singleStatement(node.body);
        if (inner.type === "IfStatement") certifyGuardedUpdate(inner, loopScope, item, itemCode);
        return;
      }
      default: invalid(file, node, `Unsupported statement '${node.type}' before the final return.`);
    }
  }

  function branch(node: Statement, bindings: ReadonlyMap<string, Binding>, indent: number, inLoop: boolean) {
    const inner = new Map(bindings);
    const statements = node.type === "BlockStatement" ? node.body : [node];
    emitStatements(statements, inner, indent, inLoop);
    const last = statements.at(-1);
    if (!exits(last) && last?.type !== "BreakStatement" && last?.type !== "ContinueStatement") line(indent, "pure ()");
  }

  function emitStatements(statements: readonly Statement[], bindings: Map<string, Binding>, indent: number, inLoop: boolean) {
    for (const [i, node] of statements.entries()) {
      // A guarded early return makes the following code the false branch. Expose
      // that fact explicitly so the termination proof sees the guard.
      if (recursive && node.type === "IfStatement" && !node.alternate && exits(node.consequent) && i < statements.length - 1) {
        statement({ ...node, alternate: { type: "BlockStatement", body: statements.slice(i + 1), directives: [] } },
          bindings, indent, inLoop);
        return;
      }
      statement(node, bindings, indent, inLoop);
    }
  }

  let body: string;
  if (fn.body.type === "BlockStatement") {
    if (!exits(fn.body)) invalid(file, fn.body, "The final statement must return a value or throw on every path.");
    emitStatements(fn.body.body, scope, 2, false);
    body = `${fallible ? " do" : " Id.run do"}\n${lines.join("\n")}`;
  } else {
    const value = returned(fn.body, scope);
    fallible = !!value.fallible;
    body = `\n  ${value.code}`;
  }
  if (arrayGuard && (moduleNames.has("Array") || localNames.has("Array"))) {
    invalid(file, arrayGuard, "Array.isArray requires an unshadowed Array built-in.");
  }
  const resultType = fallible ? `Except ErrorKind (${leanTypes[result]})` : leanTypes[result];
  let termination = "";
  if (recursive) {
    const measure = params.find(param => param.sort === "integer");
    if (!measure || fallible || countdown || itemType) {
      invalid(file, fn, "Direct recursion needs a pure body and a decreasing bigint parameter.");
    }
    termination = `\ntermination_by ${measure.code}.toNat\ndecreasing_by all_goals (simp_wf; try simp_all; omega)`;
  }
  const definition = `def ${[code, ...signature].join(" ")} : ${resultType} :=${body}${termination}`;
  return { file, name: symbol, code, params, result, itemType, definition, fallible, countdown, fold, loopConformance: fallible ? [] : loopConformance, recursive,
    callees: new Set(callTargets.values()), sourceExpression: scalarSource(fn.body, params, result, callTargets) };
}
