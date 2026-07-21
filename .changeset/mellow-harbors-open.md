---
'@requence/tokenized-search': minor
---

Make all UI dependencies (`react`, `react-dom`, the `@tiptap/*` packages, and
`tailwind-merge`) optional peer dependencies so that installing the package for
core-only usage (`@requence/tokenized-search/core`, e.g. server-side query
parsing) pulls in no UI packages. Projects rendering the `<TokenizedSearch />`
component must now install those packages themselves; the README and docs
include the install command.
