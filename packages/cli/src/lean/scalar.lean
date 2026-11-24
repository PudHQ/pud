import Std

namespace Pud.Scalar

inductive Kind where
  | integer
  | boolean

abbrev Value : Kind → Type
  | .integer => Int
  | .boolean => Bool

inductive Unary : Kind → Kind → Type where
  | neg : Unary .integer .integer
  | not : Unary .boolean .boolean
  | truthy : Unary .integer .boolean
  | shift (count : Nat) : Unary .integer .integer
  | mask (bits : Nat) : Unary .integer .integer

def Unary.apply : Unary i o → Value i → Value o
  | .neg, value => -value
  | .not, value => !value
  | .truthy, value => decide (value ≠ 0)
  | .shift count, value => value * (2 : Int) ^ count
  | .mask bits, value => value % (2 : Int) ^ bits

-- A mask of low bits selects from the finite two's-complement encoding.
def lowBits (value : Int) (bits : Nat) : Int :=
  Int.ofNat ((value % (2 : Int) ^ bits).toNat &&& ((2 : Nat) ^ bits - 1))

theorem lowBits_preservation (value : Int) (bits : Nat) :
    lowBits value bits = value % (2 : Int) ^ bits := by
  have positive : 0 < (2 : Int) ^ bits := Int.pow_pos (by decide)
  have nonneg := Int.emod_nonneg value (Int.ne_of_gt positive)
  have below := Int.emod_lt_of_pos value positive
  have bound : (value % (2 : Int) ^ bits).toNat < (2 : Nat) ^ bits := by
    apply (Int.toNat_lt nonneg).mpr
    rw [Int.natCast_pow]
    exact below
  simp [lowBits, Nat.mod_eq_of_lt bound, Int.toNat_of_nonneg nonneg]

def Unary.evaluate : Unary i o → Value i → Value o
  | .mask bits, value => lowBits value bits
  | op, value => op.apply value

theorem Unary.preservation (op : Unary i o) (value : Value i) :
    op.evaluate value = op.apply value := by
  cases op <;> simp [Unary.evaluate, Unary.apply, lowBits_preservation]

inductive Binary (ε : Type) : Kind → Kind → Type where
  | add : Binary ε .integer .integer
  | sub : Binary ε .integer .integer
  | mul : Binary ε .integer .integer
  | divide (zero : ε) : Binary ε .integer .integer
  | remainder (zero : ε) : Binary ε .integer .integer
  | lt : Binary ε .integer .boolean
  | lte : Binary ε .integer .boolean
  | gt : Binary ε .integer .boolean
  | gte : Binary ε .integer .boolean
  | equalInt : Binary ε .integer .boolean
  | equalBool : Binary ε .boolean .boolean

def Binary.lower : Binary ε i o → Value i → Value i → Except ε (Value o)
  | .add, lhs, rhs => .ok (lhs + rhs)
  | .sub, lhs, rhs => .ok (lhs - rhs)
  | .mul, lhs, rhs => .ok (lhs * rhs)
  | .divide zero, lhs, rhs => if rhs = 0 then .error zero else .ok (Int.tdiv lhs rhs)
  | .remainder zero, lhs, rhs => if rhs = 0 then .error zero else .ok (Int.tmod lhs rhs)
  | .lt, lhs, rhs => .ok (decide (lhs < rhs))
  | .lte, lhs, rhs => .ok (decide (lhs ≤ rhs))
  | .gt, lhs, rhs => .ok (decide (lhs > rhs))
  | .gte, lhs, rhs => .ok (decide (lhs ≥ rhs))
  | .equalInt, lhs, rhs => .ok (decide (lhs = rhs))
  | .equalBool, lhs, rhs => .ok (decide (lhs = rhs))

-- ECMAScript BigInt division truncates the exact quotient toward zero.
def quotient (lhs rhs : Int) : Int :=
  let magnitude : Int := Int.ofNat (lhs.natAbs / rhs.natAbs)
  if (lhs < 0) ↔ (rhs < 0) then magnitude else -magnitude

theorem quotient_eq_tdiv (lhs rhs : Int) : quotient lhs rhs = lhs.tdiv rhs := by
  cases lhs <;> cases rhs <;> simp [quotient, Int.tdiv, Int.natAbs, Int.not_lt.mpr (Int.ofNat_nonneg _)]

-- ECMAScript BigInt remainder subtracts the divisor times the truncated quotient.
theorem remainder_eq_tmod (lhs rhs : Int) :
    lhs - rhs * lhs.tdiv rhs = lhs.tmod rhs := by
  have := Int.tmod_add_tdiv lhs rhs
  omega

def Binary.evaluate : Binary ε i o → Value i → Value i → Except ε (Value o)
  | .divide zero, lhs, rhs => if rhs = 0 then .error zero else .ok (quotient lhs rhs)
  | .remainder zero, lhs, rhs => if rhs = 0 then .error zero else .ok (lhs - rhs * quotient lhs rhs)
  | op, lhs, rhs => op.lower lhs rhs

theorem Binary.preservation (op : Binary ε i o) (lhs rhs : Value i) :
    op.evaluate lhs rhs = op.lower lhs rhs := by
  cases op <;> simp [Binary.evaluate, Binary.lower, quotient_eq_tdiv, remainder_eq_tmod]

inductive Expr (ε : Type) : Kind → Type where
  | integer (value : Int) : Expr ε .integer
  | boolean (value : Bool) : Expr ε .boolean
  | unary (op : Unary i o) (arg : Expr ε i) : Expr ε o
  | binary (op : Binary ε i o) (lhs rhs : Expr ε i) : Expr ε o
  | choose (test : Expr ε .boolean) (yes no : Expr ε o) : Expr ε o
  | and (lhs rhs : Expr ε .boolean) : Expr ε .boolean
  | or (lhs rhs : Expr ε .boolean) : Expr ε .boolean
  | bind (arg : Expr ε i) (next : Value i → Expr ε o) : Expr ε o
  | thrown (error : ε) : Expr ε o
  | handle (attempt recovery : Expr ε o) : Expr ε o

-- Explicit evaluation order and abrupt completion on the source side.
def evaluate : Expr ε o → Except ε (Value o)
  | .integer value => .ok value
  | .boolean value => .ok value
  | .unary op arg =>
    match evaluate arg with
    | .error error => .error error
    | .ok value => .ok (op.evaluate value)
  | .binary op lhs rhs =>
    match evaluate lhs with
    | .error error => .error error
    | .ok left =>
      match evaluate rhs with
      | .error error => .error error
      | .ok right => op.evaluate left right
  | .choose test yes no =>
    match evaluate test with
    | .error error => .error error
    | .ok value => if value then evaluate yes else evaluate no
  | .and lhs rhs =>
    match evaluate lhs with
    | .error error => .error error
    | .ok value => if value then evaluate rhs else .ok false
  | .or lhs rhs =>
    match evaluate lhs with
    | .error error => .error error
    | .ok value => if value then .ok true else evaluate rhs
  | .bind arg next =>
    match evaluate arg with
    | .error error => .error error
    | .ok value => evaluate (next value)
  | .thrown error => .error error
  | .handle attempt recovery =>
    match evaluate attempt with
    | .ok value => .ok value
    | .error _ => evaluate recovery

-- Target denotation using the primitives and Except sequencing of the emitter.
def lower : Expr ε o → Except ε (Value o)
  | .integer value => .ok value
  | .boolean value => .ok value
  | .unary op arg => (lower arg).bind fun value => .ok (op.apply value)
  | .binary op lhs rhs => (lower lhs).bind fun left => (lower rhs).bind fun right => op.lower left right
  | .choose test yes no => (lower test).bind fun value => if value then lower yes else lower no
  | .and lhs rhs => (lower lhs).bind fun value => if value then lower rhs else .ok false
  | .or lhs rhs => (lower lhs).bind fun value => if value then .ok true else lower rhs
  | .bind arg next => (lower arg).bind fun value => lower (next value)
  | .thrown error => .error error
  | .handle attempt recovery =>
    match lower attempt with
    | .ok value => .ok value
    | .error _ => lower recovery

@[simp] theorem bind_ok {ε α β : Type} (value : α) (next : α → Except ε β) :
    (Except.ok value).bind next = next value := rfl

@[simp] theorem bind_error {ε α β : Type} (error : ε) (next : α → Except ε β) :
    (Except.error error : Except ε α).bind next = .error error := rfl

@[simp] theorem bind_return {ε α : Type} (value : Except ε α) :
    value.bind Except.ok = value := by cases value <;> rfl

@[simp] theorem bind_if {ε α β : Type} (test : Prop) [Decidable test]
    (yes no : Except ε α) (next : α → Except ε β) :
    (if test then yes else no).bind next = if test then yes.bind next else no.bind next := by
  by_cases h : test <;> simp [h]

theorem preservation (expression : Expr ε o) :
    evaluate expression = lower expression := by
  induction expression <;> simp [evaluate, lower, Except.bind, Unary.preservation, Binary.preservation, *]
  all_goals (repeat' (split <;> try simp_all))

end Pud.Scalar
