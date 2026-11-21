include "Turn.dfy"

lemma Clockwise(h: int, p: Pt)
  ensures Cw(h, p).y == p.x
  ensures (h - 1) - Cw(h, p).x == p.y
{
}
