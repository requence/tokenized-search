---
'@requence/tokenized-search': patch
---

Fix double-quoting of typed values in non-strict token dropdown. Quotes around typed-value options are now render-only in the dropdown display, with a single consistent quote-wrap applied on insertion. Surrounding quotes typed by the user are stripped before wrapping to prevent `name:"abc""` when the user already closed the quote.
