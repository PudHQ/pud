import Std

namespace LinearSearch

def scan (values : List Int) (target start : Int) : Int := Id.run do
  let mut index := start
  for value in values do
    if decide (value = target) then
      return index
    index := index + 1
  return -1

def expected (values : List Int) (target start : Int) : Int :=
  ((values.findIdx? (fun value => decide (value = target))).map (fun i => start + (i : Int))).getD (-1)

def firstMatch (values : List Int) (target result : Int) : Prop :=
  result = expected values target 0

theorem scan_cons (value : Int) (rest : List Int) (target start : Int) :
    scan (value :: rest) target start = if value = target then start else scan rest target (start + 1) := by
  by_cases equal : value = target <;> simp [scan, List.forIn_cons, Id.run, equal]

theorem scan_correct (values : List Int) (target start : Int) :
    scan values target start = expected values target start := by
  induction values generalizing start with
  | nil => rfl
  | cons value rest ih =>
    rw [scan_cons]
    by_cases equal : value = target
    · simp [expected, List.findIdx?_cons, equal]
    · rw [if_neg equal, ih]
      cases found : rest.findIdx? (fun item => decide (item = target)) <;>
        simp [expected, List.findIdx?_cons, equal, found] <;> omega

theorem correct (values : List Int) (target : Int) : firstMatch values target (scan values target 0) :=
  scan_correct values target 0

end LinearSearch
