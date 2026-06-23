// NOTE: local bindings to work around a Bun bundler bug where
// pure `export { X } from './Y'` re-exports produce an index.js
// without actual import statements.
// See: https://github.com/oven-sh/bun/issues/27709
import {
  TokenizedSearch as _TokenizedSearch,
} from './TokenizedSearch.tsx'
import {
  getOptionDisplayText as _getOptionDisplayText,
  parseTokenizedSearch as _parseTokenizedSearch,
} from './parser.ts'
import {
  slots as _slots,
} from './slots.tsx'
import {
  toDisplayQuery as _toDisplayQuery,
  toTechnicalQuery as _toTechnicalQuery,
} from './translation.ts'

export type { SlotProps } from './slots.tsx'
export type {
  DropdownContext,
  SuggestDropdownContext,
  TextSegment,
  TokenOption,
  TokenSegment,
  TokenizedSearchHandle,
  TokenizedSearchProps,
  TokenizedSearchSegment,
  TokenizedSearchTokenDefinition,
  ValueDropdownContext,
} from './types.ts'

const TokenizedSearch = _TokenizedSearch
const parseTokenizedSearch = _parseTokenizedSearch
const getOptionDisplayText = _getOptionDisplayText
const toTechnicalQuery = _toTechnicalQuery
const toDisplayQuery = _toDisplayQuery
const slots = _slots

export {
  TokenizedSearch,
  parseTokenizedSearch,
  getOptionDisplayText,
  toTechnicalQuery,
  toDisplayQuery,
  slots,
}
