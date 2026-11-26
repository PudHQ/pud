namespace Booking

/-- Committed state for one booking. The write count tracks credits for this booking. -/
structure State where
  balance : Nat
  availableSeats : Nat
  refund : Option Nat
  creditWrites : Nat
  deriving Repr, DecidableEq

inductive Outcome where
  | aborted
  | committed
  | replyLost
  deriving Repr, DecidableEq

structure Attempt where
  due : Nat
  outcome : Outcome
  deriving Repr, DecidableEq

def creditAccount (due : Nat) (state : State) : State :=
  { state with balance := state.balance + due, creditWrites := state.creditWrites + 1 }

def releaseSeats (seats : Nat) (state : State) : State :=
  { state with availableSeats := state.availableSeats + seats }

def cancel (seats due : Nat) (state : State) : State × Nat :=
  match state.refund with
  | some recorded => (state, recorded)
  | none =>
    let state := creditAccount due state
    let state := releaseSeats seats state
    ({ state with refund := some due }, due)

/-- Each attempt either rolls back or publishes the transaction's pending state. -/
def step (seats : Nat) (attempt : Attempt) (state : State) : State × Option Nat :=
  match attempt.outcome with
  | .aborted => (state, none)
  | .committed =>
    let (next, returned) := cancel seats attempt.due state
    (next, some returned)
  | .replyLost => ((cancel seats attempt.due state).1, none)

def run (seats : Nat) : List Attempt → State → State
  | [], state => state
  | attempt :: rest, state => run seats rest (step seats attempt state).1

def firstCommittedRefund : List Attempt → Option Nat
  | [] => none
  | attempt :: rest =>
    match attempt.outcome with
    | .aborted => firstCommittedRefund rest
    | .committed | .replyLost => some attempt.due

def expectedAfterCancellation (seats due : Nat) (state : State) : State :=
  { balance := state.balance + due, availableSeats := state.availableSeats + seats,
    refund := some due, creditWrites := state.creditWrites + 1 }

theorem committed_retry_returns_recorded (seats due : Nat) (state : State) (recorded : Nat)
    (closed : state.refund = some recorded) :
    step seats { due, outcome := .committed } state = (state, some recorded) := by
  simp [step, cancel, closed]

theorem recorded_refund_stays (seats recorded : Nat) (attempts : List Attempt) (state : State)
    (closed : state.refund = some recorded) : run seats attempts state = state := by
  induction attempts generalizing state with
  | nil => rfl
  | cons attempt rest ih =>
    have unchanged : (step seats attempt state).1 = state := by
      rcases attempt with ⟨due, outcome⟩
      cases outcome <;> simp [step, cancel, closed]
    simpa [run, unchanged] using (ih state closed)

theorem exactly_once (seats : Nat) (attempts : List Attempt) (state : State)
    (uncancelled : state.refund = none) :
    run seats attempts state =
      match firstCommittedRefund attempts with
      | none => state
      | some due => expectedAfterCancellation seats due state := by
  induction attempts generalizing state with
  | nil => rfl
  | cons attempt rest ih =>
    rcases attempt with ⟨due, outcome⟩
    cases outcome with
    | aborted => simpa [run, step, firstCommittedRefund] using (ih state uncancelled)
    | committed =>
      have stable := recorded_refund_stays seats due rest
        (expectedAfterCancellation seats due state) rfl
      simpa [run, step, cancel, uncancelled, creditAccount, releaseSeats, firstCommittedRefund,
        expectedAfterCancellation] using stable
    | replyLost =>
      have stable := recorded_refund_stays seats due rest
        (expectedAfterCancellation seats due state) rfl
      simpa [run, step, cancel, uncancelled, creditAccount, releaseSeats, firstCommittedRefund,
        expectedAfterCancellation] using stable

def scenario : List Attempt :=
  [⟨55, .aborted⟩, ⟨55, .replyLost⟩, ⟨111, .committed⟩]

#eval run 1 scenario { balance := 39, availableSeats := 7, refund := none, creditWrites := 0 }
#print axioms exactly_once
#print axioms committed_retry_returns_recorded

end Booking
