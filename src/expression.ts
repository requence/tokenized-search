import type {
  ExpressionError,
  ExpressionErrorCode,
  OperatorSegment,
  ParsedExpression,
  SearchAst,
  TokenSegment,
  TokenizedSearchSegment,
} from './types.ts'

/** Default maximum parenthesis nesting depth (matches GitHub issue search). */
export const DEFAULT_MAX_NESTING = 5

export interface ParseExpressionOptions {
  /** Maximum parenthesis nesting depth before an error is recorded. Default 5. */
  maxNesting?: number
}

type ExprItem<K extends string> = TokenSegment<K> | OperatorSegment

/**
 * Render an expression tree as a human-readable string. Tokens become
 * `key:value` (with a trailing `!` when negated); `and` / `or` / `not` nodes
 * become `AND(…)` / `OR(…)` / `NOT(…)`; a `null` tree becomes `∅`.
 */
export function astToString<K extends string>(
  ast: SearchAst<K> | null,
): string {
  if (ast === null) {
    return '∅'
  }
  if (ast.type === 'token') {
    return `${ast.token.key}:${ast.token.value}${ast.token.negated ? '!' : ''}`
  }
  if (ast.type === 'not') {
    return `NOT(${astToString(ast.child)})`
  }
  return `${ast.type.toUpperCase()}(${ast.children.map(astToString).join(', ')})`
}

/**
 * Build a boolean expression tree from a flat segment stream (as produced by
 * `parseTokenizedSearch`).
 *
 * Precedence is AND over OR, with an implicit AND between adjacent operands;
 * parentheses override it. Free-text segments are ignored by the tree — only
 * `token` leaves and `and` / `or` nodes appear in the AST (the raw text is
 * still available via `segments`).
 *
 * The parser is tolerant: it never throws. On malformed input (unbalanced
 * parens, dangling operators, empty groups, over-nesting) it records an entry
 * in `errors`, recovers, and still returns the best tree it can build.
 */
export function parseExpression<K extends string>(
  segments: TokenizedSearchSegment<K>[],
  options?: ParseExpressionOptions,
): ParsedExpression<K> {
  const maxNesting = options?.maxNesting ?? DEFAULT_MAX_NESTING

  const items: ExprItem<K>[] = segments.filter(
    (s): s is ExprItem<K> => s.type === 'token' || s.type === 'operator',
  )

  const errors: ExpressionError[] = []
  let pos = 0
  let depth = 0
  let maxNestingReported = false

  const peek = (): ExprItem<K> | undefined => items[pos]

  const isOp = (
    s: ExprItem<K> | undefined,
    op: OperatorSegment['op'],
  ): boolean => s !== undefined && s.type === 'operator' && s.op === op

  const isPrimaryStart = (s: ExprItem<K> | undefined): boolean =>
    s !== undefined &&
    (s.type === 'token' ||
      (s.type === 'operator' && (s.op === 'open' || s.op === 'not')))

  const addError = (code: ExpressionErrorCode, seg: ExprItem<K>): void => {
    errors.push({ code, start: seg.start, end: seg.end })
  }

  const parsePrimary = (): SearchAst<K> | null => {
    const s = peek()
    if (s === undefined) {
      return null
    }

    if (s.type === 'operator' && s.op === 'open') {
      pos++ // consume "("
      depth++
      if (depth > maxNesting && !maxNestingReported) {
        addError('max-nesting-exceeded', s)
        maxNestingReported = true
      }

      // Empty group "()"
      const next = peek()
      if (isOp(next, 'close')) {
        addError('empty-group', s)
        pos++ // consume ")"
        depth--
        return null
      }

      const inner = parseOr()
      const close = peek()
      if (isOp(close, 'close')) {
        pos++ // consume ")"
      } else {
        addError('unbalanced-open', s)
      }
      depth--
      return inner
    }

    if (s.type === 'token') {
      pos++
      return { type: 'token', token: s }
    }

    // An operator (AND / OR / stray close) where an operand was expected.
    return null
  }

  // Unary NOT — binds tighter than AND. `NOT a`, `a AND NOT b`, `NOT (a OR b)`.
  const parseNot = (): SearchAst<K> | null => {
    const s = peek()
    if (s !== undefined && s.type === 'operator' && s.op === 'not') {
      pos++ // consume NOT
      const errCountBefore = errors.length
      const child = parseNot() // allow NOT chains and NOT before a group
      if (child === null) {
        if (errors.length === errCountBefore) {
          addError('dangling-operator', s)
        }
        return null
      }
      return { type: 'not', child }
    }
    return parsePrimary()
  }

  const parseAnd = (): SearchAst<K> | null => {
    const children: SearchAst<K>[] = []
    const first = parseNot()
    if (first) {
      children.push(first)
    }

    while (true) {
      const s = peek()
      if (s === undefined) {
        break
      }

      if (isOp(s, 'and')) {
        pos++ // consume AND
        const missingLeft = children.length === 0
        const errCountBefore = errors.length
        const right = parseNot()
        if (right) {
          children.push(right)
        }
        const missingRight = right === null && errors.length === errCountBefore
        if (missingLeft || missingRight) {
          addError('dangling-operator', s)
        }
        continue
      }

      if (isPrimaryStart(s)) {
        // Adjacent operands — implicit AND.
        const right = parseNot()
        if (right) {
          children.push(right)
        }
        continue
      }

      break // OR or a close paren — not ours to consume here.
    }

    if (children.length === 0) {
      return null
    }
    if (children.length === 1) {
      return children[0]
    }
    return { type: 'and', children }
  }

  function parseOr(): SearchAst<K> | null {
    const children: SearchAst<K>[] = []
    const first = parseAnd()
    if (first) {
      children.push(first)
    }

    while (true) {
      const s = peek()
      if (s === undefined) {
        break
      }

      if (isOp(s, 'or')) {
        pos++ // consume OR
        const missingLeft = children.length === 0
        const errCountBefore = errors.length
        const right = parseAnd()
        if (right) {
          children.push(right)
        }
        const missingRight = right === null && errors.length === errCountBefore
        if (missingLeft || missingRight) {
          addError('dangling-operator', s)
        }
        continue
      }

      break
    }

    if (children.length === 0) {
      return null
    }
    if (children.length === 1) {
      return children[0]
    }
    return { type: 'or', children }
  }

  // Top level: parse one-or-more expressions, flagging stray closing parens,
  // and AND together anything that survives (defends against odd recoveries).
  const parts: SearchAst<K>[] = []
  while (pos < items.length) {
    const before = pos
    const s = peek()
    if (isOp(s, 'close')) {
      addError('unbalanced-close', s as OperatorSegment)
      pos++
      continue
    }
    const node = parseOr()
    if (node) {
      parts.push(node)
    }
    if (pos === before) {
      pos++ // guarantee forward progress on any unexpected item
    }
  }

  let ast: SearchAst<K> | null
  if (parts.length === 0) {
    ast = null
  } else if (parts.length === 1) {
    ast = parts[0]
  } else {
    ast = { type: 'and', children: parts }
  }

  return {
    ast,
    segments,
    expression: astToString(ast),
    valid: errors.length === 0,
    errors,
  }
}
