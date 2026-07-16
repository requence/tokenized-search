---
'@requence/tokenized-search': minor
---

Make custom (`renderDropdown`) dropdowns work with embedded focusable widgets,
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
