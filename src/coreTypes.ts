// Pure, environment-agnostic types shared by the parser and expression
// modules. This module must stay free of React (or any other UI) imports —
// it is part of the `@requence/tokenized-search/core` entry, which is safe
// to consume from server-side code.

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
