import Std

namespace MaxElement

private def scan (values : List Int) (initialLargest : Int) (initialStarted : Bool) : Int := Id.run do
  let mut largest := initialLargest
  let mut started := initialStarted
  for value in values do
    if !started || decide (largest < value) then
      largest := value
    started := true
  return largest

private theorem scan_started (values : List Int) (largest : Int) :
    scan values largest true = values.foldl max largest := by
  induction values generalizing largest with
  | nil => rfl
  | cons value rest ih =>
    have step : scan (value :: rest) largest true = scan rest (max largest value) true := by
      by_cases greater : largest < value
      · simp [scan, Id.run, List.forIn_cons, greater, Int.max_eq_right (Int.le_of_lt greater)]
      · have le : value ≤ largest := by omega
        simp [scan, Id.run, List.forIn_cons, greater, Int.max_eq_left le]
    rw [step, ih, List.foldl_cons]

private theorem scan_max (values : List Int) : scan values 0 false = values.max?.getD 0 := by
  cases values with
  | nil => rfl
  | cons value rest =>
    have first : scan (value :: rest) 0 false = scan rest value true := by
      simp [scan, Id.run, List.forIn_cons]
    rw [first, scan_started, List.max?_cons']
    rfl

theorem correct (values : List Int) :
    let result := scan values 0 false
    (∀ value ∈ values, value ≤ result) ∧
      (((values.length : Int) = 0 ∧ result = 0) ∨ ∃ value ∈ values, value = result) := by
  dsimp only
  rw [scan_max]
  cases maximum : values.max? with
  | none =>
    rw [List.max?_eq_none_iff.mp maximum]
    simp
  | some greatest =>
    have max_eq_or (a b : Int) : max a b = a ∨ max a b = b := by
      rw [Int.max_def]
      split <;> simp
    have member := List.max?_mem max_eq_or maximum
    have upper := (List.max?_le_iff (fun _ _ _ => Int.max_le) maximum).mp (Int.le_refl greatest)
    exact ⟨upper, Or.inr ⟨greatest, member, rfl⟩⟩

end MaxElement
