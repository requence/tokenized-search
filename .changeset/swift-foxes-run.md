---
'@requence/tokenized-search': patch
---

Fix `parseTokenizedSearch` not recognizing the `not:` negation prefix when parsing raw text. Previously, `name:not:"test"` was parsed as `{ value: 'not:"test"' }` instead of `{ value: "test", negated: true }`. This caused URL-persisted search params with negated tokens to lose their negation on page reload.
