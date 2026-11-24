import Std

namespace PositiveSum

def step (total value : Int) : Int :=
  total + (if decide ((0 : Int) < value) then value else 0)

theorem fold_nonnegative (values : List Int) (total : Int) (start : 0 ≤ total) :
    0 ≤ values.foldl step total := by
  induction values generalizing total with
  | nil => exact start
  | cons value rest ih =>
    apply ih
    unfold step
    split <;> simp_all <;> omega

theorem nonnegative (values : List Int) : 0 ≤ values.foldl step 0 :=
  fold_nonnegative values 0 (by decide)

end PositiveSum
