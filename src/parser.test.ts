import { describe, expect, test } from 'bun:test'
import { parseTokenizedSearch } from './parser.ts'
import type { OperatorSegment, TokenSegment } from './types.ts'

const KEYS = ['status', 'type', 'assignee']

const tokens = (raw: string) =>
  parseTokenizedSearch(raw, KEYS, 'not', true).filter(
    (s): s is TokenSegment => s.type === 'token',
  )
const ops = (raw: string) =>
  parseTokenizedSearch(raw, KEYS, 'not', true).filter(
    (s): s is OperatorSegment => s.type === 'operator',
  )

describe('tokenizer — tokens', () => {
  test('recognizes a plain token', () => {
    expect(tokens('status:open')).toEqual([
      expect.objectContaining({ key: 'status', value: 'open' }),
    ])
  })

  test('parens are delimiters, not part of the key or value', () => {
    const t = tokens('(status:open)')
    expect(t).toHaveLength(1)
    expect(t[0]).toMatchObject({ key: 'status', value: 'open' })
  })

  test('token value is not polluted by a trailing close paren', () => {
    expect(tokens('(type:bug OR type:feature)').map((t) => t.value)).toEqual([
      'bug',
      'feature',
    ])
  })
})

describe('tokenizer — operators', () => {
  test('emits open/token/close for a group', () => {
    expect(parseTokenizedSearch('(status:open)', KEYS, 'not', true).map((s) => s.type)).toEqual([
      'operator',
      'token',
      'operator',
    ])
  })

  test('recognizes uppercase AND / OR as operators', () => {
    expect(ops('status:open AND status:open').map((o) => o.op)).toEqual(['and'])
    expect(ops('type:bug OR type:feature').map((o) => o.op)).toEqual(['or'])
  })

  test('lowercase and / or stay literal text, not operators', () => {
    expect(ops('type:bug or type:feature')).toEqual([])
    expect(ops('type:bug and type:feature')).toEqual([])
  })

  test('AND/OR must be standalone words (not substrings)', () => {
    // "ANDES" and "ORG" are not operators.
    expect(ops('type:ANDES ORG')).toEqual([])
  })

  test('parseOperators=false disables operators and paren delimiting', () => {
    const segs = parseTokenizedSearch('(status:open) AND x', KEYS, 'not', false)
    // No operator segments at all.
    expect(segs.some((s) => s.type === 'operator')).toBe(false)
    // Parens are not delimiters, so "(status" is not a recognized key — the
    // whole thing stays plain text.
    expect(segs.some((s) => s.type === 'token')).toBe(false)
    expect(segs.every((s) => s.type === 'text')).toBe(true)
  })

  test('offsets round-trip to the original string', () => {
    const raw = '(status:open)'
    for (const seg of parseTokenizedSearch(raw, KEYS, 'not', true)) {
      if (seg.type === 'operator') {
        expect(raw.slice(seg.start, seg.end)).toBe(seg.op === 'open' ? '(' : ')')
      }
    }
  })
})
