import Std

namespace Sorted

private def ordered (values : List Int) : Bool :=
  (values.zip values.tail).all (fun pair => decide (pair.1 ≤ pair.2))

def adjacentPairs (values : List Int) (result : Bool) : Prop :=
  result = ordered values

private def scan (values : List Int) (initialPrevious : Int) (initialStarted : Bool) : Bool := Id.run do
  let mut previous := initialPrevious
  let mut started := initialStarted
  for value in values do
    if started && decide (value < previous) then
      return false
    previous := value
    started := true
  return true

private theorem scan_started (values : List Int) (previous : Int) :
    scan values previous true = ordered (previous :: values) := by
  induction values generalizing previous with
  | nil => rfl
  | cons value rest ih =>
    by_cases reversed : value < previous
    · have forward : ¬ previous ≤ value := by omega
      simp [scan, ordered, Id.run, List.forIn_cons, reversed, forward]
    · have forward : previous ≤ value := by omega
      have step : scan (value :: rest) previous true = scan rest value true := by
        simp [scan, Id.run, List.forIn_cons, reversed]
      rw [step, ih]
      simp [ordered, forward]

theorem correct (values : List Int) : adjacentPairs values (scan values 0 false) := by
  cases values with
  | nil => rfl
  | cons value rest =>
    have first : scan (value :: rest) 0 false = scan rest value true := by
      simp [scan, Id.run, List.forIn_cons]
    change scan (value :: rest) 0 false = ordered (value :: rest)
    rw [first, scan_started]

end Sorted
