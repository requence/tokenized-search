# @requence/tokenized-search

## 1.1.1

### Patch Changes

- [`ad793c5`](https://github.com/requence/tokenized-search/commit/ad793c5c405ee31b791b7a9ca46e019905ee9bda) Thanks [@Torsten85](https://github.com/Torsten85)! - Fix double-quoting of typed values in non-strict token dropdown. Quotes around typed-value options are now render-only in the dropdown display, with a single consistent quote-wrap applied on insertion. Surrounding quotes typed by the user are stripped before wrapping to prevent `name:"abc""` when the user already closed the quote.

## 1.1.0

### Minor Changes

- [`f6dca4d`](https://github.com/requence/tokenized-search/commit/f6dca4d25296ca5653c5f4aff7023a40b0221cbc) Thanks [@Torsten85](https://github.com/Torsten85)! - Add free-text value option to dropdown for non-strict negatable tokens. When typing a value for a token without predefined options (e.g. `name:abc`), the typed text now appears as a quoted selectable option above the negation separator. Pressing Enter/Tab prefers the negate option when the typed text exactly matches the negation label. The separator before the "Not" option is hidden when it is the only item.
