import Std

namespace ZigZag

@[simp] def represents (value code : Int) : Prop :=
  0 ≤ code ∧ (code = 2 * value ∨ code + 1 = -2 * value)

@[simp] def decodesTo (code value : Int) : Prop :=
  represents value code

end ZigZag
