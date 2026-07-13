---
'@requence/tokenized-search': minor
---

Pass a `siblings` array to the `renderDropdown` callback, exposing every token
segment in the query except the one being edited. This lets custom value
dropdowns render choices that depend on the other tokens present — for example
defaulting a second date bound to complement the first when building a range.
