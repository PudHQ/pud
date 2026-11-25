import Std

namespace ContentDispatch

@[simp] def keepsParts {Item : Type} (content : Option (List Item)) (parts : List Item) : Prop :=
  parts = content.getD []

end ContentDispatch
