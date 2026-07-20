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

/** A boolean operator or grouping parenthesis found between tokens. */
export type OperatorKind = 'and' | 'or' | 'not' | 'open' | 'close'

export interface OperatorSegment {
  type: 'operator'
  /**
   * `and` / `or` are the binary boolean operators and `not` is the unary
   * negation operator (uppercase `AND` / `OR` / `NOT` in the raw text).
   * `open` / `close` are grouping parentheses `(` / `)`. An implicit space
   * between tokens is *not* emitted as an operator — it is inferred as `and`
   * by the expression parser.
   */
  op: OperatorKind
  start: number
  end: number
}

export type TokenizedSearchSegment<K extends string = string> =
  | TokenSegment<K>
  | TextSegment
  | OperatorSegment

// ── Boolean Expression Tree (AST) ─────────────────────────────────────

/**
 * A parsed boolean expression tree derived from the flat segment stream.
 * Precedence is `not:` (token-level) > AND > OR; parentheses override it.
 * An implicit space between operands is treated as AND.
 */
export type SearchAst<K extends string = string> =
  | { type: 'and'; children: SearchAst<K>[] }
  | { type: 'or'; children: SearchAst<K>[] }
  | { type: 'not'; child: SearchAst<K> }
  | { type: 'token'; token: TokenSegment<K> }

export type ExpressionErrorCode =
  | 'unbalanced-open' // a "(" without a matching ")"
  | 'unbalanced-close' // a ")" without a matching "("
  | 'dangling-operator' // an AND/OR with a missing operand
  | 'empty-group' // "()" with nothing inside
  | 'max-nesting-exceeded' // parentheses nested deeper than allowed

export interface ExpressionError {
  code: ExpressionErrorCode
  /** Character offset in the raw text where the problem was detected. */
  start: number
  end: number
}

export interface ParsedExpression<K extends string = string> {
  /**
   * The expression tree, or `null` when the query contains no tokens.
   * Always best-effort: on malformed input the parser recovers and still
   * returns whatever tree it could build, with details in `errors`.
   */
  ast: SearchAst<K> | null
  /** The flat segment stream this tree was built from (backward compatible). */
  segments: TokenizedSearchSegment<K>[]
  /**
   * A human-readable string rendering of the `ast`, useful for debugging and
   * display. Tokens render as `key:value` (with a trailing `!` when negated);
   * nodes render as `AND(…)`, `OR(…)`, `NOT(…)`; an empty tree renders as `∅`.
   */
  expression: string
  /** True when the expression is well-formed (no `errors`). */
  valid: boolean
  errors: ExpressionError[]
}

// ── Component Props ───────────────────────────────────────────────────

export interface TokenizedSearchProps<K extends string = string> {
  /** Token key definitions */
  tokens?: (TokenizedSearchTokenDefinition<K> | null)[]
  /** Current search value (controlled) */
  value?: string
  /** Default value (uncontrolled) */
  defaultValue?: string
  /**
   * Called when the text value changes. Receives the raw text, the flat parsed
   * segments, and the parsed boolean expression tree (`expression.ast`, plus
   * validity/errors). The third argument is always provided; consumers that
   * only need text/segments can ignore it.
   */
  onChange?: (
    value: string,
    segments: TokenizedSearchSegment<K>[],
    expression: ParsedExpression<K>,
  ) => void
  /**
   * Called when the user submits (Enter / submit button, or every change in
   * `autoCommit` mode). Receives the parsed segments, the technical query text,
   * and the parsed boolean expression tree.
   */
  onSearch?: (
    segments: TokenizedSearchSegment<K>[],
    rawText: string,
    expression: ParsedExpression<K>,
  ) => void
  /**
   * Auto-committing mode. When set, `onSearch` fires on every change (with the
   * technical query, once async options have resolved) instead of only on
   * Enter / submit, and the submit button is not rendered.
   */
  autoCommit?: boolean
  /**
   * Enable complex queries: boolean operators (`AND`, `OR`) and grouping
   * parentheses. When `false` (the default), `AND`/`OR` and `(`/`)` carry no
   * special meaning — they are treated as ordinary search text. When `true`,
   * operators are parsed, highlighted, suggested, validated, and exposed as a
   * boolean expression tree (`parseExpression`) via the `onChange` / `onSearch`
   * `expression` argument.
   */
  complex?: boolean
  /** Small variant */
  small?: boolean
  /** Disable the input — blocks editing, dropdowns, and submit */
  disabled?: boolean
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
