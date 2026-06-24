---
'@requence/tokenized-search': minor
---

Add free-text value option to dropdown for non-strict negatable tokens. When typing a value for a token without predefined options (e.g. `name:abc`), the typed text now appears as a quoted selectable option above the negation separator. Pressing Enter/Tab prefers the negate option when the typed text exactly matches the negation label. The separator before the "Not" option is hidden when it is the only item.
