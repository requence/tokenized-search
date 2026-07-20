import type {
  OperatorSegment,
  TokenOption,
  TokenizedSearchSegment,
} from './types.ts'

const sQuote = String.fromCharCode(39)

/** The literal text an operator segment renders back to. */
export function operatorText(op: OperatorSegment['op']): string {
  switch (op) {
    case 'and':
      return 'AND'
    case 'or':
      return 'OR'
    case 'not':
      return 'NOT'
    case 'open':
      return '('
    case 'close':
      return ')'
  }
}

/** Resolve the display text for a token option (label ?? value). */
export function getOptionDisplayText(option: TokenOption): string {
  return option.label ?? option.value
}

/**
 * Check if a character is a space (regular or non-breaking).
 * ProseMirror/TipTap uses \u00A0 (non-breaking space) instead of regular spaces.
 */
export function isSpace(ch: string): boolean {
  return ch === ' ' || ch === '\u00A0'
}

/**
 * Check if a character delimits a token \u2014 whitespace or a grouping paren.
 * Parens must break key/value scanning so `(status:open)` is recognized as
 * `(` + token + `)` rather than a key literally named `(status`.
 */
export function isDelimiter(ch: string): boolean {
  return isSpace(ch) || ch === '(' || ch === ')'
}

/**
 * Split a run of plain (non-token) text into text and operator segments.
 * Recognizes grouping parens `(` / `)` anywhere, and the boolean keywords
 * `AND` / `OR` only when they appear uppercase as standalone words (mirroring
 * GitHub \u2014 lowercase `and` / `or` stay literal search text). Offsets are
 * emitted relative to `base`, the position of `text` in the original string.
 */
function splitPlainText<K extends string>(
  text: string,
  base: number,
  out: TokenizedSearchSegment<K>[],
): void {
  let runStart = 0
  let i = 0

  const flushText = (end: number): void => {
    if (end > runStart) {
      out.push({
        type: 'text',
        text: text.slice(runStart, end),
        start: base + runStart,
        end: base + end,
      })
    }
  }

  while (i < text.length) {
    const ch = text[i]

    if (ch === '(' || ch === ')') {
      flushText(i)
      out.push({
        type: 'operator',
        op: ch === '(' ? 'open' : 'close',
        start: base + i,
        end: base + i + 1,
      })
      i++
      runStart = i
      continue
    }

    // Standalone uppercase AND / OR / NOT keyword?
    if (ch === 'A' || ch === 'O' || ch === 'N') {
      const prev = i === 0 ? undefined : text[i - 1]
      const prevOk = prev === undefined || isDelimiter(prev)
      if (prevOk) {
        let op: 'and' | 'or' | 'not' | null = null
        let len = 0
        if (text.slice(i, i + 3) === 'AND') {
          op = 'and'
          len = 3
        } else if (text.slice(i, i + 3) === 'NOT') {
          op = 'not'
          len = 3
        } else if (text.slice(i, i + 2) === 'OR') {
          op = 'or'
          len = 2
        }
        if (op) {
          const after = text[i + len]
          if (after === undefined || isDelimiter(after)) {
            flushText(i)
            out.push({
              type: 'operator',
              op,
              start: base + i,
              end: base + i + len,
            })
            i += len
            runStart = i
            continue
          }
        }
      }
    }

    i++
  }

  flushText(text.length)
}

/**
 * Split a text string into groups based on whitespace, respecting quotes.
 * Unquoted words become individual items, quoted strings stay as one item
 * with the quotes stripped. Supports both double and single quotes.
 *
 * Examples:
 *   'abc def ghi'     → ['abc', 'def', 'ghi']
 *   'abc "def ghi"'   → ['abc', 'def ghi']
 *   "abc 'def ghi'"   → ['abc', 'def ghi']
 */
export function splitTextByQuotes(text: string): string[] {
  const results: string[] = []
  let i = 0

  while (i < text.length) {
    // Skip whitespace
    while (i < text.length && /\s/.test(text[i])) {
      i++
    }
    if (i >= text.length) {
      break
    }

    const ch = text[i]
    if (ch === '"' || ch === sQuote) {
      // Quoted group — find matching close quote
      const closeIndex = text.indexOf(ch, i + 1)
      if (closeIndex !== -1) {
        const inner = text.slice(i + 1, closeIndex).trim()
        if (inner.length > 0) {
          results.push(inner)
        }
        i = closeIndex + 1
      } else {
        // No closing quote — treat rest as one group
        const rest = text.slice(i + 1).trim()
        if (rest.length > 0) {
          results.push(rest)
        }
        break
      }
    } else {
      // Unquoted word — collect until whitespace or quote
      let end = i
      while (end < text.length && !/\s/.test(text[end])) {
        end++
      }
      results.push(text.slice(i, end))
      i = end
    }
  }

  return results
}

/**
 * Parse a search string into segments of recognized `key:value` tokens
 * and plain text. Exported for consumers who need the structured form.
 */
export function parseTokenizedSearch<K extends string>(
  rawText: string,
  tokenKeys: string[],
  negationLabel: string = 'not',
  parseOperators: boolean = false,
): TokenizedSearchSegment<K>[] {
  const text = rawText.replace(/\u00A0/g, ' ')
  const segments: TokenizedSearchSegment<K>[] = []
  const keySet = new Set(tokenKeys.map((k) => k.toLowerCase()))
  const notPrefix = negationLabel.toLowerCase() + ':'

  // When operators are off, parens carry no meaning: only whitespace delimits
  // tokens, and plain text is never split into operator segments.
  const isBoundary = parseOperators ? isDelimiter : isSpace
  const flushPlain = (from: number, to: number): void => {
    if (to <= from) {
      return
    }
    if (parseOperators) {
      splitPlainText(text.slice(from, to), from, segments)
    } else {
      segments.push({
        type: 'text',
        text: text.slice(from, to),
        start: from,
        end: to,
      })
    }
  }

  let i = 0
  let plainStart = 0

  while (i < text.length) {
    // Try to match a key:value pattern at position i
    const colonIndex = text.indexOf(':', i)
    if (colonIndex === -1) {
      break
    }

    // Walk backwards from colon to find the key start — must be preceded by
    // start-of-string or whitespace
    let keyStart = colonIndex
    while (keyStart > 0 && !isBoundary(text[keyStart - 1])) {
      keyStart--
    }

    const key = text.slice(keyStart, colonIndex) as K
    if (!keySet.has(key.toLowerCase()) || key.length === 0) {
      i = colonIndex + 1
      continue
    }

    // Find value end — next space or end of string, respecting quotes and negation prefix
    let valueEnd = colonIndex + 1

    // Skip the negation prefix if present. In complex mode, per-token
    // negation is disabled — negation is expressed with the NOT operator — so
    // the prefix is left as part of the value.
    let hasNot = false
    if (
      !parseOperators &&
      text.slice(valueEnd, valueEnd + notPrefix.length).toLowerCase() === notPrefix &&
      valueEnd + notPrefix.length <= text.length
    ) {
      hasNot = true
      valueEnd += notPrefix.length
    }

    if (
      valueEnd < text.length &&
      (text[valueEnd] === '"' || text[valueEnd] === sQuote)
    ) {
      const quote = text[valueEnd]
      valueEnd++ // skip opening quote
      while (valueEnd < text.length && text[valueEnd] !== quote) {
        valueEnd++
      }
      if (valueEnd < text.length) {
        valueEnd++ // include closing quote
      }
    } else {
      while (valueEnd < text.length && !isBoundary(text[valueEnd])) {
        valueEnd++
      }
    }

    let value = text.slice(colonIndex + 1 + (hasNot ? notPrefix.length : 0), valueEnd)
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    } else if (value.startsWith(sQuote) && value.endsWith(sQuote)) {
      value = value.slice(1, -1)
    }

    // Flush any plain text before this token (splitting out operators/parens
    // when enabled).
    flushPlain(plainStart, keyStart)

    segments.push({
      type: 'token',
      key,
      value,
      ...(hasNot ? { negated: true } : {}),
      start: keyStart,
      end: valueEnd,
    })

    plainStart = valueEnd
    i = valueEnd
  }

  // Flush trailing plain text (splitting out operators/parens when enabled).
  flushPlain(plainStart, text.length)

  return segments
}
