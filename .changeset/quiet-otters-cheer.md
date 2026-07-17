---
'@requence/tokenized-search': patch
---

Reset the dropdown highlight when the key-suggestion dropdown reopens after
selecting a token value. Previously a stale highlight from the value list
(set via arrow keys or mouse hover) carried over, so pressing Enter picked the
first key suggestion instead of submitting the search.
