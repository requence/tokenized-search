import type { ReactNode } from 'react'

// ── Token Definition ──────────────────────────────────────────────────

export interface TokenizedSearchTokenDefinition<K extends string = string> {
  /** The key name, e.g. "status", "source", "customer" */
  key: K
  /** Human-readable label shown in the key suggestion dropdown. Defaults to `key`. */
  label?: string
  /** Optional icon to show in the key suggestion dropdown */
  icon?: ReactNode
  /** If true, only one of this key is allowed in the query. Default false. */
  exclusive?: boolean
  /** If true, the value must match one of the fetched options. Default false. */
  strict?: boolean
  /**
   * If set, the value must match this regular expression to be recognized as a
   * token. Independent of `strict`: use it for free-form-but-constrained values
   * like dates. Example: /^\d{4}-\d{2}-\d{2}$/ for `created:2026-07-15`.
   */
  pattern?: RegExp
  /** If true, a "Not" option is shown in the value dropdown, enabling negation (e.g. `status:not:expired`). */
  negatable?: boolean
  /**
   * Options for this token's values. Can be:
   * - A static array of options
   * - A function `(query, signal) => TokenOption[] | Promise<TokenOption[]>`
   */
  options?:
    | TokenOption[]
    | ((
        query: string,
        signal: AbortSignal,
      ) => TokenOption[] | Promise<TokenOption[]>)
  /** Optional custom dropdown renderer */
  renderDropdown?: (props: {
    value: string
    /**
     * The other token segments currently in the query (every token except the
     * one being edited). Useful for rendering choices that depend on sibling
     * tokens — e.g. defaulting a second date bound to complement the first.
     */
    siblings: TokenSegment[]
    onChange: (newValue: string, closeDropdown?: boolean) => void
    close: () => void
  }) => ReactNode
  /**
   * Only relevant together with `renderDropdown`. When the custom dropdown
   * opens, move focus into it (focuses its first focusable element).
   *
   * This takes focus off the search editor's `contenteditable`. In WebKit /
   * Safari, pressing an element while the editor still holds focus starts the
   * editor's text-selection drag, which captures the pointer and cancels the
   * press — so clicks on embedded widgets (date pickers, comboboxes, …) never
   * fire. Focusing the dropdown on open avoids that entirely, and keeps the
   * popover open (focus stays within the widget).
   *
   * Defaults to `true` when `renderDropdown` is set. Set to `false` for custom
   * dropdowns that must keep focus in the editor (e.g. ones driven purely by
   * continued typing).
   */
  focusOnOpen?: boolean
}

// ── Token Option ──────────────────────────────────────────────────────

export interface TokenOption {
  /** The data value (internal key, emitted in onSearch). */
  value: string
  /**
   * Display text shown in the dropdown.
   * If omitted, `value` is used. Must be a single word (no spaces).
   */
  label?: string
  /** Optional identifier passed through to onSearch results. */
  id?: string
}

// ── Parsed Segments ───────────────────────────────────────────────────

export interface TokenSegment<K extends string = string> {
  type: 'token'
  key: K
  value: string
  /** The option id, if the matched option had one. */
  id?: string
  /** True if the token was negated (e.g. starts with "not:") */
  negated?: boolean
  start: number
  end: number
}

export interface TextSegment {
  type: 'text'
  text: string
  start: number
  end: number
}

export type TokenizedSearchSegment<K extends string = string> =
  | TokenSegment<K>
  | TextSegment

// ── Component Props ───────────────────────────────────────────────────

export interface TokenizedSearchProps<K extends string = string> {
  /** Token key definitions */
  tokens?: (TokenizedSearchTokenDefinition<K> | null)[]
  /** Current search value (controlled) */
  value?: string
  /** Default value (uncontrolled) */
  defaultValue?: string
  /** Called when the text value changes */
  onChange?: (value: string, segments: TokenizedSearchSegment<K>[]) => void
  /** Called when user presses Enter to submit. Receives parsed segments and raw query text. */
  onSearch?: (segments: TokenizedSearchSegment<K>[], rawText: string) => void
  /** Small variant */
  small?: boolean
  className?: string
  /**
   * Called when a key is pressed and the dropdown is not open.
   * Call `event.preventDefault()` to suppress Enter-submit.
   */
  onKeyDown?: (event: React.KeyboardEvent) => void
  /** Ref exposing imperative methods like submit() */
  ref?: React.Ref<TokenizedSearchHandle>
  autoFocus?: boolean
  /** Compound sub-components for styling and content */
  children?: ReactNode
}

export interface TokenizedSearchHandle {
  /** Programmatically submit the search (same as pressing Enter) */
  submit: () => void
}

// ── Internal Dropdown Context Types ───────────────────────────────────

export interface ValueDropdownContext<K extends string> {
  mode: 'value'
  key: K
  partialValue: string
  /** What the user typed after the colon — used for client-side filtering */
  filterText: string
  replaceStart: number
  replaceEnd: number
}

export interface SuggestDropdownContext {
  mode: 'suggest'
  insertAt: number
  partialKey: string
}

export type DropdownContext<K extends string> =
  | ValueDropdownContext<K>
  | SuggestDropdownContext
