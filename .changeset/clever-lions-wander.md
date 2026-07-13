---
'@requence/tokenized-search': minor
---

Keep the dropdown open after selecting a strict token value. Instead of
closing on selection, strict tokens now reopen the key-suggestion dropdown so
another token can be added immediately without re-triggering. The cursor is
placed past the trailing space, and mid-query edits skip an existing space so
the reopened dropdown shows key suggestions rather than re-editing the value.
