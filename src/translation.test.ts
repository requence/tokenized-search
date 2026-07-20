import { describe, expect, test } from 'bun:test'
import { toDisplayQuery, toTechnicalQuery } from './translation.ts'
import type { TokenizedSearchTokenDefinition } from './types.ts'

const tokens: TokenizedSearchTokenDefinition[] = [
  { key: 'status' },
  { key: 'type' },
  { key: 'assignee' },
]

describe('translation — operators pass through', () => {
  test('AND / OR survive toTechnicalQuery', () => {
    expect(toTechnicalQuery('status:open AND status:closed', tokens)).toBe(
      'status:open AND status:closed',
    )
    expect(toTechnicalQuery('type:bug OR type:feature', tokens)).toBe(
      'type:bug OR type:feature',
    )
  })

  test('parentheses survive round-trip', () => {
    const q = '(type:bug OR type:feature) AND assignee:me'
    expect(toTechnicalQuery(q, tokens)).toBe(q)
    expect(toDisplayQuery(q, tokens)).toBe(q)
  })

  test('lowercase and/or is left as literal text', () => {
    expect(toTechnicalQuery('type:bug or type:feature', tokens)).toBe(
      'type:bug or type:feature',
    )
  })
})
