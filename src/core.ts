// The `@requence/tokenized-search/core` entry point: the parsing pipeline
// (string → segments → boolean expression tree) without any React / TipTap
// code in its module graph — safe to consume from server-side code. It is
// the exact same implementation the <TokenizedSearch /> component runs.

// NOTE: local bindings to work around a Bun bundler bug where
// pure `export { X } from './Y'` re-exports produce an index.js
// without actual import statements.
// See: https://github.com/oven-sh/bun/issues/27709
import {
  DEFAULT_MAX_NESTING as _DEFAULT_MAX_NESTING,
  parseExpression as _parseExpression,
} from './expression.ts'
import {
  getOptionDisplayText as _getOptionDisplayText,
  parseTokenizedSearch as _parseTokenizedSearch,
} from './parser.ts'

export type { ParseExpressionOptions } from './expression.ts'
export type {
  ExpressionError,
  ExpressionErrorCode,
  OperatorKind,
  OperatorSegment,
  ParsedExpression,
  SearchAst,
  TextSegment,
  TokenOption,
  TokenSegment,
  TokenizedSearchSegment,
} from './coreTypes.ts'

const parseTokenizedSearch = _parseTokenizedSearch
const parseExpression = _parseExpression
const DEFAULT_MAX_NESTING = _DEFAULT_MAX_NESTING
const getOptionDisplayText = _getOptionDisplayText

export {
  parseTokenizedSearch,
  parseExpression,
  DEFAULT_MAX_NESTING,
  getOptionDisplayText,
}
