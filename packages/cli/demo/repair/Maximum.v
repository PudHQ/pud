From Stdlib Require Import ZArith Bool Lia.
From Pud Require Import Subject.

Theorem max_correct : Subject.claim.
Proof.
  intros a b. unfold Subject.property, Subject.impl.
  match goal with
  | |- context [Z.ltb ?x ?y] => destruct (Z.ltb_spec x y)
  end;
    rewrite !Bool.andb_true_iff, Bool.orb_true_iff, !Z.geb_le, !Z.eqb_eq; lia.
Qed.
