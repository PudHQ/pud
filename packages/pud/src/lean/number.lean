import Std

namespace Pud

-- The magnitude is the unsigned binary64 encoding with the sign bit removed.
-- Both zeros are representable. Scalar ECMAScript Number has one observable NaN.
inductive JSNumber where
  | nan
  | num (negative : Bool) (magnitude : Fin (0x7ff0000000000000 + 1))
  deriving DecidableEq, Repr

namespace JSNumber

private abbrev infBits : Nat := 0x7ff0000000000000
private abbrev hiddenBit : Nat := 2^52
private def pack (negative : Bool) (m : Nat) : JSNumber :=
  .num negative ⟨min m infBits, Nat.lt_succ_of_le (Nat.min_le_right ..)⟩

def ofBits (word : Nat) : JSNumber :=
  let m := word % 2^63
  if m > infBits then .nan else pack (word.testBit 63) m

def toBits : JSNumber → Nat
  | .nan => 0x7ff8000000000000
  | .num s m => (if s then 2^63 else 0) + m.val

def neg : JSNumber → JSNumber
  | .nan => .nan
  | .num s m => .num (!s) m

def isNaN : JSNumber → Bool
  | .nan => true
  | .num .. => false

def isZero : JSNumber → Bool
  | .nan => false
  | .num _ m => m.val == 0

def eq (a b : JSNumber) : Bool :=
  if b.isNaN then false else if b.isZero then a.isZero else decide (a = b)

def truthy (x : JSNumber) : Bool := !(x.isNaN || x.isZero)

-- The magnitude bits increase with absolute value. This signed key is used only for ordering.
private def orderKey (negative : Bool) (m : Nat) : Int := if negative then -Int.ofNat m else Int.ofNat m

def lt : JSNumber → JSNumber → Bool
  | .num s m, .num t n => decide (orderKey s m.val < orderKey t n.val)
  | _, _ => false

def le : JSNumber → JSNumber → Bool
  | .num s m, .num t n => decide (orderKey s m.val ≤ orderKey t n.val)
  | _, _ => false

-- A finite input has exact absolute value significand(m) * 2^scale(m).
private def significand (m : Nat) := if m < hiddenBit then m else hiddenBit + m % hiddenBit
private def scale (m : Nat) : Int := Int.ofNat (max 1 (m / hiddenBit)) - 1075

private def roundEven (n d : Nat) : Nat :=
  let q := n / d
  let twice := 2 * (n % d)
  if twice > d || (twice == d && q % 2 == 1) then q + 1 else q

-- Exact arithmetic on two binary64 operands uses fewer than 2,100 significant bits.
-- Binary search keeps these closed calculations reducible in the Lean kernel.
private def bitLog (n : Nat) : Nat :=
  if n >>> 4096 != 0 then n.log2 else
    [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1].foldl
      (fun k step => if n >>> (k + step) != 0 then k + step else k) 0

-- floor(log2(n/d)), where n and d are positive.
private def logRatio (n d : Nat) : Int :=
  let k := Int.ofNat (bitLog n) - Int.ofNat (bitLog d)
  if (n <<< (-k).toNat) < (d <<< k.toNat) then k - 1 else k

-- Round the exact nonnegative rational (n/d) * 2^k to the nearest binary64.
-- The smallest unit is one subnormal. A carry at the top exponent yields infinity.
private def roundedMagnitude (n d : Nat) (k : Int) : Nat :=
  if n = 0 then 0 else
    let unit := max (-1074) (logRatio n d + k - 52)
    let shift := k - unit
    let q := roundEven (n <<< shift.toNat) (d <<< (-shift).toNat)
    if q < hiddenBit then q else
      let carry := q == 2 * hiddenBit
      let exponent := (unit + 1075).toNat + (if carry then 1 else 0)
      let fraction := if carry then 0 else q - hiddenBit
      exponent * hiddenBit + fraction

private def fromRatio (s : Bool) (n d : Nat) (k : Int) := pack s (roundedMagnitude n d k)

def mul : JSNumber → JSNumber → JSNumber
  | .num s a, .num t b =>
    let sign := xor s t
    if a.val == infBits || b.val == infBits then
      if a.val == 0 || b.val == 0 then .nan else pack sign infBits
    else fromRatio sign (significand a * significand b) 1 (scale a + scale b)
  | _, _ => .nan

def div : JSNumber → JSNumber → JSNumber
  | .num s a, .num t b =>
    let sign := xor s t
    if (a.val == 0 && b.val == 0) || (a.val == infBits && b.val == infBits) then .nan
    else if a.val == infBits || b.val == 0 then pack sign infBits
    else if b.val == infBits then pack sign 0
    else fromRatio sign (significand a) (significand b) (scale a - scale b)
  | _, _ => .nan

def add : JSNumber → JSNumber → JSNumber
  | .num s a, .num t b =>
    if a.val == infBits then
      if b.val == infBits && s != t then .nan else .num s a
    else if b.val == infBits then .num t b
    else
      let k := min (scale a) (scale b)
      let x := significand a <<< (scale a - k).toNat
      let y := significand b <<< (scale b - k).toNat
      let sum := orderKey s x + orderKey t y
      fromRatio (decide (sum < 0) || (sum == 0 && s && t)) sum.natAbs 1 k
  | _, _ => .nan

def sub (a b : JSNumber) := add a (neg b)

private inductive IntegralMode where | nearest | down | up | towardZero

private abbrev oneBits : Nat := 0x3ff0000000000000
private abbrev halfBits : Nat := 0x3fe0000000000000

private def roundUp (mode : IntegralMode) (negative : Bool) (remainder unit : Nat) : Bool :=
  match mode with
  | .nearest => 2 * remainder > unit || (2 * remainder == unit && !negative)
  | .down => negative && remainder != 0
  | .up => !negative && remainder != 0
  | .towardZero => false

private def roundIntegral (mode : IntegralMode) : JSNumber → JSNumber
  | .nan => .nan
  | .num s m =>
    if m.val < oneBits then
      let up := match mode with
        | .nearest => m.val > halfBits || (m.val == halfBits && !s)
        | .down => s && m.val != 0
        | .up => !s && m.val != 0
        | .towardZero => false
      pack s (if up then oneBits else 0)
    else
      let exponent := m.val / hiddenBit
      if exponent ≥ 1075 then .num s m else
        -- Between 1 and 2^52 the low (1075 - exponent) bits encode the fraction.
        -- oneBits is aligned to every such unit. A carry crosses exponents naturally.
        let unit := 2 ^ (1075 - exponent)
        let offset := m.val - oneBits
        let base := oneBits + offset / unit * unit
        pack s (base + if roundUp mode s (offset % unit) unit then unit else 0)

-- Number.isInteger describes the represented value, including integers beyond the safe range.
def isInteger : JSNumber → Bool
  | .nan => false
  | .num _ m =>
    if m.val < oneBits then m.val == 0 else
      let exponent := m.val / hiddenBit
      m.val != infBits && (exponent ≥ 1075 || (m.val - oneBits) % (2 ^ (1075 - exponent)) == 0)

-- Math.round resolves half ties toward positive infinity and preserves a negative zero.
def round := roundIntegral .nearest
def floor := roundIntegral .down
def ceil := roundIntegral .up
def trunc := roundIntegral .towardZero

-- Compare the fractional magnitude to its midpoint. When the sign is negative,
-- the integer of smaller magnitude is the upper endpoint on the number line.
private def lowerIsNearer (negative : Bool) (a b : Nat) : Bool :=
  if negative then decide (b < a) else decide (a < b)

-- For a fractional Number, floor and ceil are the two adjacent integers.
-- Below unit magnitude the ordering of the magnitude bits locates the half.
-- Above it, compare exact distances in representable steps in this exponent bin.
-- Both endpoints coincide on integers, signed zeros, infinities and NaN.
private def nearestTiesUp (x : JSNumber) : JSNumber :=
  match x with
  | .nan => .nan
  | .num s m =>
    let lower := if m.val < oneBits then lowerIsNearer s m.val halfBits else
      let unit := 2 ^ (1075 - m.val / hiddenBit)
      let remainder := (m.val - oneBits) % unit
      lowerIsNearer s remainder (unit - remainder)
    if lower then floor x else ceil x

private theorem nearest_step (s : Bool) (r u : Nat) (hr : r < u) :
    (if lowerIsNearer s r (u - r) then roundUp .down s r u else roundUp .up s r u) =
      roundUp .nearest s r u := by
  have below : r < u - r ↔ 2 * r < u := by omega
  have above : u - r < r ↔ u < 2 * r := by omega
  rcases Nat.lt_trichotomy (2 * r) u with low | tie | high <;> by_cases z : r = 0 <;>
    cases s <;> simp (disch := omega) [lowerIsNearer, roundUp, below, above, *, bne_iff_ne] <;>
    (try simp_all) <;> omega

private theorem nearestTiesUp_round (x : JSNumber) : nearestTiesUp x = round x := by
  cases x with
  | nan => rfl
  | num s m =>
    unfold nearestTiesUp
    dsimp only
    by_cases small : m.val < oneBits
    · simp only [small, ↓reduceIte, floor, ceil, round, roundIntegral]
      by_cases z : m.val = 0 <;> by_cases tie : m.val = halfBits <;> by_cases above : halfBits < m.val <;>
        cases s <;> simp [lowerIsNearer, *, halfBits] at * <;> (repeat' split) <;> (try simp_all) <;> omega
    · simp only [small, Bool.false_eq_true, ↓reduceIte, floor, ceil, round, roundIntegral]
      by_cases large : m.val / hiddenBit ≥ 1075
      · simp [large]
      · simp only [large, ↓reduceIte]
        let u := 2 ^ (1075 - m.val / hiddenBit)
        let r := (m.val - oneBits) % u
        have hr : r < u := Nat.mod_lt _ (Nat.pow_pos (by decide))
        have step := nearest_step s r u hr
        by_cases lower : lowerIsNearer s r (u - r) = true <;>
          simp [lower] at step <;>
          simp only [u, r] at lower step <;> simp [lower, step]

-- Reflection exchanges upper and lower ties and preserves the sign of a zero result.
def nearestInteger (x : JSNumber) (tiesUp : Bool) : JSNumber :=
  if tiesUp then nearestTiesUp x else neg (nearestTiesUp (neg x))

theorem nearestInteger_round (x : JSNumber) : nearestInteger x true = round x :=
  nearestTiesUp_round x

theorem nearestInteger_round_down (x : JSNumber) : nearestInteger x false = neg (round (neg x)) :=
  congrArg neg (nearestTiesUp_round (neg x))

-- A strict-equality premise fixes the input bits for every nonzero, non-NaN literal.
theorem eq_regular {a b : JSNumber} (hn : b.isNaN = false) (hz : b.isZero = false) :
    eq a b = true ↔ a = b := by simp [eq, hn, hz]

private theorem nonnegative_pack (m : Nat) : le (ofBits 0) (pack false m) = true := by
  change decide ((0 : Int) ≤ Int.ofNat (min m infBits)) = true
  simp

private theorem nonnegative_ratio (n d : Nat) (k : Int) : le (ofBits 0) (fromRatio false n d k) = true := by
  exact nonnegative_pack _

theorem nonnegative_round {x : JSNumber} (hx : le (ofBits 0) x = true) :
    le (ofBits 0) (round x) = true := by
  cases x with
  | nan => contradiction
  | num s m =>
    cases s
    case false =>
      simp only [round, roundIntegral]
      split
      · apply nonnegative_pack
      · split
        · exact hx
        · apply nonnegative_pack
    case true =>
      change decide ((0 : Int) ≤ -(m.val : Int)) = true at hx
      simp only [decide_eq_true_eq] at hx
      have hm : m.val = 0 := by omega
      have zero : m = ⟨0, by decide⟩ := Fin.ext hm
      subst m; decide

-- Scaling a nonnegative Number by a strictly positive, finite constant preserves its sign,
-- including -0 and overflow to +Infinity.
theorem nonnegative_mul {x c : JSNumber} (hc : lt (ofBits 0) c = true) (hf : lt c (ofBits infBits) = true)
    (hx : le (ofBits 0) x = true) : le (ofBits 0) (mul x c) = true := by
  cases c with
  | nan => change false = true at hc; cases hc
  | num t b =>
    cases t
    case true =>
      change decide ((0 : Int) < -(b.val : Int)) = true at hc
      simp only [decide_eq_true_eq] at hc
      omega
    case false =>
      change decide ((0 : Int) < (b.val : Int)) = true at hc
      change decide ((b.val : Int) < (infBits : Int)) = true at hf
      simp only [decide_eq_true_eq] at hc hf
      have hb : b.val ≠ 0 := by omega
      have hi : b.val ≠ infBits := by omega
      cases x with
      | nan => change false = true at hx; cases hx
      | num s a =>
        cases s
        case false =>
          by_cases h : a.val = infBits
          · simp [mul, h, hb, nonnegative_pack]
          · simp [mul, h, hi, nonnegative_ratio]
        case true =>
          change decide ((0 : Int) ≤ -(a.val : Int)) = true at hx
          simp only [decide_eq_true_eq] at hx
          have ha : a.val = 0 := by omega
          simp [mul, ha, hi, significand, fromRatio, roundedMagnitude]
          decide

-- These rewrites operate on arbitrary operands. Structural equality includes NaN and signed zero.
theorem mul_comm (x y : JSNumber) : mul x y = mul y x := by
  cases x <;> cases y <;> first | rfl | simp only [mul, Bool.xor_comm, Bool.or_comm, Nat.mul_comm, Int.add_comm]

theorem mul_neg (x y : JSNumber) : mul (neg x) y = neg (mul x y) := by
  cases x with
  | nan => rfl
  | num s a =>
    cases y with
    | nan => rfl
    | num t b => cases s <;> cases t <;> simp only [neg, mul] <;> repeat' first | rfl | split

theorem div_neg (x y : JSNumber) : div (neg x) y = neg (div x y) := by
  cases x with
  | nan => rfl
  | num s a =>
    cases y with
    | nan => rfl
    | num t b => cases s <;> cases t <;> simp only [neg, div] <;> repeat' first | rfl | split

theorem eq_self (x : JSNumber) : eq x x = !x.isNaN := by cases x <;> simp [eq, isNaN]

theorem isNaN_neg (x : JSNumber) : isNaN (neg x) = isNaN x := by cases x <;> rfl

def finiteNonzero : JSNumber → Bool
  | .nan => false
  | .num _ m => m.val != 0 && m.val != infBits

theorem isNaN_mul_right (x c : JSNumber) (hc : finiteNonzero c = true) : isNaN (mul x c) = isNaN x := by
  cases c with
  | nan => contradiction
  | num t b =>
    simp [finiteNonzero] at hc
    cases x with
    | nan => rfl
    | num s a => by_cases h : a.val = infBits <;> simp [mul, hc.1, hc.2, h, isNaN, fromRatio, pack]

theorem isNaN_mul_left (c x : JSNumber) (hc : finiteNonzero c = true) : isNaN (mul c x) = isNaN x := by
  rw [mul_comm, isNaN_mul_right x c hc]

theorem isNaN_div_right (x c : JSNumber) (hc : finiteNonzero c = true) : isNaN (div x c) = isNaN x := by
  cases c with
  | nan => contradiction
  | num t b =>
    simp [finiteNonzero] at hc
    cases x with
    | nan => rfl
    | num s a => by_cases h : a.val = infBits <;> simp [div, hc.1, hc.2, h, isNaN, fromRatio, pack]

private theorem integral_fixed (mode : IntegralMode) {x : JSNumber} (hx : isInteger x = true) : eq (roundIntegral mode x) x = true := by
  cases x with
  | nan => contradiction
  | num s m =>
    suffices fixed : roundIntegral mode (.num s m) = .num s m by rw [fixed, eq_self]; rfl
    by_cases small : m.val < oneBits
    · change (if m.val < oneBits then m.val == 0 else _) = true at hx
      have zero : m = ⟨0, by decide⟩ := Fin.ext (by simpa [small] using hx)
      subst m
      cases mode <;> cases s <;> decide
    · by_cases large : m.val / hiddenBit ≥ 1075
      · simp [round, roundIntegral, small, large]
      · have aligned : (m.val - oneBits) % (2 ^ (1075 - m.val / hiddenBit)) = 0 := by
          simp [isInteger, small, large] at hx
          exact hx.2
        have restored := Nat.div_add_mod (m.val - oneBits) (2 ^ (1075 - m.val / hiddenBit))
        rw [aligned, Nat.add_zero, Nat.mul_comm] at restored
        have unit : (0 : Nat) ≠ 2 ^ (1075 - m.val / hiddenBit) := Nat.ne_of_lt (Nat.pow_pos (by decide))
        cases mode <;> simp [roundIntegral, small, large, roundUp, aligned, restored, pack, unit,
          Nat.add_sub_of_le (Nat.le_of_not_gt small), Nat.min_eq_left (Nat.le_of_lt_succ m.isLt)]

theorem round_integer {x : JSNumber} (h : isInteger x = true) : eq (round x) x = true := integral_fixed .nearest h
theorem floor_integer {x : JSNumber} (h : isInteger x = true) : eq (floor x) x = true := integral_fixed .down h
theorem ceil_integer {x : JSNumber} (h : isInteger x = true) : eq (ceil x) x = true := integral_fixed .up h
theorem trunc_integer {x : JSNumber} (h : isInteger x = true) : eq (trunc x) x = true := integral_fixed .towardZero h

-- JavaScript comparison sees -0 as zero; its reciprocal exposes the sign after underflow.
private theorem negative_or_reciprocal (m : Fin (infBits + 1)) :
    lt (.num true m) (ofBits 0) = true ∨ lt (div (ofBits oneBits) (.num true m)) (ofBits 0) = true := by
  by_cases h : m.val = 0
  · have hm : m = ⟨0, by decide⟩ := Fin.ext h
    subst m
    right; decide
  · left
    change decide (-(m.val : Int) < 0) = true
    simp only [decide_eq_true_eq]
    omega

theorem negative_div {x c : JSNumber} (hc : finiteNonzero c = true) (hp : lt (ofBits 0) c = true)
    (hx : lt x (ofBits 0) = true) :
    lt (div x c) (ofBits 0) = true ∨ lt (div (ofBits oneBits) (div x c)) (ofBits 0) = true := by
  cases c with
  | nan => contradiction
  | num t b =>
    cases t
    case true =>
      change decide ((0 : Int) < -(b.val : Int)) = true at hp
      simp only [decide_eq_true_eq] at hp
      omega
    case false =>
      simp [finiteNonzero] at hc
      cases x with
      | nan => contradiction
      | num s a =>
        cases s
        case false =>
          change decide ((a.val : Int) < 0) = true at hx
          simp only [decide_eq_true_eq] at hx
          omega
        case true =>
          have result : ∃ m, div (.num true a) (.num false b) = .num true m := by
            by_cases h : a.val = infBits <;>
              simp [div, h, hc.1, hc.2, fromRatio, pack]
          obtain ⟨m, hm⟩ := result
          rw [hm]
          exact negative_or_reciprocal m

private theorem integral_nonzero (s : Bool) (a b : Nat) : isZero (pack s (oneBits + a + b)) = false := by
  change (min (oneBits + a + b) infBits == 0) = false
  simp [Nat.min_def, oneBits, infBits]
  split <;> omega

-- Math.round's zero cell is closed at -0.5 and open at +0.5, including both input zeros.
theorem round_eq_zero (x : JSNumber) :
    eq (round x) (ofBits 0) = true ↔
      le (neg (ofBits halfBits)) x = true ∧ lt x (ofBits halfBits) = true := by
  cases x with
  | nan => decide
  | num s m =>
    change isZero (roundIntegral .nearest (.num s m)) = true ↔
      decide (-(halfBits : Int) ≤ orderKey s m.val) = true ∧ decide (orderKey s m.val < (halfBits : Int)) = true
    cases s <;> simp only [roundIntegral, orderKey, Bool.false_eq_true, ↓reduceIte, decide_eq_true_eq] <;>
      split <;> (repeat' split) <;> (try simp only [integral_nonzero]) <;> simp_all [pack, isZero, halfBits, oneBits, infBits] <;> omega

end JSNumber
end Pud
