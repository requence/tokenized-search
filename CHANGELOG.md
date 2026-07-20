# @requence/tokenized-search

## 1.9.1

### Patch Changes

- f28b385: Make the suggestions popover keyboard navigation wrap around. Pressing
  ArrowUp on the first option now selects the last option, and ArrowDown
  on the last option selects the first.

## 1.9.0

### Minor Changes

- f294f71: Add an opt-in `complex` mode enabling boolean operators (`AND`/`OR`/`NOT`) and
  grouping parentheses. When enabled, operators are parsed, highlighted,
  suggested, and validated, and a boolean expression tree (`parseExpression` →
  `SearchAst`) is exposed as a new third `expression` argument on the `onChange`
  and `onSearch` callbacks. The feature is fully opt-in and backward compatible:
  `complex` defaults to `false`, the `expression` argument is additive, and the
  exported `parseTokenizedSearch` utility leaves operators off by default so
  existing callers are unaffected.

## 1.8.0

### Minor Changes

- 4fb91a3: Add an `autoCommit` prop to `TokenizedSearch`. When set, `onSearch` fires with
  the technical query on every change (including after async option resolution)
  instead of only on Enter/submit, and the submit button is not rendered. This
  enables auto-committing search fields that apply changes without a manual
  button press.

## 1.7.0

### Minor Changes

- 5e4d5b8: Add a `disabled` prop to `TokenizedSearch`. When set, the input becomes
  read-only, dropdowns never open, Enter-submit and keyboard navigation are
  blocked, and the clear/submit buttons are disabled. The container exposes
  `data-disabled` (and `aria-disabled`) for styling via `data-disabled:*`
  Tailwind variants, alongside built-in greyed-out styling.

## 1.6.1

### Patch Changes

- 0e46779: Reset the dropdown highlight when the key-suggestion dropdown reopens after
  selecting a token value. Previously a stale highlight from the value list
  (set via arrow keys or mouse hover) carried over, so pressing Enter picked the
  first key suggestion instead of submitting the search.

## 1.6.0

### Minor Changes

- 2d0b5e2: Reopen the key-suggestion dropdown after selecting any token value, not just
  strict tokens. Previously non-strict tokens (e.g. exclusive ones like Status)
  closed the dropdown on selection; now every value pick keeps it open with the
  remaining key suggestions, filtering out already-used exclusive keys. Free-typed
  values are excluded so the Enter-to-search flow still closes the dropdown.
- 1185b4a: Make custom (`renderDropdown`) dropdowns work with embedded focusable widgets,
  especially in WebKit/Safari.

  - Add `focusOnOpen` to token definitions (default `true` when `renderDropdown`
    is set): focus moves into the custom dropdown when it opens. This takes focus
    off the editor's `contenteditable`, which in WebKit otherwise turns a press
    inside the dropdown into a text-selection drag that cancels the press — so
    clicks on embedded widgets (date pickers, comboboxes) never fired.
  - Dismiss the dropdown on an outside pointer press (plus keyboard tab-out)
    rather than on focus loss. Pressing a control inside the dropdown no longer
    dismisses it even when the browser doesn't focus the pressed element (WebKit
    doesn't focus `<button>`s on click), removing the need for consumers to guard
    controls with `onMouseDown` `preventDefault` — which itself breaks react-aria
    press detection in WebKit.
  - Place the caret at the end of the committed token when a value is selected
    from a custom dropdown that held focus (e.g. `focusOnOpen`). After the
    dropdown unmounts, the caret is set in state first and focus is restored
    synchronously via ProseMirror's `view.focus()` — TipTap's `focus()` command
    defers the DOM focus to a `requestAnimationFrame` on Chrome, which let Chrome
    restore the stale pre-blur selection and drop the cursor onto a token mark
    boundary.
  - Reopen the key-suggestion dropdown after committing a value from a custom
    dropdown, matching the behaviour of picking a value from the built-in
    dropdown (previously custom dropdowns dismissed instead of reopening).
  - The clear button now keeps focus in the emptied editor and reopens the
    key-suggestion dropdown instead of leaving it closed.

## 1.5.0

### Minor Changes

- c351af9: Add an optional `pattern` field to token definitions. A value must match the
  regular expression to be recognized as a token, providing a middle ground
  between `strict` (must match an option) and fully open values — ideal for
  constrained free-form input like dates. Independent of `strict`, and the
  actively-edited token is exempt so it isn't stripped mid-typing.

## 1.4.0

### Minor Changes

- 88197fe: Keep the dropdown open after selecting a strict token value. Instead of
  closing on selection, strict tokens now reopen the key-suggestion dropdown so
  another token can be added immediately without re-triggering. The cursor is
  placed past the trailing space, and mid-query edits skip an existing space so
  the reopened dropdown shows key suggestions rather than re-editing the value.

## 1.3.0

### Minor Changes

- c78ec25: Pass a `siblings` array to the `renderDropdown` callback, exposing every token
  segment in the query except the one being edited. This lets custom value
  dropdowns render choices that depend on the other tokens present — for example
  defaulting a second date bound to complement the first when building a range.

### Patch Changes

- 65f3c36: Fix submit button showing dirty state immediately on mount when initialized
  with a default value or controlled value. The submittedQuery was initialized
  from the raw prop value instead of the derived display-form value, causing a
  mismatch with currentTechnicalQuery.

## 1.2.3

### Patch Changes

- 0550b1b: fixed token tracking in controlled mode

## 1.2.2

### Patch Changes

- c416840: fix spacing

## 1.2.1

### Patch Changes

- a351e4b: fixed negation label

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
