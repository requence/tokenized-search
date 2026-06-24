import { parseTokenizedSearch } from './parser.ts'
import type { TokenizedSearchTokenDefinition } from './types.ts'

/**
 * Convert a display-form query string (using labels) to the technical form
 * (using keys/values) suitable for URL params or `onSearch` callbacks.
 */
export function toTechnicalQuery(
  rawText: string,
  tokens: TokenizedSearchTokenDefinition<string>[],
  negationLabel: string = 'not',
): string {
  const tokenKeysAndLabels = tokens.flatMap((t) => [
    t.key,
    ...(t.label ? [t.label] : []),
  ])
  const rawSegments = parseTokenizedSearch<string>(rawText, tokenKeysAndLabels)

  let technicalText = ''
  for (const seg of rawSegments) {
    if (seg.type !== 'token') {
      technicalText += seg.text
      continue
    }

    // Find token definition
    const def = tokens.find(
      (t) =>
        t.key.toLowerCase() === seg.key.toLowerCase() ||
        (t.label && t.label.toLowerCase() === seg.key.toLowerCase()),
    )
    if (!def) {
      technicalText += `${seg.key}:${seg.value}`
      continue
    }

    // Map localized value back to technical value.
    // The parser already strips the "not:" prefix from seg.value and sets
    // seg.negated = true, so we use that flag directly.
    let technicalValue = seg.value
    const negated = !!(seg.negated && def.negatable)
    if (Array.isArray(def.options)) {
      const option = def.options.find(
        (o) =>
          o.value.toLowerCase() === technicalValue.toLowerCase() ||
          (o.label && o.label.toLowerCase() === technicalValue.toLowerCase()),
      )
      if (option) {
        technicalValue = option.value
      }
    }
    if (negated) {
      technicalValue = `not:${technicalValue}`
    }

    const escapedValue = technicalValue.includes(' ')
      ? `"${technicalValue}"`
      : technicalValue
    technicalText += `${def.key}:${escapedValue}`
  }

  return technicalText
}

/**
 * Convert a technical-form query string (using keys/values) to the display
 * form (using labels) for rendering in the TipTap editor.
 */
export function toDisplayQuery(
  technicalText: string,
  tokens: TokenizedSearchTokenDefinition<string>[],
  negationLabel: string = 'not',
): string {
  if (!technicalText) {
    return ''
  }
  const technicalKeys = tokens.map((t) => t.key)
  const rawSegments = parseTokenizedSearch<string>(technicalText, technicalKeys)

  let displayText = ''
  for (const seg of rawSegments) {
    if (seg.type !== 'token') {
      displayText += seg.text
      continue
    }

    const def = tokens.find(
      (t) => t.key.toLowerCase() === seg.key.toLowerCase(),
    )
    if (!def) {
      displayText += `${seg.key}:${seg.value}`
      continue
    }

    // Translate key to label if present
    const keyString = def.label ?? def.key

    // Translate value to localized label if present.
    // The parser already strips "not:" and sets seg.negated = true.
    let valueString = seg.value
    const negated = !!(seg.negated && def.negatable)
    if (Array.isArray(def.options)) {
      const option = def.options.find(
        (o) => o.value.toLowerCase() === valueString.toLowerCase(),
      )
      if (option) {
        valueString = option.label ?? option.value
      }
    }
    if (negated) {
      valueString = `${negationLabel}:${valueString}`
    }

    const escapedValue = valueString.includes(' ')
      ? `"${valueString}"`
      : valueString
    displayText += `${keyString}:${escapedValue}`
  }

  return displayText
}
