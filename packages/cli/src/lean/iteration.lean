import Std

namespace Pud

set_option autoImplicit false

def countdownWhile {m : Type → Type} [Monad m] {σ : Type}
    (counter limit decrement : Int) (positive : 0 < decrement)
    (step : Int → σ → m σ) (state : σ) : m (Int × σ) :=
  if _above : counter > limit then do
    let next ← step counter state
    countdownWhile (counter - decrement) limit decrement positive step next
  else pure (counter, state)
termination_by (counter - limit).toNat
decreasing_by omega

@[simp] theorem countdownWhile_stop {m : Type → Type} [Monad m] {σ : Type}
    (counter limit decrement : Int) (positive : 0 < decrement)
    (step : Int → σ → m σ) (state : σ) (stopped : counter ≤ limit) :
    countdownWhile counter limit decrement positive step state = pure (counter, state) := by
  rw [countdownWhile]
  simp [Int.not_lt.mpr stopped]

-- A false guard finishes with the current state. A throw finishes before the
-- counter update. A successful body updates the counter and runs the next step.
inductive CountdownRuns {ε σ : Type} (limit decrement : Int)
    (step : Int → σ → Except ε σ) : Int → σ → Except ε (Int × σ) → Prop where
  | stopped {counter state} : counter ≤ limit →
      CountdownRuns limit decrement step counter state (.ok (counter, state))
  | thrown {counter state error} : counter > limit → step counter state = .error error →
      CountdownRuns limit decrement step counter state (.error error)
  | continued {counter state next outcome} : counter > limit → step counter state = .ok next →
      CountdownRuns limit decrement step (counter - decrement) next outcome →
      CountdownRuns limit decrement step counter state outcome

theorem countdownWhile_except_runs {ε σ : Type}
    (counter limit decrement : Int) (positive : 0 < decrement)
    (step : Int → σ → Except ε σ) (state : σ) :
    CountdownRuns limit decrement step counter state (countdownWhile counter limit decrement positive step state) := by
  by_cases above : counter > limit
  · rw [countdownWhile]
    simp only [dif_pos above]
    cases currentStep : step counter state with
    | error error => exact .thrown above currentStep
    | ok next =>
      exact .continued above currentStep
        (countdownWhile_except_runs (counter - decrement) limit decrement positive step next)
  · rw [countdownWhile_stop _ _ _ _ _ _ (Int.le_of_not_gt above)]
    exact .stopped (Int.le_of_not_gt above)
termination_by (counter - limit).toNat
decreasing_by omega

theorem countdownWhile_pure_runs {σ : Type}
    (counter limit decrement : Int) (positive : 0 < decrement)
    (step : Int → σ → σ) (state : σ) :
    CountdownRuns (ε := Unit) limit decrement (fun n s => .ok (step n s)) counter state
      (.ok (countdownWhile (m := Id) counter limit decrement positive step state)) := by
  by_cases above : counter > limit
  · rw [countdownWhile]
    simp only [dif_pos above]
    exact .continued above rfl (countdownWhile_pure_runs (counter - decrement) limit decrement positive step (step counter state))
  · rw [countdownWhile_stop _ _ _ _ _ _ (Int.le_of_not_gt above)]
    exact .stopped (Int.le_of_not_gt above)
termination_by (counter - limit).toNat
decreasing_by omega

theorem CountdownRuns.deterministic {ε σ : Type} {limit decrement : Int}
    {step : Int → σ → Except ε σ} {counter : Int} {state : σ} {first second : Except ε (Int × σ)}
    (h₁ : CountdownRuns limit decrement step counter state first)
    (h₂ : CountdownRuns limit decrement step counter state second) : first = second := by
  induction h₁ generalizing second with
  | stopped below => cases h₂ <;> first | rfl | omega
  | thrown above error => cases h₂ <;> first | (simp_all; done) | omega
  | continued above ok _ ih =>
    cases h₂ with
    | stopped _ => omega
    | thrown _ error => rw [ok] at error; contradiction
    | continued _ other rest =>
      have same := Except.ok.inj (ok.symm.trans other)
      cases same
      exact ih rest

theorem countdownWhile_except_correct {ε σ : Type} (counter limit decrement : Int)
    (positive : 0 < decrement) (step : Int → σ → Except ε σ) (state : σ) (outcome : Except ε (Int × σ)) :
    CountdownRuns limit decrement step counter state outcome ↔
      countdownWhile counter limit decrement positive step state = outcome := by
  have run := countdownWhile_except_runs counter limit decrement positive step state
  constructor
  · exact run.deterministic
  · intro equal
    rw [← equal]
    exact run

theorem countdownWhile_pure_correct {σ : Type} (counter limit decrement : Int)
    (positive : 0 < decrement) (step : Int → σ → σ) (state : σ) (outcome : Int × σ) :
    CountdownRuns (ε := Unit) limit decrement (fun n s => .ok (step n s)) counter state (.ok outcome) ↔
      countdownWhile (m := Id) counter limit decrement positive step state = outcome := by
  have run := countdownWhile_pure_runs counter limit decrement positive step state
  constructor
  · intro other
    exact Except.ok.inj (run.deterministic other)
  · intro equal
    rw [← equal]
    exact run

-- The scalar-accumulator optimization consumes the dense array in order,
-- committing exactly one state update before proceeding to the tail.
inductive DenseForOfRuns {α σ : Type} (step : σ → α → σ) : List α → σ → σ → Prop where
  | done (state) : DenseForOfRuns step [] state state
  | next (value : α) {rest state final} : DenseForOfRuns step rest (step state value) final →
      DenseForOfRuns step (value :: rest) state final

theorem denseForOf_foldl {α σ : Type} (step : σ → α → σ) (values : List α) (state : σ) :
    DenseForOfRuns step values state (values.foldl step state) := by
  induction values generalizing state with
  | nil => exact .done state
  | cons head rest ih => exact .next head (ih (step state head))

theorem DenseForOfRuns.deterministic {α σ : Type} {step : σ → α → σ} {values : List α}
    {state first second : σ} (h₁ : DenseForOfRuns step values state first)
    (h₂ : DenseForOfRuns step values state second) : first = second := by
  induction h₁ generalizing second with
  | done => cases h₂; rfl
  | next _ _ ih => cases h₂; apply ih; assumption

theorem denseForOf_correct {α σ : Type} (step : σ → α → σ) (values : List α) (state outcome : σ) :
    DenseForOfRuns step values state outcome ↔ values.foldl step state = outcome := by
  have run := denseForOf_foldl step values state
  constructor
  · exact run.deterministic
  · intro equal
    rw [← equal]
    exact run

end Pud
