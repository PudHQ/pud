import Std

namespace Availability

private theorem foldSeed (masks : List Int) (seed : Int) :
    masks.foldl (fun total mask => total + mask % 2) seed =
    seed + masks.foldl (fun total mask => total + mask % 2) 0 := by
  induction masks generalizing seed with
  | nil => simp
  | cons mask rest ih =>
    simp only [List.foldl_cons]
    rw [ih (seed + mask % 2), ih (0 + mask % 2)]
    omega

theorem countAppend (left right : List Int) :
    (left ++ right).foldl (fun total mask => total + mask % 2) 0 =
    left.foldl (fun total mask => total + mask % 2) 0 +
      right.foldl (fun total mask => total + mask % 2) 0 := by
  rw [List.foldl_append, foldSeed]

@[simp] theorem countBatches (left right : List Int) :
    right.foldl (fun total mask => total + mask % 2)
      (left.foldl (fun total mask => total + mask % 2) 0) =
    left.foldl (fun total mask => total + mask % 2) 0 +
      right.foldl (fun total mask => total + mask % 2) 0 := by
  simpa only [List.foldl_append] using countAppend left right

@[simp] theorem lowBitAsVote (mask : Int) :
    (if mask % (2 : Int) = 1 then (1 : Int) else 0) = mask % 2 := by
  have lower := Int.emod_nonneg mask (by decide : (2 : Int) ≠ 0)
  have upper := Int.emod_lt_of_pos mask (by decide : (0 : Int) < 2)
  by_cases bit : mask % 2 = 1 <;> simp [bit] <;> omega

end Availability
