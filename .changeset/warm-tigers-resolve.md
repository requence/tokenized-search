---
'@requence/tokenized-search': minor
---

Add async token value resolution. When text containing async token labels
is pasted or loaded on a fresh page (e.g. `Reference:Gekko-Co`), the
component now automatically calls the token's `options()` function to
resolve display labels back to their technical values. Submit is disabled
with `aria-busy` during resolution to prevent emitting unresolved values.
The `id` field on `TokenSegment` distinguishes resolved options from
free-text input. Also adds the `optionValueMap` cache parameter to
`toTechnicalQuery` for consistent resolution across all code paths.
