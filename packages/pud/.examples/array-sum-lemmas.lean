import Std

namespace ArraySum

theorem fold_sum (values : List Int) (start : Int) :
    values.foldl (· + ·) start = start + values.sum := by
  induction values generalizing start with
  | nil => simp
  | cons value rest ih => simp [ih, Int.add_assoc]

theorem correct (values : List Int) : values.foldl (· + ·) 0 = values.sum := by
  simpa using fold_sum values 0

end ArraySum
