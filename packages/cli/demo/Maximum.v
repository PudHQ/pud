From Stdlib Require Import ZArith Bool Lia.
From Pud Require Import Subject.

Theorem max_correct : Subject.claim.
Proof.
  intros a b. unfold Subject.property, Subject.impl.
  destruct (Z.ltb_spec a b);
    rewrite !Bool.andb_true_iff, Bool.orb_true_iff, !Z.geb_le, !Z.eqb_eq; lia.
Qed.
