import Std

namespace NestedSum

private def step (count : Int) (_ : Int) : Int := count + 1

private def countPairs (rows columns : List Int) (start : Int) : Int := Id.run do
  let mut total := start
  for _ in rows do
    total := columns.foldl step total
  return total

private theorem countColumn (columns : List Int) (start : Int) :
    columns.foldl step start = start + (columns.length : Int) := by
  induction columns generalizing start with
  | nil => simp
  | cons _ rest ih =>
    simp [step, ih]
    omega

private theorem countRows (rows columns : List Int) (start : Int) :
    countPairs rows columns start = start + (rows.length : Int) * (columns.length : Int) := by
  induction rows generalizing start with
  | nil => simp [countPairs, Id.run]
  | cons value rest ih =>
    have advance : countPairs (value :: rest) columns start = countPairs rest columns (start + (columns.length : Int)) := by
      simp [countPairs, Id.run, List.forIn_cons, countColumn]
    rw [advance, ih]
    simp [Int.add_mul, Int.add_assoc, Int.add_left_comm, Int.add_comm]

theorem correct (values : List Int) : countPairs values values 0 = (values.length : Int) * (values.length : Int) := by
  simp [countRows]

end NestedSum
