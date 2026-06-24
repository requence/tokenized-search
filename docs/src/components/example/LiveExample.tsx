import { useState, useCallback } from 'react'
import {
  TokenizedSearch,
  type TokenizedSearchSegment,
} from '@requence/tokenized-search'
import { Loader2, Search, X } from 'lucide-react'
import { tokens } from './tokens'

export default function LiveExample() {
  const [segments, setSegments] = useState<TokenizedSearchSegment[]>([])
  const [rawText, setRawText] = useState('')

  return (
    <div className="flex flex-col gap-3">
      <TokenizedSearch
        tokens={tokens}
        onSearch={(segs, text) => {
          setSegments(segs)
          setRawText(text)
        }}
        className="outline-solid outline-3 border-zinc-600 realtive bg-transparent outline-transparent focus-within:border-zinc-500 focus-within:outline-zinc-700/50 focus-within:ring-0 hover:border-zinc-500"
      >
        <TokenizedSearch.Input className="bg-black/30 text-white">
          <TokenizedSearch.Placeholder className="text-zinc-600">
            Try typing &quot;status:active reference:Acme&quot;…
          </TokenizedSearch.Placeholder>
          <TokenizedSearch.TokenKey className="bg-[color-mix(in_srgb,var(--color-orange-500)_25%,var(--color-zinc-900))] text-orange-300" />
          <TokenizedSearch.TokenValue className="bg-[color-mix(in_srgb,var(--color-orange-500)_10%,var(--color-zinc-900))] text-orange-200" />
          <TokenizedSearch.TokenNegation className="bg-[color-mix(in_srgb,var(--color-orange-500)_10%,var(--color-zinc-900))] text-orange-200/60" />
        </TokenizedSearch.Input>

        <TokenizedSearch.ClearButton className="text-zinc-500 hover:text-zinc-300 bg-transparent p-0 -translate-y-0.5">
          <X className="size-3" />
        </TokenizedSearch.ClearButton>

        <TokenizedSearch.SubmitButton className="group data-dirty:text-orange-400 data-dirty:outline data-dirty:bg-orange-950/30 data-dirty:hover:border-orange-400/80 outline-orange-500/40 z-10 data-dirty:hover:bg-orange-950/50 data-dirty:group-focus-within:border-orange-400/50 data-dirty:group-hover:border-orange-400/50 border-zinc-600 bg-zinc-700/50 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-600/60 hover:text-zinc-200 focus-visible:outline-zinc-400/50 group-focus-within:border-zinc-500 group-hover:border-zinc-500">
          <Search className="size-3 group-aria-busy:hidden" />
          <Loader2 className="size-3 animate-spin hidden group-aria-busy:block" />
        </TokenizedSearch.SubmitButton>

        <TokenizedSearch.Dropdown className="shadow-lg/50 border-zinc-700 bg-zinc-900">
          <TokenizedSearch.DropdownOption className="text-zinc-300 bg-transparent hover:bg-zinc-800 aria-selected:bg-zinc-700/80 aria-selected:text-white" />
          <TokenizedSearch.DropdownNotOption className="text-zinc-500 bg-transparent hover:bg-zinc-800 aria-selected:bg-zinc-700/80 aria-selected:text-white" />
          <TokenizedSearch.DropdownSeparator className="border-zinc-700 border" />
          <TokenizedSearch.HighlightMatch className="text-orange-300" />
          <TokenizedSearch.FilterByLabel className="text-zinc-500">
            Filter by
          </TokenizedSearch.FilterByLabel>
          <TokenizedSearch.SuggestionIcon className="text-zinc-500" />
          <TokenizedSearch.EmptyMessage>
            No matching options
          </TokenizedSearch.EmptyMessage>
          <TokenizedSearch.Loader>
            <Loader2 className="size-3.5 animate-spin" />
            Loading…
          </TokenizedSearch.Loader>
        </TokenizedSearch.Dropdown>
      </TokenizedSearch>

      {/* Output panel */}
      <div className="rounded-md border border-zinc-700/50 bg-zinc-950/60 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-zinc-700/50 px-3 py-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Parsed Output
          </span>
          {rawText && (
            <span className="ml-auto text-[11px] text-zinc-600 font-mono truncate max-w-[50%]">
              {rawText}
            </span>
          )}
        </div>
        <pre className="p-3 text-[12px] leading-relaxed text-zinc-400 font-mono overflow-x-auto m-0 min-h-12 max-h-48">
          {segments.length > 0
            ? JSON.stringify(
                segments.map((s) =>
                  s.type === 'token'
                    ? {
                        type: 'token',
                        key: s.key,
                        value: s.value,
                        ...(s.id ? { id: s.id } : {}),
                        ...(s.negated ? { negated: true } : {}),
                      }
                    : { type: 'text', text: s.text },
                ),
                null,
                2,
              )
            : '// Press Enter or click the search icon to see parsed segments…'}
        </pre>
      </div>
    </div>
  )
}
