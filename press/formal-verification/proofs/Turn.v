From Stdlib Require Import ZArith Lia List.
Import ListNotations.
Open Scope Z_scope.

Record Pt := pt { px : Z; py : Z }.

Definition inside (w h : Z) (p : Pt) : Prop :=
  (0 <= px p < w) /\ (0 <= py p < h).

Definition cw (h : Z) (p : Pt) : Pt :=
  pt (h - 1 - py p) (px p).

Definition ccw (h : Z) (q : Pt) : Pt :=
  pt (py q) (h - 1 - px q).

Example turn_one : cw 3 (pt 1 0) = pt 2 1.
Proof. reflexivity. Qed.

Theorem cw_inside : forall w h p,
  inside w h p -> inside h w (cw h p).
Proof.
  intros w h [x y] [[Hx0 Hxw] [Hy0 Hyh]].
  cbn [px py] in Hx0, Hxw, Hy0, Hyh.
  change ((0 <= h - 1 - y < h) /\ (0 <= x < w)).
  split.
  - split; lia.
  - exact (conj Hx0 Hxw).
Qed.

Theorem undo_cw : forall h p, ccw h (cw h p) = p.
Proof.
  intros h [x y].
  change (pt x (h - 1 - (h - 1 - y)) = pt x y).
  replace (h - 1 - (h - 1 - y)) with y by lia.
  reflexivity.
Qed.

Fixpoint turnAll (h : Z) (ps : list Pt) : list Pt :=
  match ps with
  | [] => []
  | p :: tail => cw h p :: turnAll h tail
  end.

Theorem undo_all : forall h ps,
  map (ccw h) (turnAll h ps) = ps.
Proof.
  intros h ps.
  induction ps as [| p tail IH].
  - reflexivity.
  - cbn [turnAll map].
    rewrite undo_cw, IH.
    reflexivity.
Qed.

Print Assumptions cw_inside.
Print Assumptions undo_cw.
Print Assumptions undo_all.
