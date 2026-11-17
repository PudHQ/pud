From Stdlib Require Import ZArith.
From Pud Require Import Subject.

Definition minimum := Z.min.

Theorem min_correct : Subject.agrees minimum.
Proof.
  intros a b. unfold Subject.impl, minimum.
  symmetry. destruct (Z.ltb_spec a b) as [lt | le].
  - exact (Z.min_l a b (Z.lt_le_incl a b lt)).
  - exact (Z.min_r a b le).
Qed.
