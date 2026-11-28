---
"bookmarkit": patch
---

The local store finds the bookmarks bar by what it is, not by hardcoded id or English title (#373). Chrome 134 marks special folders with `folderType`, and current fresh profiles no longer give the bar node id `"1"` (one install observed ids `"5"` and `"6"`) nor the exact `"Bookmarks bar"` title the store matched — so `ensureRootFolder` hit an undefined node and every page of a freshly installed extension died on init. The bar is now located by `folderType` first (preferring the local copy over an account-synced one), then the legacy id/title markers, then the root's first child, and a tree without one fails with a clear error instead of a bare TypeError.
