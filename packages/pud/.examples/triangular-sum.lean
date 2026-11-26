import Std

namespace TriangularSum

-- Summing one more positive integer increases the doubled total by 2 * (n + 1).
private theorem successor (n : Int) : (n + 1) * (n + 1 + 1) = n * (n + 1) + 2 * (n + 1) := by
  simp only [Int.add_mul, Int.mul_add, Int.mul_one, Int.one_mul]
  omega

theorem recursive (f : Int → Int) (base : f 0 = 0)
    (step : ∀ n : Nat, f (n + 1) = (n + 1 : Int) + f n) (n : Nat) :
    2 * f n = (n : Int) * (n + 1) := by
  induction n with
  | zero => simp [base]
  | succ n ih => rw [Int.natCast_succ, step, successor]; omega

theorem accumulating (run : Int → Int → Int) (base : ∀ total, run 0 total = total)
    (step : ∀ (n : Nat) total, run (n + 1) total = run n (total + (n + 1)))
    (n : Nat) (total : Int) : 2 * run n total = 2 * total + (n : Int) * (n + 1) := by
  induction n generalizing total with
  | zero => simp [base]
  | succ n ih => rw [Int.natCast_succ, step, ih, successor]; omega

end TriangularSum
