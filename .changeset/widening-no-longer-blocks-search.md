---
"bookmarkit": patch
---

Stop holding the natural-language search box shut while the semantic widening
runs: the list already shows the plain search the moment the plan lands, and the
vector-index pass now widens those results in the background instead of keeping
the box disabled and searching for as long as a cold or stale index takes to
embed (previously 15–20s after, for example, organizing or de-duplicating had
changed many bookmarks). Concurrent searches share one rebuild: a query that
arrives while the index is being rebuilt waits for that rebuild to commit and
then re-checks what is still missing, so the collection is never embedded
twice and a refresh can never commit out of order.
