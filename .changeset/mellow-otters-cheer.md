---
'@requence/tokenized-search': minor
---

Add an `autoCommit` prop to `TokenizedSearch`. When set, `onSearch` fires with
the technical query on every change (including after async option resolution)
instead of only on Enter/submit, and the submit button is not rendered. This
enables auto-committing search fields that apply changes without a manual
button press.
