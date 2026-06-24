---
'@requence/tokenized-search': patch
---

Fix quoted values in negated tokens being double-quoted in parsed segments. For inputs like `name:not:"delete"`, the parser now correctly strips surrounding quotes after removing the negation prefix, producing `{ value: "delete", negated: true }` instead of `{ value: "\"delete\"", negated: true }`.
