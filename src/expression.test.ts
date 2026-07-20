import { describe, expect, test } from 'bun:test'
import { parseExpression } from './expression.ts'
import { parseTokenizedSearch } from './parser.ts'
import type { ExpressionErrorCode, SearchAst } from './types.ts'

const KEYS = ['status', 'type', 'assignee', 'a', 'b', 'c', 'd']

/** Compact string form of an AST for readable assertions. */
function astStr(ast: SearchAst | null): string {
  if (ast === null) {
    return '∅'
  }
  if (ast.type === 'token') {
    return `${ast.token.key}:${ast.token.value}${ast.token.negated ? '!' : ''}`
  }
  if (ast.type === 'not') {
    return `NOT(${astStr(ast.child)})`
  }
  return `${ast.type.toUpperCase()}(${ast.children.map(astStr).join(', ')})`
}

const parse = (raw: string, maxNesting?: number) =>
  parseExpression(parseTokenizedSearch(raw, KEYS, 'not', true), { maxNesting })

const tree = (raw: string) => astStr(parse(raw).ast)
const codes = (raw: string): ExpressionErrorCode[] =>
  parse(raw).errors.map((e) => e.code)

describe('expression — structure', () => {
  test('empty input', () => {
    const r = parse('')
    expect(r.ast).toBeNull()
    expect(r.valid).toBe(true)
  })

  test('single token', () => {
    expect(tree('status:open')).toBe('status:open')
  })

  test('implicit AND between adjacent tokens', () => {
    expect(tree('status:open assignee:me')).toBe(
      'AND(status:open, assignee:me)',
    )
  })

  test('explicit AND', () => {
    expect(tree('a:1 AND b:2')).toBe('AND(a:1, b:2)')
  })

  test('explicit OR', () => {
    expect(tree('type:bug OR type:feature')).toBe('OR(type:bug, type:feature)')
  })

  test('chained same operator flattens', () => {
    expect(tree('a:1 OR b:2 OR c:3')).toBe('OR(a:1, b:2, c:3)')
    expect(tree('a:1 AND b:2 AND c:3')).toBe('AND(a:1, b:2, c:3)')
  })

  test('unary NOT', () => {
    expect(tree('NOT status:open')).toBe('NOT(status:open)')
  })
})

describe('expression — NOT operator', () => {
  test('NOT binds tighter than AND', () => {
    expect(tree('a:1 AND NOT b:2')).toBe('AND(a:1, NOT(b:2))')
    expect(tree('NOT a:1 AND b:2')).toBe('AND(NOT(a:1), b:2)')
  })

  test('NOT binds tighter than OR', () => {
    expect(tree('NOT a:1 OR b:2')).toBe('OR(NOT(a:1), b:2)')
  })

  test('implicit AND before NOT', () => {
    expect(tree('a:1 NOT b:2')).toBe('AND(a:1, NOT(b:2))')
  })

  test('NOT applies to a group', () => {
    expect(tree('NOT (a:1 OR b:2)')).toBe('NOT(OR(a:1, b:2))')
  })

  test('dangling NOT with no operand', () => {
    expect(codes('status:open AND NOT')).toContain('dangling-operator')
  })
})

describe('expression — precedence & grouping', () => {
  test('AND binds tighter than OR', () => {
    expect(tree('a:1 OR b:2 AND c:3')).toBe('OR(a:1, AND(b:2, c:3))')
    expect(tree('a:1 AND b:2 OR c:3')).toBe('OR(AND(a:1, b:2), c:3)')
  })

  test('parentheses override precedence', () => {
    expect(tree('(a:1 OR b:2) AND c:3')).toBe('AND(OR(a:1, b:2), c:3)')
  })

  test('implicit AND between a group and a token', () => {
    expect(tree('(type:bug OR type:feature) assignee:me')).toBe(
      'AND(OR(type:bug, type:feature), assignee:me)',
    )
  })

  test('github-style nested example', () => {
    expect(
      tree('(type:bug AND assignee:a) OR (type:feature AND assignee:b)'),
    ).toBe('OR(AND(type:bug, assignee:a), AND(type:feature, assignee:b))')
    expect(parse('(type:bug AND assignee:a) OR (type:feature AND assignee:b)').valid).toBe(
      true,
    )
  })
})

describe('expression — error recovery', () => {
  test('unbalanced open paren', () => {
    const r = parse('(type:bug OR type:feature')
    expect(codes('(type:bug OR type:feature')).toContain('unbalanced-open')
    expect(r.valid).toBe(false)
    // still recovers a usable tree
    expect(astStr(r.ast)).toBe('OR(type:bug, type:feature)')
  })

  test('unbalanced close paren', () => {
    expect(codes('type:bug)')).toContain('unbalanced-close')
    expect(tree('type:bug)')).toBe('type:bug')
  })

  test('dangling trailing operator', () => {
    expect(codes('type:bug OR')).toContain('dangling-operator')
    expect(tree('type:bug OR')).toBe('type:bug')
  })

  test('dangling leading operator', () => {
    expect(codes('OR type:bug')).toContain('dangling-operator')
    expect(tree('OR type:bug')).toBe('type:bug')
  })

  test('empty group', () => {
    expect(codes('()')).toContain('empty-group')
    expect(parse('()').ast).toBeNull()
  })

  test('error positions map to the offending characters', () => {
    // These offsets are what the editor's error-highlight mark spans.
    const open = parse('(type:bug').errors.find(
      (e) => e.code === 'unbalanced-open',
    )
    expect([open?.start, open?.end]).toEqual([0, 1])

    const close = parse('type:bug)').errors.find(
      (e) => e.code === 'unbalanced-close',
    )
    expect([close?.start, close?.end]).toEqual([8, 9])

    const dangling = parse('type:bug OR').errors.find(
      (e) => e.code === 'dangling-operator',
    )
    expect([dangling?.start, dangling?.end]).toEqual([9, 11])

    const empty = parse('()').errors.find((e) => e.code === 'empty-group')
    expect([empty?.start, empty?.end]).toEqual([0, 1])
  })

  test('empty group beside a token', () => {
    const r = parse('a:1 AND ()')
    expect(r.errors.map((e) => e.code)).toContain('empty-group')
    // no double-counting as a dangling operator
    expect(r.errors.map((e) => e.code)).not.toContain('dangling-operator')
    expect(astStr(r.ast)).toBe('a:1')
  })
})

describe('expression — nesting limit', () => {
  test('within the limit is valid', () => {
    // 5 levels deep
    expect(parse('(((((a:1)))))').valid).toBe(true)
  })

  test('beyond the limit reports max-nesting-exceeded', () => {
    // 6 levels deep
    const r = parse('((((((a:1))))))')
    expect(r.errors.map((e) => e.code)).toContain('max-nesting-exceeded')
    // reported only once
    expect(
      r.errors.filter((e) => e.code === 'max-nesting-exceeded'),
    ).toHaveLength(1)
    // and still yields the token
    expect(astStr(r.ast)).toBe('a:1')
  })

  test('custom maxNesting', () => {
    expect(parse('((a:1))', 1).errors.map((e) => e.code)).toContain(
      'max-nesting-exceeded',
    )
    expect(parse('(a:1)', 1).valid).toBe(true)
  })
})
