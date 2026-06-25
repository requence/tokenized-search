---
'@requence/tokenized-search': patch
---

Fix submit button showing dirty state immediately on mount when initialized
with a default value or controlled value. The submittedQuery was initialized
from the raw prop value instead of the derived display-form value, causing a
mismatch with currentTechnicalQuery.
