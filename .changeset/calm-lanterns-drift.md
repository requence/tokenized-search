---
'@requence/tokenized-search': minor
---

Add a `@requence/tokenized-search/core` entry point exposing the parsing
pipeline (`parseTokenizedSearch`, `parseExpression`, `DEFAULT_MAX_NESTING`,
`getOptionDisplayText`) and the pure parser/AST types without React or TipTap
in the module graph, so servers can parse search strings with the exact same
implementation the `<TokenizedSearch />` component uses. The pure types moved
to an internal `coreTypes.ts` module; all existing imports from the package
root keep working unchanged.
