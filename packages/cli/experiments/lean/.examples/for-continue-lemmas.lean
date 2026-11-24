import Std

namespace CountOdds

private def oddCount (values : List Int) : Int :=
  (values.filter (fun value => decide (value % 2 = 1))).length

def odds (values : List Int) (result : Int) : Prop :=
  result = oddCount values

private def scan (values : List Int) (start : Int) : Int := Id.run do
  let mut count := start
  for value in values do
    if decide (value.tmod 2 = 0) then
      continue
    count := count + 1
  return count

private theorem scan_correct (values : List Int) (start : Int) :
    scan values start = start + oddCount values := by
  induction values generalizing start with
  | nil => simp [scan, Id.run, oddCount]
  | cons value rest ih =>
    have even : value.tmod 2 = 0 ↔ value % 2 = 0 :=
      Int.dvd_iff_tmod_eq_zero.symm.trans Int.dvd_iff_emod_eq_zero
    rcases Int.emod_two_eq value with remainder | remainder
    · have truncated := even.mpr remainder
      have skip : scan (value :: rest) start = scan rest start := by
        simp [scan, Id.run, List.forIn_cons, truncated]
      rw [skip, ih]
      simp [oddCount, remainder]
    · have truncated : ¬ value.tmod 2 = 0 := by
        intro zero
        have := even.mp zero
        omega
      have advance : scan (value :: rest) start = scan rest (start + 1) := by
        simp [scan, Id.run, List.forIn_cons, truncated]
      rw [advance, ih]
      simp [oddCount, remainder]
      omega

theorem correct (values : List Int) : odds values (scan values 0) := by
  simp [odds, scan_correct]

end CountOdds
