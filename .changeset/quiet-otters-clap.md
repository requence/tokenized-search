---
'@requence/tokenized-search': minor
---

Add an optional `pattern` field to token definitions. A value must match the
regular expression to be recognized as a token, providing a middle ground
between `strict` (must match an option) and fully open values — ideal for
constrained free-form input like dates. Independent of `strict`, and the
actively-edited token is exempt so it isn't stripped mid-typing.
