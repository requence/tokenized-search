import type { TokenOption, TokenizedSearchSegment } from './types.ts'

const sQuote = String.fromCharCode(39)

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
): TokenizedSearchSegment<K>[] {
  const text = rawText.replace(/\u00A0/g, ' ')
  const segments: TokenizedSearchSegment<K>[] = []
  const keySet = new Set(tokenKeys.map((k) => k.toLowerCase()))

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
    while (keyStart > 0 && !isSpace(text[keyStart - 1])) {
      keyStart--
    }

    const key = text.slice(keyStart, colonIndex) as K
    if (!keySet.has(key.toLowerCase()) || key.length === 0) {
      i = colonIndex + 1
      continue
    }

    // Find value end — next space or end of string, respecting quotes and not: prefix
    let valueEnd = colonIndex + 1

    // Skip a `not:` negation prefix if present
    let hasNot = false
    if (
      text.slice(valueEnd, valueEnd + 4).toLowerCase() === 'not:' &&
      valueEnd + 4 <= text.length
    ) {
      hasNot = true
      valueEnd += 4
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
      while (valueEnd < text.length && !isSpace(text[valueEnd])) {
        valueEnd++
      }
    }

    let value = text.slice(colonIndex + 1 + (hasNot ? 4 : 0), valueEnd)
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    } else if (value.startsWith(sQuote) && value.endsWith(sQuote)) {
      value = value.slice(1, -1)
    }

    // Flush any plain text before this token
    if (keyStart > plainStart) {
      segments.push({
        type: 'text',
        text: text.slice(plainStart, keyStart),
        start: plainStart,
        end: keyStart,
      })
    }

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

  // Flush trailing plain text
  if (plainStart < text.length) {
    segments.push({
      type: 'text',
      text: text.slice(plainStart),
      start: plainStart,
      end: text.length,
    })
  }

  return segments
}
