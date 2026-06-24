---
'@requence/tokenized-search': patch
---

Fix editing inside token values not triggering search update. When manually
editing a resolved token value (e.g. changing `Name:"A"` to `Name:"B"`) and
pressing Enter, the dropdown was consuming the keypress without submitting.
Also fix negation being silently dropped in `toTechnicalQuery` and
`toDisplayQuery` because the parser already strips the `not:` prefix from
the value — both functions now use `seg.negated` directly.
