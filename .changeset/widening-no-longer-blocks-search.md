---
"bookmarkit": patch
---

Stop holding the natural-language search box shut while the semantic widening
runs: the list already shows the plain search the moment the plan lands, and the
vector-index pass now widens those results in the background instead of keeping
the box disabled and searching for as long as a cold or stale index takes to
embed (previously 15–20s after, for example, organizing or de-duplicating had
changed many bookmarks).
