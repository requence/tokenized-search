# @requence/tokenized-search

## 1.2.0

### Minor Changes

- [`7164443`](https://github.com/requence/tokenized-search/commit/716444376a5dbd63cf26dab91795c6e61ce4c4dd) Thanks [@Torsten85](https://github.com/Torsten85)! - Add async token value resolution. When text containing async token labels
  is pasted or loaded on a fresh page (e.g. `Reference:Gekko-Co`), the
  component now automatically calls the token's `options()` function to
  resolve display labels back to their technical values. Submit is disabled
  with `aria-busy` during resolution to prevent emitting unresolved values.
  The `id` field on `TokenSegment` distinguishes resolved options from
  free-text input. Also adds the `optionValueMap` cache parameter to
  `toTechnicalQuery` for consistent resolution across all code paths.

## 1.1.4

### Patch Changes

- [`2128bb3`](https://github.com/requence/tokenized-search/commit/2128bb34e60596d20100de891b0451b976b492bf) Thanks [@Torsten85](https://github.com/Torsten85)! - Fix editing inside token values not triggering search update. When manually
  editing a resolved token value (e.g. changing `Name:"A"` to `Name:"B"`) and
  pressing Enter, the dropdown was consuming the keypress without submitting.
  Also fix negation being silently dropped in `toTechnicalQuery` and
  `toDisplayQuery` because the parser already strips the `not:` prefix from
  the value — both functions now use `seg.negated` directly.

## 1.1.3

### Patch Changes

- [`3a3d2f1`](https://github.com/requence/tokenized-search/commit/3a3d2f1a077dab8221f9312bdd91cf8b6b736550) Thanks [@Torsten85](https://github.com/Torsten85)! - Fix `parseTokenizedSearch` not recognizing the `not:` negation prefix when parsing raw text. Previously, `name:not:"test"` was parsed as `{ value: 'not:"test"' }` instead of `{ value: "test", negated: true }`. This caused URL-persisted search params with negated tokens to lose their negation on page reload.

## 1.1.2

### Patch Changes

- [`7ddd4c5`](https://github.com/requence/tokenized-search/commit/7ddd4c50525f8bab7700cf7d19ca1a78444ce8eb) Thanks [@Torsten85](https://github.com/Torsten85)! - Fix quoted values in negated tokens being double-quoted in parsed segments. For inputs like `name:not:"delete"`, the parser now correctly strips surrounding quotes after removing the negation prefix, producing `{ value: "delete", negated: true }` instead of `{ value: "\"delete\"", negated: true }`.

## 1.1.1

### Patch Changes

- [`ad793c5`](https://github.com/requence/tokenized-search/commit/ad793c5c405ee31b791b7a9ca46e019905ee9bda) Thanks [@Torsten85](https://github.com/Torsten85)! - Fix double-quoting of typed values in non-strict token dropdown. Quotes around typed-value options are now render-only in the dropdown display, with a single consistent quote-wrap applied on insertion. Surrounding quotes typed by the user are stripped before wrapping to prevent `name:"abc""` when the user already closed the quote.

## 1.1.0

### Minor Changes

- [`f6dca4d`](https://github.com/requence/tokenized-search/commit/f6dca4d25296ca5653c5f4aff7023a40b0221cbc) Thanks [@Torsten85](https://github.com/Torsten85)! - Add free-text value option to dropdown for non-strict negatable tokens. When typing a value for a token without predefined options (e.g. `name:abc`), the typed text now appears as a quoted selectable option above the negation separator. Pressing Enter/Tab prefers the negate option when the typed text exactly matches the negation label. The separator before the "Not" option is hidden when it is the only item.
