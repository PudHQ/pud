import Std

namespace ZigZag

def represents (value code : Int) : Prop :=
  0 ≤ code ∧ (code = 2 * value ∨ code + 1 = -2 * value)

end ZigZag
