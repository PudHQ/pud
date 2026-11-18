From Stdlib Require Import ZArith Bool Lia.
From Pud Require Import Subject.

Theorem max_correct : Subject.claim.
Proof.
  intros x y. unfold property, impl.
  destruct (Z.ltb x y) eqn:H; [apply Z.ltb_lt in H | apply Z.ltb_ge in H];
    rewrite !Bool.andb_true_iff, Bool.orb_true_iff, !Z.geb_le, !Z.eqb_eq;
    intuition lia.
Qed.
