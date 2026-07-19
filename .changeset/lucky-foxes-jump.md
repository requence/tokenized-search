---
'@requence/tokenized-search': minor
---

Add a `disabled` prop to `TokenizedSearch`. When set, the input becomes
read-only, dropdowns never open, Enter-submit and keyboard navigation are
blocked, and the clear/submit buttons are disabled. The container exposes
`data-disabled` (and `aria-disabled`) for styling via `data-disabled:*`
Tailwind variants, alongside built-in greyed-out styling.
