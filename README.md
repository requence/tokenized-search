# @requence/tokenized-search

Tokenized search input with TipTap-powered rich text editing, dropdown suggestions, and structured query parsing for React.

[Documentation](https://tokenized-search.docs.requence.cloud/) · [GitHub](https://github.com/requence/tokenized-search)

## Installation

```bash
npm install @requence/tokenized-search
```

## Prerequisites

This package uses [Tailwind CSS](https://tailwindcss.com/) utility classes internally (via `tailwind-merge`). Your project must have Tailwind CSS configured for the component to render correctly.

Add the `@source` directive to your CSS entry point so Tailwind scans the package for class names:

```css
@import "tailwindcss";
@source "../node_modules/@requence/tokenized-search";
```

## Quick Start

```tsx
import { TokenizedSearch } from '@requence/tokenized-search'

function MySearch() {
  return (
    <TokenizedSearch
      tokens={[
        {
          key: 'status',
          label: 'Status',
          exclusive: true,
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
        },
        {
          key: 'source',
          label: 'Source',
          options: async (query, signal) => {
            const res = await fetch(`/api/sources?q=${query}`, { signal })
            return res.json()
          },
        },
      ]}
      onSearch={(segments, rawText) => {
        console.log('Search:', segments, rawText)
      }}
    />
  )
}
```

## Exports

All exports are available from the package root:

| Export | Type | Description |
| --- | --- | --- |
| `TokenizedSearch` | Component | Rich text search input with token highlighting and dropdowns |
| `slots` | Object | All slot sub-components as a plain object (for advanced usage) |
| `parseTokenizedSearch` | Function | Parse a raw query string into structured segments |
| `getOptionDisplayText` | Function | Resolve display text for a token option (`label ?? value`) |
| `toTechnicalQuery` | Function | Convert display-form query (labels) to technical form (keys/values) |
| `toDisplayQuery` | Function | Convert technical-form query (keys/values) to display form (labels) |

### Types

All types are exported as named type exports:

`TokenizedSearchProps`, `TokenizedSearchHandle`, `TokenizedSearchTokenDefinition`, `TokenOption`, `TokenizedSearchSegment`, `TokenSegment`, `TextSegment`, `DropdownContext`, `ValueDropdownContext`, `SuggestDropdownContext`, `SlotProps`

### Server-side parsing (`/core` entry)

The parsing pipeline is also available from `@requence/tokenized-search/core` —
the exact same implementation the `<TokenizedSearch />` component runs, but with
no React or TipTap anywhere in its module graph (runtime *and* types). Use it to
parse queries in server-side code:

```ts
import { parseTokenizedSearch, parseExpression } from '@requence/tokenized-search/core'

const segments = parseTokenizedSearch('status:FAILED created:>=now-8m', ['status', 'created'])
const { ast, valid } = parseExpression(segments)
```

It exports `parseTokenizedSearch`, `parseExpression`, `DEFAULT_MAX_NESTING`,
and `getOptionDisplayText`, plus the pure types: `TokenOption`, `TokenSegment`,
`TextSegment`, `OperatorKind`, `OperatorSegment`, `TokenizedSearchSegment`,
`SearchAst`, `ExpressionError`, `ExpressionErrorCode`, `ParsedExpression`, and
`ParseExpressionOptions`. When client and server both parse the same stored
queries, keep them on the same package version so the grammar cannot drift.

## Customization with Slots

`TokenizedSearch` is a compound component. Pass slot sub-components as `children` to override default classes and content. Slots are config-only — they render nothing themselves; the root component reads their props.

### Slot hierarchy

```
<TokenizedSearch>
  <TokenizedSearch.Input className="…">          <!-- input wrapper -->
    <TokenizedSearch.Placeholder className="…">…</TokenizedSearch.Placeholder>
    <TokenizedSearch.TokenKey className="…" />
    <TokenizedSearch.TokenValue className="…" />
    <TokenizedSearch.TokenNegation className="…" />
  </TokenizedSearch.Input>

  <TokenizedSearch.ClearButton className="…">…</TokenizedSearch.ClearButton>
  <TokenizedSearch.SubmitButton className="…">…</TokenizedSearch.SubmitButton>

  <TokenizedSearch.Dropdown className="…">       <!-- dropdown wrapper -->
    <TokenizedSearch.DropdownOption className="…" />
    <TokenizedSearch.DropdownNotOption className="…" />
    <TokenizedSearch.DropdownSeparator className="…" />
    <TokenizedSearch.HighlightMatch className="…" />
    <TokenizedSearch.FilterByLabel className="…">…</TokenizedSearch.FilterByLabel>
    <TokenizedSearch.SuggestionIcon className="…" />
    <TokenizedSearch.EmptyMessage className="…">…</TokenizedSearch.EmptyMessage>
    <TokenizedSearch.Loader className="…">…</TokenizedSearch.Loader>
  </TokenizedSearch.Dropdown>
</TokenizedSearch>
```

### Example

```tsx
<TokenizedSearch tokens={tokens} onSearch={handleSearch}>
  <TokenizedSearch.Input className="rounded-lg border-2 border-blue-300">
    <TokenizedSearch.Placeholder className="text-gray-400">
      Search by status, source…
    </TokenizedSearch.Placeholder>
    <TokenizedSearch.TokenKey className="text-blue-600 font-semibold" />
    <TokenizedSearch.TokenValue className="text-emerald-600" />
  </TokenizedSearch.Input>

  <TokenizedSearch.ClearButton className="text-gray-400 hover:text-gray-600">
    ✕
  </TokenizedSearch.ClearButton>

  <TokenizedSearch.Dropdown className="shadow-xl rounded-lg">
    <TokenizedSearch.DropdownOption className="hover:bg-blue-50" />
    <TokenizedSearch.EmptyMessage className="text-gray-400 italic">
      No results found
    </TokenizedSearch.EmptyMessage>
  </TokenizedSearch.Dropdown>
</TokenizedSearch>
```

## License

MIT
