---
'@requence/tokenized-search': minor
---

Reopen the key-suggestion dropdown after selecting any token value, not just
strict tokens. Previously non-strict tokens (e.g. exclusive ones like Status)
closed the dropdown on selection; now every value pick keeps it open with the
remaining key suggestions, filtering out already-used exclusive keys. Free-typed
values are excluded so the Enter-to-search flow still closes the dropdown.
