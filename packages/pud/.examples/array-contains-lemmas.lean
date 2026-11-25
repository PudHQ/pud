import Std

namespace ArrayContains

private def scan (values : List Int) (target : Int) : Bool := Id.run do
  let mut found := false
  for value in values do
    if decide (value = target) then
      found := true
      break
  return found

private theorem scan_mem (values : List Int) (target : Int) : scan values target = true ↔ target ∈ values := by
  induction values with
  | nil => simp [scan, Id.run]
  | cons value rest ih =>
    by_cases same : value = target
    · simp [scan, Id.run, List.forIn_cons, same]
    · have step : scan (value :: rest) target = scan rest target := by
        simp [scan, Id.run, List.forIn_cons, same]
      rw [step, ih]
      simp [Ne.symm same]

theorem correct (values : List Int) (target : Int) :
    scan values target = true ↔ ∃ value ∈ values, value = target := by
  rw [scan_mem]
  constructor
  · intro member
    exact ⟨target, member, rfl⟩
  · rintro ⟨_, member, rfl⟩
    exact member

end ArrayContains
