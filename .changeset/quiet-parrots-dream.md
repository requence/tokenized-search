---
'@requence/tokenized-search': minor
---

Add an opt-in `complex` mode enabling boolean operators (`AND`/`OR`/`NOT`) and
grouping parentheses. When enabled, operators are parsed, highlighted,
suggested, and validated, and a boolean expression tree (`parseExpression` →
`SearchAst`) is exposed as a new third `expression` argument on the `onChange`
and `onSearch` callbacks. The feature is fully opt-in and backward compatible:
`complex` defaults to `false`, the `expression` argument is additive, and the
exported `parseTokenizedSearch` utility leaves operators off by default so
existing callers are unaffected.
