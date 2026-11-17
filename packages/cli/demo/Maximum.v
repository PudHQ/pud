From Stdlib Require Import ZArith.
From Pud Require Import Subject.

Definition maximum := Z.max.

Theorem max_correct : Subject.agrees maximum.
Proof.
  intros a b. unfold Subject.impl, maximum. destruct (Z.ltb a b) eqn:order.
  - apply Z.ltb_lt in order. symmetry. apply Z.max_r. now apply Z.lt_le_incl.
  - apply Z.ltb_ge in order. symmetry. now apply Z.max_l.
Qed.
