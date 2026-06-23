import { Mark, mergeAttributes } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import History from '@tiptap/extension-history'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { EditorContent, useEditor } from '@tiptap/react'
import {
  Fragment,
  useCallback,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { twMerge } from 'tailwind-merge'

import { collectSlots } from './collectSlots.ts'
import {
  getOptionDisplayText,
  isSpace,
  parseTokenizedSearch,
  splitTextByQuotes,
} from './parser.ts'
import { slots } from './slots.tsx'
import { toDisplayQuery, toTechnicalQuery } from './translation.ts'
import type {
  DropdownContext,
  TokenOption,
  TokenSegment,
  TokenizedSearchProps,
  TokenizedSearchSegment,
  TokenizedSearchTokenDefinition,
  ValueDropdownContext,
} from './types.ts'

// ── Custom Tiptap Mark extension for token highlighting ────────────────

function createTokenMark(name: string, attr: string, className: string) {
  return Mark.create({
    name,
    addAttributes() {
      return {}
    },
    parseHTML() {
      return [{ tag: `span[${attr}]` }]
    },
    renderHTML({ HTMLAttributes }) {
      return [
        'span',
        mergeAttributes(HTMLAttributes, { [attr]: '', class: className }),
        0,
      ]
    },
  })
}

// ── Inline single-line Document that prevents Enter from creating paragraphs ──

const SingleLineDocument = Document.extend({
  content: 'block',
})

// ── Highlight match sub-component ─────────────────────────────────────

function HighlightMatch({
  text,
  query,
  className,
}: {
  text: string
  query: string
  className?: string
}) {
  if (!query) {
    return <>{text}</>
  }

  const lower = text.toLowerCase()
  const index = lower.indexOf(query.toLowerCase())
  if (index === -1) {
    return <>{text}</>
  }

  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)

  return (
    <>
      {before}
      <span className={twMerge('font-semibold', className)}>{match}</span>
      {after}
    </>
  )
}

// ── Cursor context helpers ────────────────────────────────────────────

const sQuote = String.fromCharCode(39)

/**
 * Determine what dropdown to show based on cursor position.
 * - If cursor is inside a `key:value` → show value options
 * - If cursor is at a word boundary → show available token keys
 */
function getCursorContext<K extends string>(
  rawText: string,
  cursorPos: number,
  tokenKeys: string[],
): DropdownContext<K> | null {
  const text = rawText.replace(/\u00A0/g, ' ')
  const segments = parseTokenizedSearch<K>(text, tokenKeys)

  // Find which segment the cursor is inside
  const seg = segments.find((s) => s.start <= cursorPos && cursorPos <= s.end)
  if (seg?.type === 'token') {
    const colonIndex = seg.start + seg.key.length
    if (cursorPos > colonIndex) {
      // Cursor is in the value part
      let typedAfterColon = text.slice(colonIndex + 1, cursorPos)

      if (
        typedAfterColon.startsWith('"') ||
        typedAfterColon.startsWith(sQuote)
      ) {
        typedAfterColon = typedAfterColon.slice(1)
      }

      return {
        mode: 'value',
        key: seg.key,
        partialValue: '',
        filterText: typedAfterColon,
        replaceStart: seg.start,
        replaceEnd: seg.end,
      }
    }
  }

  // Otherwise, fallback to the word-walking suggestion mode
  let wordStart = cursorPos
  while (wordStart > 0 && !isSpace(text[wordStart - 1])) {
    wordStart--
  }
  const currentWord = text.slice(wordStart, cursorPos)
  return {
    mode: 'suggest',
    insertAt: wordStart,
    partialKey: currentWord,
  }
}

// ── Validation helpers ────────────────────────────────────────────────

/**
 * Check if a value-mode context targets a duplicate exclusive key.
 */
function isExclusiveDuplicate<K extends string>(
  ctx: ValueDropdownContext<K>,
  text: string,
  cursorPos: number,
  tokenKeys: string[],
  tokenDefs: readonly TokenizedSearchTokenDefinition<string>[],
): boolean {
  const key = ctx.key.toLowerCase()
  const def = tokenDefs.find(
    (t) =>
      t.key.toLowerCase() === key || (t.label && t.label.toLowerCase() === key),
  )
  if (!def?.exclusive) {
    return false
  }

  const defKeyLower = def.key.toLowerCase()
  const defLabelLower = def.label?.toLowerCase()

  return parseTokenizedSearch(text, tokenKeys).some((s) => {
    if (s.type !== 'token') {
      return false
    }
    const sk = s.key.toLowerCase()
    const matches =
      sk === defKeyLower || (defLabelLower && sk === defLabelLower)
    return matches && !(s.start <= cursorPos && cursorPos <= s.end)
  })
}

/**
 * Determine which parsed token segments are valid.
 * Returns a Set of segment indices that should be treated as tokens.
 */
function getValidTokenIndices(
  segments: TokenizedSearchSegment<string>[],
  tokenDefs: readonly TokenizedSearchTokenDefinition<string>[],
  strictValuesMap: Map<string, Set<string>>,
  activeKey?: string,
  negationLabel: string = 'not',
): Set<number> {
  const valid = new Set<number>()
  const seenPairs = new Set<string>()
  const seenExclusive = new Set<string>()

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg.type !== 'token' || seg.value.length === 0) {
      continue
    }

    const def = tokenDefs.find(
      (t) =>
        t.key.toLowerCase() === seg.key.toLowerCase() ||
        (t.label && t.label.toLowerCase() === seg.key.toLowerCase()),
    )
    if (!def) {
      continue
    }
    const lk = def.key.toLowerCase()
    const pair = `${lk}:${seg.value.toLowerCase()}`

    if (seenPairs.has(pair)) {
      continue
    }
    seenPairs.add(pair)

    if (def.exclusive) {
      if (seenExclusive.has(lk)) {
        continue
      }
      seenExclusive.add(lk)
    }

    const isActive =
      activeKey &&
      (lk === activeKey.toLowerCase() ||
        (def.label && def.label.toLowerCase() === activeKey.toLowerCase()))
    if (def.strict && !isActive) {
      const validValues = strictValuesMap.get(lk)
      let checkValue = seg.value.toLowerCase()
      if (def.negatable) {
        const localNot = negationLabel.toLowerCase()
        if (localNot && checkValue.startsWith(`${localNot}:`)) {
          checkValue = checkValue.slice(localNot.length + 1)
        } else if (checkValue.startsWith('not:')) {
          checkValue = checkValue.slice(4)
        }
      }
      if (!validValues || !validValues.has(checkValue)) {
        continue
      }
    }

    valid.add(i)
  }

  return valid
}

// ── TipTap mark application ───────────────────────────────────────────

function applyTokenMarks(
  editor: ReturnType<typeof useEditor>,
  tokenKeys: string[],
  tokenDefs: readonly TokenizedSearchTokenDefinition<string>[],
  strictValuesMap: Map<string, Set<string>>,
  activeKey?: string,
  negationLabel: string = 'not',
) {
  if (!editor || editor.isDestroyed || !editor.schema) {
    return
  }

  const text = editor.getText()
  const segments = parseTokenizedSearch(text, tokenKeys)
  const validIndices = getValidTokenIndices(
    segments,
    tokenDefs,
    strictValuesMap,
    activeKey,
    negationLabel,
  )

  const { tr } = editor.state
  const from = 1 // ProseMirror paragraph starts at pos 1
  const textLength = text.length

  const tokenKeyType = editor.schema.marks.tokenKey
  const tokenValueType = editor.schema.marks.tokenValue
  const tokenNegationType = editor.schema.marks.tokenNegation
  if (tokenKeyType) {
    tr.removeMark(from, from + textLength, tokenKeyType)
  }
  if (tokenValueType) {
    tr.removeMark(from, from + textLength, tokenValueType)
  }
  if (tokenNegationType) {
    tr.removeMark(from, from + textLength, tokenNegationType)
  }

  for (let i = 0; i < segments.length; i++) {
    if (!validIndices.has(i)) {
      continue
    }
    const seg = segments[i] as TokenSegment<string>

    const keyEnd = seg.start + seg.key.length + 1
    if (tokenKeyType) {
      tr.addMark(from + seg.start, from + keyEnd, tokenKeyType.create())
    }
    if (seg.value.length > 0) {
      // Check if the value starts with a negation prefix (e.g. "not:")
      const def = tokenDefs.find(
        (t) =>
          t.key.toLowerCase() === seg.key.toLowerCase() ||
          (t.label && t.label.toLowerCase() === seg.key.toLowerCase()),
      )
      const tokenNegationType = editor.schema.marks.tokenNegation
      const localNot = negationLabel.toLowerCase() + ':'
      const valueLower = seg.value.toLowerCase()
      if (
        def?.negatable &&
        tokenNegationType &&
        valueLower.startsWith(localNot)
      ) {
        const negEnd = keyEnd + localNot.length
        tr.addMark(from + keyEnd, from + negEnd, tokenNegationType.create())
        if (tokenValueType && seg.value.length > localNot.length) {
          tr.addMark(from + negEnd, from + seg.end, tokenValueType.create())
        }
      } else if (tokenValueType) {
        tr.addMark(from + keyEnd, from + seg.end, tokenValueType.create())
      }
    }
  }

  tr.setMeta('addToHistory', false)
  tr.setMeta('tokenMarks', true)
  editor.view.dispatch(tr)
}

/**
 * Ensure a space follows every recognized token value in the text.
 * Prevents the cursor from getting stuck inside a token.
 */
function ensureTokenSpacing(text: string, tokenKeys: string[]): string {
  const segments = parseTokenizedSearch(text, tokenKeys)
  let result = ''
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg.type === 'token') {
      result += text.slice(seg.start, seg.end)
      // Check if a space already follows
      const charAfter = text[seg.end]
      if (charAfter !== ' ' && charAfter !== '\u00A0') {
        result += '\u00A0'
      }
    } else {
      result += seg.text
    }
  }
  return result
}

// ── Component ─────────────────────────────────────────────────────────

function TokenizedSearchBase<K extends string = string>({
  tokens: rawTokens = [],
  value: controlledValue,
  defaultValue = '',
  onChange,
  onSearch,
  small,
  className,
  onKeyDown: onKeyDownProp,
  ref,
  autoFocus,
  negationLabel = 'not',
  children,
}: TokenizedSearchProps<K>) {
  const slotConfig = collectSlots(children)
  const isControlled = controlledValue !== undefined
  const tokens = useMemo(
    () => rawTokens.filter(Boolean) as TokenizedSearchTokenDefinition<K>[],
    [rawTokens],
  )
  const tokenKeysAndLabels = useMemo(() => {
    const result: string[] = []
    for (const t of tokens) {
      result.push(t.key)
      if (t.label) {
        result.push(t.label)
      }
    }
    return result
  }, [tokens])
  const initialLocalValue = useMemo(() => {
    const display = toDisplayQuery(defaultValue, tokens, negationLabel)
    return ensureTokenSpacing(display, tokenKeysAndLabels)
  }, [defaultValue, tokens, negationLabel, tokenKeysAndLabels])
  const [internalValue, setInternalValue] = useState(initialLocalValue)
  const value = isControlled ? controlledValue : internalValue

  const [highlighted, setHighlighted] = useState(-1)
  const [options, setOptions] = useState<TokenOption[]>([])
  const [loading, setLoading] = useState(false)
  const [dropdownContext, setDropdownContext] =
    useState<DropdownContext<K> | null>(null)

  // Track whether we're updating externally to avoid echo loops
  const suppressUpdateRef = useRef(false)

  // Suppress focus-triggered dropdown (e.g. when submit button is clicked)
  const suppressFocusRef = useRef(false)

  // Track last submitted value to avoid duplicate submissions
  const lastSubmittedRef = useRef<string | null>(null)
  const [submittedQuery, setSubmittedQuery] = useState<string>(() =>
    toTechnicalQuery(
      defaultValue ?? controlledValue ?? '',
      (rawTokens ?? []).filter(Boolean) as TokenizedSearchTokenDefinition<K>[],
      negationLabel,
    ).trim(),
  )

  // Cache of valid values for strict token keys
  const strictValuesRef = useRef<Map<string, Set<string>>>(new Map())

  // Cache of option value → id mappings per token key
  const optionIdMapRef = useRef<Map<string, Map<string, string>>>(new Map())

  // Cache of option label → technical value mappings per token key
  const optionValueMapRef = useRef<Map<string, Map<string, string>>>(new Map())

  // Dropdown positioning state
  const [dropdownPos, setDropdownPos] = useState<{
    top: number
    left: number
  } | null>(null)

  const prevTokensRef = useRef<TokenizedSearchTokenDefinition<K>[]>(tokens)
  const lastDefaultValueRef = useRef(defaultValue)

  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const focusDropdown = () => {
    if (!dropdownRef.current) {
      return false
    }
    const focusables = dropdownRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusables.length > 0) {
      focusables[0].focus()
      return true
    }
    return false
  }

  const tokenKeyClass = twMerge(
    'rounded-l py-0.5 pl-1 pr-0.5 font-semibold text-blue-600',
    slotConfig.input.tokenKey,
  )
  const tokenValueClass = twMerge(
    'rounded-r py-0.5 pl-0.5 pr-1 text-blue-700',
    slotConfig.input.tokenValue,
  )
  const tokenNegationClass = twMerge(
    'py-0.5 pl-0.5 italic text-blue-500',
    slotConfig.input.tokenNegation,
  )

  const TokenKeyMark = useMemo(
    () => createTokenMark('tokenKey', 'data-token-key', tokenKeyClass),
    [tokenKeyClass],
  )
  const TokenValueMark = useMemo(
    () => createTokenMark('tokenValue', 'data-token-value', tokenValueClass),
    [tokenValueClass],
  )
  const TokenNegationMark = useMemo(
    () =>
      createTokenMark(
        'tokenNegation',
        'data-token-negation',
        tokenNegationClass,
      ),
    [tokenNegationClass],
  )

  const editor = useEditor({
    autofocus: autoFocus ?? false,
    extensions: [
      SingleLineDocument,
      Paragraph.configure({
        HTMLAttributes: { class: 'tokenized-search-paragraph' },
      }),
      Text,
      History,
      TokenKeyMark,
      TokenValueMark,
      TokenNegationMark,
    ],
    content: `<p>${initialLocalValue}</p>`,
    editorProps: {
      attributes: {
        class: 'tokenized-search-editor',
        spellcheck: 'false',
        autocomplete: 'off',
        'data-bwignore': '',
        'data-1p-ignore': '',
        'data-protonpass-ignore': '',
      },
      handleKeyDown: (_view, event) => {
        // Prevent Enter from creating a new paragraph — we handle it ourselves
        if (event.key === 'Enter') {
          return true // swallow the event
        }
        return false
      },
    },
  })

  // ── Update dropdown position from caret ────────────────────────────

  const updateDropdownPosition = useCallback(() => {
    if (!editor || editor.isDestroyed || !editor.view || !dropdownContext) {
      setDropdownPos(null)
      return
    }

    const { from } = editor.state.selection
    try {
      const coords = editor.view.coordsAtPos(from)
      setDropdownPos({ top: coords.bottom + 4, left: coords.left })
    } catch {
      // coordsAtPos can throw if DOM is not ready
    }
  }, [editor, dropdownContext])

  useEffect(() => {
    updateDropdownPosition()
  }, [updateDropdownPosition])

  // ── Dynamic event handlers via useEffect ───────────────────────────

  const lastTextRef = useRef(initialLocalValue)

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return
    }

    const handleTransaction = ({
      transaction,
    }: {
      transaction: { getMeta: (key: string) => unknown }
    }) => {
      if (transaction.getMeta('tokenMarks')) {
        return
      }
      if (suppressUpdateRef.current) {
        return
      }
      if (suppressFocusRef.current) {
        return
      }

      const text = editor.getText()
      const textChanged = text !== lastTextRef.current

      if (textChanged) {
        lastTextRef.current = text
        if (!isControlled) {
          setInternalValue(text)
        }
        onChange?.(text, computeSegments(text))
      }

      // Always re-evaluate dropdown context (covers both text and selection changes)
      const { from, to } = editor.state.selection
      const cursorPos = Math.max(0, from - 1)

      // Suppress dropdown when there is a range selection (e.g. Ctrl+A)
      if (from !== to) {
        setDropdownContext(null)
        return
      }

      let ctx = getCursorContext<K>(text, cursorPos, tokenKeysAndLabels)

      // Suppress dropdown for duplicate exclusive keys
      if (ctx?.mode === 'value') {
        if (
          isExclusiveDuplicate(ctx, text, cursorPos, tokenKeysAndLabels, tokens)
        ) {
          ctx = null
        }
      }

      // If text didn't change (cursor moved via click/arrows), show all options.
      if (ctx && ctx.mode === 'value' && !textChanged) {
        ctx.filterText = ''
      }

      // Apply token marks after text changes
      if (textChanged) {
        const activeKey = ctx?.mode === 'value' ? ctx.key : undefined
        queueMicrotask(() =>
          applyTokenMarks(
            editor,
            tokenKeysAndLabels,
            tokens,
            strictValuesRef.current,
            activeKey,
            negationLabel,
          ),
        )
      }

      if (editor.isFocused) {
        setDropdownContext(ctx)
      } else {
        // Defer checking focus transition to ensure document.activeElement is updated
        setTimeout(() => {
          if (!editor.isFocused) {
            const container = containerRef.current
            const activeEl = document.activeElement
            const isFocusedWithin = container && container.contains(activeEl)
            if (!isFocusedWithin) {
              setDropdownContext(null)
            }
          }
        }, 0)
      }
    }

    const handleFocus = () => {
      if (suppressFocusRef.current) {
        return
      }
      const text = editor.getText()
      const { from, to } = editor.state.selection
      const cursorPos = Math.max(0, from - 1)

      // Suppress dropdown when there is a range selection (e.g. Ctrl+A)
      if (from !== to) {
        return
      }

      let ctx = getCursorContext<K>(text, cursorPos, tokenKeysAndLabels)

      if (ctx?.mode === 'value') {
        if (
          isExclusiveDuplicate(ctx, text, cursorPos, tokenKeysAndLabels, tokens)
        ) {
          ctx = null
        }
      }

      if (ctx && ctx.mode === 'value') {
        ctx.filterText = ''
      }

      const activeKey = ctx?.mode === 'value' ? ctx.key : undefined
      queueMicrotask(() =>
        applyTokenMarks(
          editor,
          tokenKeysAndLabels,
          tokens,
          strictValuesRef.current,
          activeKey,
          negationLabel,
        ),
      )
      setDropdownContext(ctx)
    }

    const handleBlur = () => {
      setTimeout(() => {
        setDropdownContext(null)
        applyTokenMarks(
          editor,
          tokenKeysAndLabels,
          tokens,
          strictValuesRef.current,
          undefined,
          negationLabel,
        )
      }, 150)
    }

    editor.on('transaction', handleTransaction)
    editor.on('focus', handleFocus)
    editor.on('blur', handleBlur)

    return () => {
      editor.off('transaction', handleTransaction)
      editor.off('focus', handleFocus)
      editor.off('blur', handleBlur)
    }
  }, [editor, tokenKeysAndLabels, isControlled, onChange])

  // Pre-populate strict values and option id map from static options
  useMemo(() => {
    for (const def of tokens) {
      if (!Array.isArray(def.options)) {
        continue
      }
      const lk = def.key.toLowerCase()

      const idMap = new Map<string, string>()
      const valMap = new Map<string, string>()
      for (const o of def.options) {
        idMap.set(o.value.toLowerCase(), o.id ?? o.value)
        if (o.label) {
          idMap.set(o.label.toLowerCase(), o.id ?? o.value)
          valMap.set(o.label.toLowerCase(), o.value)
        }
      }
      optionIdMapRef.current.set(lk, idMap)
      if (valMap.size > 0) {
        optionValueMapRef.current.set(lk, valMap)
      }

      if (def.strict) {
        strictValuesRef.current.set(
          lk,
          new Set(
            def.options.flatMap((o) => [
              o.value.toLowerCase(),
              ...(o.label ? [o.label.toLowerCase()] : []),
            ]),
          ),
        )
      }
    }
  }, [tokens])

  // Apply token marks on mount (for defaultValue)
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      queueMicrotask(() =>
        applyTokenMarks(
          editor,
          tokenKeysAndLabels,
          tokens,
          strictValuesRef.current,
          undefined,
          negationLabel,
        ),
      )
    }
  }, [editor, tokenKeysAndLabels])

  // Sync controlled value → editor
  useEffect(() => {
    if (!editor || editor.isDestroyed || !isControlled) {
      return
    }
    const currentText = editor.getText().replace(/\u00A0/g, ' ')
    if (currentText !== controlledValue) {
      suppressUpdateRef.current = true
      editor.commands.setContent(`<p>${controlledValue}</p>`)
      queueMicrotask(() => {
        applyTokenMarks(
          editor,
          tokenKeysAndLabels,
          tokens,
          strictValuesRef.current,
          undefined,
          negationLabel,
        )
        suppressUpdateRef.current = false
      })
    }
  }, [editor, controlledValue, isControlled, tokenKeysAndLabels])

  // Sync defaultValue → editor (for external updates like back/forward navigation or list resets)
  useEffect(() => {
    if (defaultValue !== lastDefaultValueRef.current) {
      lastDefaultValueRef.current = defaultValue
      if (!editor || editor.isDestroyed) {
        return
      }
      // Don't overwrite while the user is actively editing
      if (editor.isFocused) {
        return
      }
      const localValue = ensureTokenSpacing(
        toDisplayQuery(defaultValue, tokens, negationLabel),
        tokenKeysAndLabels,
      )
      const currentText = editor.getText().replace(/\u00A0/g, ' ')
      if (currentText !== localValue) {
        suppressUpdateRef.current = true
        editor.commands.setContent(`<p>${localValue}</p>`)
        queueMicrotask(() => {
          applyTokenMarks(
            editor,
            tokenKeysAndLabels,
            tokens,
            strictValuesRef.current,
            undefined,
            negationLabel,
          )
          suppressUpdateRef.current = false
        })
        if (!isControlled) {
          setInternalValue(localValue)
        }
      }
    }
  }, [editor, defaultValue, isControlled, tokenKeysAndLabels, tokens])

  // Translate search string when tokens (language/labels) change
  useEffect(() => {
    if (!editor || editor.isDestroyed || !prevTokensRef.current) {
      prevTokensRef.current = tokens
      return
    }

    const prevTokens = prevTokensRef.current
    if (prevTokens === tokens) {
      return
    }

    const hasLabelChanged =
      tokens.length !== prevTokens.length ||
      tokens.some((newDef, index) => {
        const oldDef = prevTokens[index]
        if (!oldDef) {
          return true
        }
        if (newDef.key !== oldDef.key) {
          return true
        }
        if (newDef.label !== oldDef.label) {
          return true
        }
        if (Array.isArray(newDef.options) && Array.isArray(oldDef.options)) {
          const oldOptsArray = oldDef.options
          if (newDef.options.length !== oldOptsArray.length) {
            return true
          }
          return newDef.options.some((newOpt, optionIndex) => {
            const oldOpt = oldOptsArray[optionIndex]
            if (!oldOpt) {
              return true
            }
            return (
              newOpt.value !== oldOpt.value || newOpt.label !== oldOpt.label
            )
          })
        }
        return Array.isArray(newDef.options) !== Array.isArray(oldDef.options)
      })

    if (!hasLabelChanged) {
      prevTokensRef.current = tokens
      return
    }

    const currentText = editor.getText()
    if (!currentText) {
      prevTokensRef.current = tokens
      return
    }

    // Build helper structures using old tokens
    const oldTokenKeysAndLabels: string[] = []
    const oldTokenDefsMap = new Map<
      string,
      {
        def: TokenizedSearchTokenDefinition<K>
        valMap: Map<string, string>
      }
    >()

    for (const def of prevTokens) {
      oldTokenKeysAndLabels.push(def.key)
      if (def.label) {
        oldTokenKeysAndLabels.push(def.label)
      }

      const valMap = new Map<string, string>()
      if (Array.isArray(def.options)) {
        for (const o of def.options) {
          valMap.set(o.value.toLowerCase(), o.value)
          if (o.label) {
            valMap.set(o.label.toLowerCase(), o.value)
          }
        }
      }
      const data = { def, valMap }
      oldTokenDefsMap.set(def.key.toLowerCase(), data)
      if (def.label) {
        oldTokenDefsMap.set(def.label.toLowerCase(), data)
      }
    }

    const oldSegments = parseTokenizedSearch<K>(
      currentText,
      oldTokenKeysAndLabels,
    )

    let newText = ''
    for (const seg of oldSegments) {
      if (seg.type !== 'token') {
        newText += seg.text
        continue
      }

      const oldMatch = oldTokenDefsMap.get(seg.key.toLowerCase())
      if (!oldMatch) {
        newText += `${seg.key}:${seg.value}`
        continue
      }

      const { def: oldDef, valMap: oldValMap } = oldMatch
      const technicalValue = oldValMap.get(seg.value.toLowerCase()) ?? seg.value

      const newDef = tokens.find(
        (t) => t.key.toLowerCase() === oldDef.key.toLowerCase(),
      )
      if (!newDef) {
        newText += `${seg.key}:${seg.value}`
        continue
      }

      const newKeyString = newDef.label ?? newDef.key
      let newValueString = technicalValue
      if (Array.isArray(newDef.options)) {
        const matchingNewOption = newDef.options.find(
          (o) => o.value.toLowerCase() === technicalValue.toLowerCase(),
        )
        if (matchingNewOption) {
          newValueString = matchingNewOption.label ?? matchingNewOption.value
        }
      }

      const escapedNewValue = newValueString.includes(' ')
        ? `"${newValueString}"`
        : newValueString

      newText += `${newKeyString}:${escapedNewValue}`
    }

    if (newText !== currentText) {
      suppressUpdateRef.current = true
      editor.commands.setContent(`<p>${newText}</p>`)
      queueMicrotask(() => {
        applyTokenMarks(
          editor,
          tokenKeysAndLabels,
          tokens,
          strictValuesRef.current,
          undefined,
          negationLabel,
        )
        suppressUpdateRef.current = false
      })

      if (!isControlled) {
        setInternalValue(newText)
      }
      const technicalQuery = toTechnicalQuery(
        newText,
        tokens,
        negationLabel,
      ).trim()
      onChange?.(newText, computeSegments(newText))
      lastSubmittedRef.current = technicalQuery
      setSubmittedQuery(technicalQuery)
      onSearch?.(computeSegments(newText), technicalQuery)
    }

    prevTokensRef.current = tokens
  }, [editor, tokens, tokenKeysAndLabels, isControlled, onChange])

  const computeSegments = useCallback(
    (text: string): TokenizedSearchSegment<K>[] => {
      const raw = parseTokenizedSearch<K>(text, tokenKeysAndLabels)
      const validIndices = getValidTokenIndices(
        raw,
        tokens,
        strictValuesRef.current,
        undefined,
        negationLabel,
      )

      return raw.flatMap((seg, i): TokenizedSearchSegment<K>[] => {
        if (seg.type !== 'token') {
          return splitTextByQuotes(seg.text).map((t) => ({
            type: 'text',
            text: t,
            start: seg.start,
            end: seg.end,
          }))
        }

        const def = tokens.find(
          (t) =>
            t.key.toLowerCase() === seg.key.toLowerCase() ||
            (t.label && t.label.toLowerCase() === seg.key.toLowerCase()),
        )
        if (!def) {
          return [
            {
              type: 'text',
              text: `${seg.key}:${seg.value}`,
              start: seg.start,
              end: seg.end,
            },
          ]
        }

        if (seg.value.length === 0) {
          return [
            {
              type: 'text',
              text: `${def.key}:`,
              start: seg.start,
              end: seg.end,
            },
          ]
        }

        if (!validIndices.has(i)) {
          return splitTextByQuotes(`${seg.key}:${seg.value}`).map((t) => ({
            type: 'text',
            text: t,
            start: seg.start,
            end: seg.end,
          }))
        }

        // Map key and value back to their technical counterparts
        let technicalValue = seg.value
        let negated = false

        if (def.negatable) {
          const localNot = negationLabel.toLowerCase() + ':'
          const vLower = seg.value.toLowerCase()
          if (vLower.startsWith(localNot)) {
            technicalValue = seg.value.slice(localNot.length)
            negated = true
          } else if (vLower.startsWith('not:')) {
            technicalValue = seg.value.slice(4)
            negated = true
          }
        }

        const valMap = optionValueMapRef.current.get(def.key.toLowerCase())
        if (valMap) {
          const mappedVal = valMap.get(technicalValue.toLowerCase())
          if (mappedVal) {
            technicalValue = mappedVal
          }
        }

        const idMap = optionIdMapRef.current.get(def.key.toLowerCase())
        const technicalId = idMap?.get(technicalValue.toLowerCase())

        return [
          {
            type: 'token',
            key: def.key,
            value: technicalValue,
            start: seg.start,
            end: seg.end,
            ...(technicalId != null && { id: technicalId }),
            ...(negated && { negated }),
          },
        ]
      })
    },
    [tokenKeysAndLabels, tokens],
  )

  const segments = useMemo(
    () => computeSegments(value),
    [computeSegments, value],
  )

  // ── Imperative handle ───────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
  }))

  // Build the suggestion list of available token keys
  const tokenKeySuggestions = useMemo<TokenOption[]>(() => {
    if (!dropdownContext || dropdownContext.mode !== 'suggest') {
      return []
    }

    const usedKeys = new Set(
      parseTokenizedSearch(value, tokenKeysAndLabels)
        .filter((s): s is TokenSegment<K> => s.type === 'token')
        .map((s) => {
          const def = tokens.find(
            (t) =>
              t.key.toLowerCase() === s.key.toLowerCase() ||
              (t.label && t.label.toLowerCase() === s.key.toLowerCase()),
          )
          return def ? def.key.toLowerCase() : s.key.toLowerCase()
        }),
    )

    return tokens
      .filter((t) => !t.exclusive || !usedKeys.has(t.key.toLowerCase()))
      .map((t) => ({
        value: t.key,
        label: t.label ?? t.key,
      }))
  }, [tokens, dropdownContext, value, tokenKeysAndLabels])

  const abortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // ── Fetch options when dropdown context changes ────────────────────

  const ctxMode = dropdownContext?.mode
  const ctxKey =
    dropdownContext?.mode === 'value' ? dropdownContext.key : undefined
  const ctxPartial =
    dropdownContext?.mode === 'value'
      ? dropdownContext.partialValue
      : dropdownContext?.mode === 'suggest'
        ? dropdownContext.partialKey
        : undefined

  const currentTokenOptions = useMemo(() => {
    if (!ctxKey) {
      return null
    }
    const def = tokens.find(
      (t) =>
        t.key.toLowerCase() === ctxKey.toLowerCase() ||
        (t.label && t.label.toLowerCase() === ctxKey.toLowerCase()),
    )
    return def?.options
  }, [tokens, ctxKey])

  useEffect(() => {
    if (!dropdownContext || dropdownContext.mode === 'suggest') {
      setOptions([])
      setLoading(false)
      return
    }

    const def = tokens.find(
      (t) =>
        t.key.toLowerCase() === dropdownContext.key.toLowerCase() ||
        (t.label &&
          t.label.toLowerCase() === dropdownContext.key.toLowerCase()),
    )

    const cacheOptions = (optionsList: TokenOption[]) => {
      if (!ctxKey) {
        return
      }
      const defKey = tokens.find(
        (t) =>
          t.key.toLowerCase() === ctxKey.toLowerCase() ||
          (t.label && t.label.toLowerCase() === ctxKey.toLowerCase()),
      )?.key
      if (!defKey) {
        return
      }
      const lk = defKey.toLowerCase()

      const idMap = new Map<string, string>()
      const valMap = new Map<string, string>()
      for (const o of optionsList) {
        idMap.set(o.value.toLowerCase(), o.id ?? o.value)
        if (o.label) {
          idMap.set(o.label.toLowerCase(), o.id ?? o.value)
          valMap.set(o.label.toLowerCase(), o.value)
        }
      }
      optionIdMapRef.current.set(lk, idMap)
      if (valMap.size > 0) {
        optionValueMapRef.current.set(lk, valMap)
      }

      if (def?.strict) {
        strictValuesRef.current.set(
          lk,
          new Set(
            optionsList.flatMap((o) => [
              o.value.toLowerCase(),
              ...(o.label ? [o.label.toLowerCase()] : []),
            ]),
          ),
        )
        queueMicrotask(() =>
          applyTokenMarks(
            editor,
            tokenKeysAndLabels,
            tokens,
            strictValuesRef.current,
          ),
        )
      }
    }

    if (!def?.options) {
      setOptions([])
      setLoading(false)
      return
    }

    if (Array.isArray(def.options)) {
      setOptions(def.options)
      setLoading(false)
      setHighlighted(-1)
      cacheOptions(def.options)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setHighlighted(-1)

    const result = def.options(dropdownContext.partialValue, controller.signal)

    if (result instanceof Promise) {
      result
        .then((opts) => {
          if (!controller.signal.aborted) {
            setOptions(opts)
            setLoading(false)
            cacheOptions(opts)
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setOptions([])
            setLoading(false)
          }
        })
    } else {
      setOptions(result)
      setLoading(false)
      cacheOptions(result)
    }

    return () => {
      controller.abort()
    }
  }, [ctxMode, ctxKey, ctxPartial, currentTokenOptions])

  // ── Option selection ───────────────────────────────────────────────

  const selectOption = useEffectEvent((option: TokenOption) => {
    if (!dropdownContext || !editor) {
      return
    }

    const text = editor.getText()

    if (dropdownContext.mode === 'suggest') {
      const { insertAt, partialKey } = dropdownContext
      const insertion = `${option.label ?? option.value}:`
      const before = text.slice(0, insertAt)
      const after = text.slice(insertAt + partialKey.length)
      const next = before + insertion + after

      suppressUpdateRef.current = true
      editor.commands.setContent(`<p>${next}</p>`)
      const cursorPos = insertAt + insertion.length + 1
      editor.commands.setTextSelection(cursorPos)

      if (!isControlled) {
        setInternalValue(next)
      }
      onChange?.(next, computeSegments(next))

      queueMicrotask(() => {
        applyTokenMarks(
          editor,
          tokenKeysAndLabels,
          tokens,
          strictValuesRef.current,
          undefined,
          negationLabel,
        )
        suppressUpdateRef.current = false
        const ctx = getCursorContext<K>(next, cursorPos - 1, tokenKeysAndLabels)
        setDropdownContext(ctx)
      })
      return
    }

    const { key, replaceStart, replaceEnd } = dropdownContext

    if (option.value === '__not__') {
      const notLabel = negationLabel
      const insertion = `${key}:${notLabel}:`
      const before = text.slice(0, replaceStart)
      const after = text.slice(replaceEnd)
      const next = before + insertion + after

      suppressUpdateRef.current = true
      editor.commands.setContent(`<p>${next}</p>`)
      const cursorPos = replaceStart + insertion.length + 1
      editor.commands.setTextSelection(cursorPos)

      if (!isControlled) {
        setInternalValue(next)
      }
      onChange?.(next, computeSegments(next))

      queueMicrotask(() => {
        applyTokenMarks(
          editor,
          tokenKeysAndLabels,
          tokens,
          strictValuesRef.current,
          undefined,
          negationLabel,
        )
        suppressUpdateRef.current = false
        const ctx = getCursorContext<K>(next, cursorPos - 1, tokenKeysAndLabels)
        setDropdownContext(ctx)
      })
      return
    }

    const localNot = negationLabel.toLowerCase()
    const isNegated = dropdownContext.filterText
      .toLowerCase()
      .startsWith(`${localNot}:`)
    const notPrefix = isNegated ? `${negationLabel}:` : ''
    const insertionVal = option.label ?? option.value
    const escapedVal = insertionVal.includes(' ')
      ? `"${insertionVal}"`
      : insertionVal
    const insertion = `${key}:${notPrefix}${escapedVal}`
    const before = text.slice(0, replaceStart)
    const after = text.slice(replaceEnd)

    const needsSpace = after.length === 0 || !isSpace(after[0])
    const next = before + insertion + (needsSpace ? '\u00A0' : '') + after

    suppressUpdateRef.current = true
    editor.commands.setContent(`<p>${next}</p>`)
    const cursorPos = replaceStart + insertion.length + (needsSpace ? 1 : 0) + 1
    editor.commands.setTextSelection(cursorPos)

    if (!isControlled) {
      setInternalValue(next)
    }
    onChange?.(next, computeSegments(next))
    setDropdownContext(null)

    queueMicrotask(() => {
      applyTokenMarks(
        editor,
        tokenKeysAndLabels,
        tokens,
        strictValuesRef.current,
        undefined,
        negationLabel,
      )
      suppressUpdateRef.current = false
    })
  })

  const updateTokenValue = useEffectEvent(
    (newValue: string, closeDropdown: boolean = false) => {
      if (!dropdownContext || dropdownContext.mode !== 'value' || !editor) {
        return
      }

      const text = editor.getText()
      const { key, replaceStart } = dropdownContext

      const segmentsList = parseTokenizedSearch<K>(text, tokenKeysAndLabels)
      const currentSegment = segmentsList.find(
        (s) => s.type === 'token' && s.start === replaceStart,
      )
      const currentReplaceEnd = currentSegment
        ? currentSegment.end
        : dropdownContext.replaceEnd

      const escapedVal = newValue.includes(' ') ? `"${newValue}"` : newValue
      const insertion = `${key}:${escapedVal}`
      const before = text.slice(0, replaceStart)
      const after = text.slice(currentReplaceEnd)

      const needsSpace = closeDropdown
        ? after.length === 0 || !isSpace(after[0])
        : false
      const next = before + insertion + (needsSpace ? '\u00A0' : '') + after

      suppressUpdateRef.current = true
      editor.commands.setContent(`<p>${next}</p>`)
      const cursorPos =
        replaceStart + insertion.length + (needsSpace ? 1 : 0) + 1
      editor.commands.setTextSelection(cursorPos)

      if (!isControlled) {
        setInternalValue(next)
      }
      onChange?.(next, computeSegments(next))

      if (closeDropdown) {
        setDropdownContext(null)
      } else {
        setDropdownContext({
          ...dropdownContext,
          replaceEnd: replaceStart + insertion.length,
          partialValue: newValue,
        })
      }

      queueMicrotask(() => {
        applyTokenMarks(
          editor,
          tokenKeysAndLabels,
          tokens,
          strictValuesRef.current,
          undefined,
          negationLabel,
        )
        suppressUpdateRef.current = false
        if (closeDropdown) {
          suppressFocusRef.current = true
          editor.commands.focus()
          setTimeout(() => {
            suppressFocusRef.current = false
          }, 50)
        }
      })
    },
  )

  // ── Client-side filtering & highlighting ───────────────────────────

  const filterQuery =
    dropdownContext?.mode === 'value'
      ? dropdownContext.filterText
      : dropdownContext?.mode === 'suggest'
        ? dropdownContext.partialKey
        : ''

  const rawOptions =
    dropdownContext?.mode === 'suggest' ? tokenKeySuggestions : options

  const usedValues = useMemo(() => {
    if (!dropdownContext || dropdownContext.mode !== 'value') {
      return new Set<string>()
    }
    const key = dropdownContext.key.toLowerCase()
    const def = tokens.find(
      (t) =>
        t.key.toLowerCase() === key ||
        (t.label && t.label.toLowerCase() === key),
    )
    if (!def) {
      return new Set<string>()
    }

    const defKeyLower = def.key.toLowerCase()
    const defLabelLower = def.label?.toLowerCase()

    return new Set(
      parseTokenizedSearch(value, tokenKeysAndLabels)
        .filter((s): s is TokenSegment<K> => {
          if (s.type !== 'token') {
            return false
          }
          const sk = s.key.toLowerCase()
          const isSameKey =
            sk === defKeyLower || (defLabelLower ? sk === defLabelLower : false)

          return !!(
            isSameKey &&
            !(
              s.start <= dropdownContext.replaceStart &&
              dropdownContext.replaceEnd <= s.end + 1
            )
          )
        })
        .map((s) => {
          const valMap = optionValueMapRef.current.get(def.key.toLowerCase())
          if (valMap) {
            const mappedVal = valMap.get(s.value.toLowerCase())
            if (mappedVal) {
              return mappedVal.toLowerCase()
            }
          }
          return s.value.toLowerCase()
        }),
    )
  }, [dropdownContext, value, tokenKeysAndLabels, tokens])

  const currentTokenDef =
    dropdownContext?.mode === 'value'
      ? tokens.find((t) => {
          const dk = dropdownContext.key.toLowerCase()
          return (
            t.key.toLowerCase() === dk ||
            (t.label !== undefined && t.label.toLowerCase() === dk)
          )
        })
      : undefined

  const activeOptions = useMemo(() => {
    let filtered = rawOptions

    if (usedValues.size > 0) {
      filtered = filtered.filter(
        (opt) => !usedValues.has(opt.value.toLowerCase()),
      )
    }

    const localNot = negationLabel.toLowerCase()
    const isNegated = localNot
      ? filterQuery.toLowerCase().startsWith(`${localNot}:`)
      : false
    const effectiveFilterQuery =
      isNegated && localNot
        ? filterQuery.slice(localNot.length + 1)
        : filterQuery

    if (effectiveFilterQuery) {
      const q = effectiveFilterQuery.toLowerCase()
      filtered = filtered.filter((opt) => {
        const display = getOptionDisplayText(opt).toLowerCase()
        return display.includes(q) || opt.value.toLowerCase().includes(q)
      })
    }

    if (
      !isNegated &&
      currentTokenDef?.negatable &&
      dropdownContext?.mode === 'value'
    ) {
      filtered = [
        ...filtered,
        {
          value: '__not__',
          label: negationLabel,
        },
      ]
    }

    return filtered
  }, [rawOptions, filterQuery, usedValues, currentTokenDef, dropdownContext])

  const isStrictValue = currentTokenDef?.strict ?? false

  const isDropdownVisible =
    dropdownContext !== null &&
    (activeOptions.length > 0 ||
      loading ||
      (isStrictValue && dropdownContext.mode === 'value') ||
      (currentTokenDef?.renderDropdown && dropdownContext.mode === 'value'))

  // ── Keyboard handling ──────────────────────────────────────────────

  const handleKeyDown = useEffectEvent((event: React.KeyboardEvent) => {
    if (isDropdownVisible) {
      const getTarget = () =>
        highlighted >= 0 && highlighted < activeOptions.length
          ? activeOptions[highlighted]
          : filterQuery
            ? activeOptions[0]
            : undefined

      switch (event.key) {
        case 'ArrowDown': {
          if (currentTokenDef?.renderDropdown) {
            if (focusDropdown()) {
              event.preventDefault()
              return
            }
          }
          event.preventDefault()
          setHighlighted((h) => Math.min(h + 1, activeOptions.length - 1))
          return
        }
        case 'ArrowUp': {
          event.preventDefault()
          setHighlighted((h) => Math.max(h - 1, 0))
          return
        }
        case 'Enter': {
          const target = getTarget()
          if (target) {
            event.preventDefault()
            selectOption(target)
            return
          }
          break
        }
        case 'Escape': {
          event.preventDefault()
          setDropdownContext(null)
          return
        }
        case 'Tab': {
          if (currentTokenDef?.renderDropdown) {
            return
          }
          const target = getTarget()
          if (target) {
            event.preventDefault()
            selectOption(target)
            return
          }
          setDropdownContext(null)
          return
        }
      }
    }

    let consumerPrevented = false
    if (onKeyDownProp) {
      const originalPreventDefault = event.preventDefault.bind(event)
      event.preventDefault = () => {
        consumerPrevented = true
        originalPreventDefault()
      }
      onKeyDownProp(event)
      event.preventDefault = originalPreventDefault
    }

    if (!consumerPrevented && event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
    }
  })

  const handleSubmit = useEffectEvent(() => {
    suppressFocusRef.current = true
    const technicalQuery = toTechnicalQuery(value, tokens, negationLabel).trim()
    if (technicalQuery !== lastSubmittedRef.current) {
      lastSubmittedRef.current = technicalQuery
      setSubmittedQuery(technicalQuery)
      onSearch?.(
        segments.filter((s) => s.type !== 'text' || s.text.trim().length > 0),
        technicalQuery,
      )
    }
    setDropdownContext(null)
    setTimeout(() => {
      suppressFocusRef.current = false
    }, 200)
  })

  const handleClear = useEffectEvent(() => {
    if (!editor) {
      return
    }
    suppressUpdateRef.current = true
    editor.commands.setContent('<p></p>')
    if (!isControlled) {
      setInternalValue('')
    }
    onChange?.('', [])
    onSearch?.([], '')
    lastSubmittedRef.current = ''
    setSubmittedQuery('')
    setDropdownContext(null)
    queueMicrotask(() => {
      suppressUpdateRef.current = false
    })
  })

  const currentTechnicalQuery = useMemo(
    () => toTechnicalQuery(value, tokens, negationLabel).trim(),
    [value, tokens, negationLabel],
  )

  const isDirty = currentTechnicalQuery !== submittedQuery

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      onBlur={(e) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.relatedTarget as Node | null)
        ) {
          setDropdownContext(null)
          if (editor && !editor.isDestroyed) {
            applyTokenMarks(
              editor,
              tokenKeysAndLabels,
              tokens,
              strictValuesRef.current,
              undefined,
              negationLabel,
            )
          }
        }
      }}
      className={twMerge(
        'group relative flex items-stretch rounded border border-gray-300 bg-white text-sm outline-none transition-colors duration-150 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500',
        small ? 'h-6 text-xs' : 'h-8 text-sm',
        className,
      )}
    >
      {/* Editor area */}
      <div
        className={twMerge(
          'flex min-w-0 grow items-center gap-1',
          small ? 'pl-2 pr-2' : 'pl-2.5 pr-2.5',
          slotConfig.input.className,
        )}
        onKeyDown={handleKeyDown}
      >
        <div className="grid min-w-0 grow items-center">
          <EditorContent
            editor={editor}
            className={twMerge(
              'col-start-1 row-start-1 min-w-0',
              small ? 'text-xs' : 'text-sm',
              // TipTap editor base
              '[&_.tiptap]:max-h-lh [&_.tiptap]:overflow-hidden [&_.tiptap]:whitespace-pre-wrap [&_.tiptap]:outline-none',
              // Paragraph reset
              '[&_.tokenized-search-paragraph]:m-0 [&_.tokenized-search-paragraph]:leading-[inherit]',
            )}
          />
          {value.length === 0 && (
            <span
              className={twMerge(
                'pointer-events-none col-start-1 row-start-1 italic text-gray-400',
                slotConfig.input.placeholder?.className,
              )}
            >
              {slotConfig.input.placeholder?.children ?? 'Filter\u2026'}
            </span>
          )}
        </div>

        {/* Clear button */}
        {value.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => e.preventDefault()}
            onClick={handleClear}
            className={twMerge(
              'shrink-0 cursor-pointer text-gray-400 transition-colors hover:text-gray-600',
              small ? 'size-3' : 'size-3.5',
              !slotConfig.submitButton.children && 'mr-1',
              slotConfig.clearButton.className,
            )}
          >
            {slotConfig.clearButton.children}
          </button>
        )}

        {/* Dropdown */}
        {isDropdownVisible && dropdownPos && (
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              zIndex: 50,
            }}
            className={twMerge(
              'z-50 rounded-md border border-gray-200 bg-white p-1.5 text-sm shadow-lg',
              currentTokenDef?.renderDropdown &&
                dropdownContext?.mode === 'value'
                ? 'max-h-none w-auto overflow-visible'
                : 'min-w-50 max-h-60 overflow-auto',
              slotConfig.dropdown.className,
            )}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                setDropdownContext(null)
                editor?.commands.focus()
              }
            }}
          >
            {currentTokenDef?.renderDropdown &&
            dropdownContext?.mode === 'value' ? (
              currentTokenDef.renderDropdown({
                value: (() => {
                  const segmentsList = parseTokenizedSearch<K>(
                    editor.getText(),
                    tokenKeysAndLabels,
                  )
                  const seg = segmentsList.find(
                    (s) =>
                      s.type === 'token' &&
                      s.start === dropdownContext.replaceStart,
                  )
                  return seg?.type === 'token' ? seg.value : ''
                })(),
                onChange: updateTokenValue,
                close: () => {
                  setDropdownContext(null)
                },
              })
            ) : loading && activeOptions.length === 0 ? (
              <div
                className={twMerge(
                  'flex items-center justify-center gap-2 py-3 text-gray-400',
                  slotConfig.dropdown.loader?.className,
                )}
              >
                {slotConfig.dropdown.loader?.children ?? 'Loading\u2026'}
              </div>
            ) : activeOptions.length === 0 ? (
              <div
                className={twMerge(
                  'px-2 py-3 text-center text-gray-400',
                  slotConfig.dropdown.emptyMessage?.className,
                )}
              >
                {slotConfig.dropdown.emptyMessage?.children ??
                  'No matching options'}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {dropdownContext?.mode === 'suggest' &&
                  tokenKeySuggestions.length > 0 && (
                    <div
                      className={twMerge(
                        'mb-1 px-2 pb-1.5 pt-1 text-[10px] font-medium uppercase tracking-wide text-gray-400',
                        slotConfig.dropdown.filterByLabel?.className,
                      )}
                    >
                      {slotConfig.dropdown.filterByLabel?.children ??
                        'Filter by'}
                    </div>
                  )}
                {activeOptions.map((option, index) =>
                  option.value === '__not__' ? (
                    <Fragment key="__not__">
                      <hr
                        className={twMerge(
                          'my-1 border-gray-200',
                          slotConfig.dropdown.separator,
                        )}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => selectOption(option)}
                        onPointerEnter={() => setHighlighted(index)}
                        onPointerLeave={() => setHighlighted(-1)}
                        aria-selected={highlighted === index}
                        className={twMerge(
                          'flex w-full cursor-pointer items-center rounded-sm px-2 py-1 text-left text-xs italic outline-none transition-colors duration-75',
                          slotConfig.dropdown.notOption,
                        )}
                      >
                        <HighlightMatch
                          text={getOptionDisplayText(option)}
                          query={filterQuery}
                          className={slotConfig.dropdown.highlightMatch}
                        />
                      </button>
                    </Fragment>
                  ) : (
                    <button
                      key={option.value}
                      type="button"
                      tabIndex={-1}
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => selectOption(option)}
                      onPointerEnter={() => setHighlighted(index)}
                      onPointerLeave={() => setHighlighted(-1)}
                      aria-selected={highlighted === index}
                      className={twMerge(
                        'flex w-full cursor-pointer items-center rounded-sm px-2 py-1 text-left text-xs outline-none transition-colors duration-75',
                        slotConfig.dropdown.option,
                      )}
                    >
                      {dropdownContext?.mode === 'suggest' &&
                        (() => {
                          const def = tokens.find((t) => t.key === option.value)
                          return def?.icon ? (
                            <span
                              className={twMerge(
                                'mr-2 flex size-3.5 shrink-0 items-center justify-center text-gray-400',
                                slotConfig.dropdown.suggestionIcon,
                              )}
                            >
                              {def.icon}
                            </span>
                          ) : null
                        })()}
                      <HighlightMatch
                        text={getOptionDisplayText(option)}
                        query={filterQuery}
                        className={slotConfig.dropdown.highlightMatch}
                      />
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search / submit button — outside editor scope */}
      {slotConfig.submitButton.children && (
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={() => {
            suppressFocusRef.current = true
          }}
          onClick={handleSubmit}
          data-dirty={isDirty || undefined}
          className={twMerge(
            'flex shrink-0 cursor-pointer items-center justify-center rounded-r border-l border-gray-300 px-2.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600',
            slotConfig.submitButton.className,
          )}
        >
          {slotConfig.submitButton.children}
        </button>
      )}
    </div>
  )
}

export const TokenizedSearch = Object.assign(TokenizedSearchBase, slots)
