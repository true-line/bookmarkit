---
"bookmarkit": patch
---

Firebase mode keeps the bookmarks it writes (#358). Firestore's `orderBy()` is also an existence filter, so the store's ordered reads silently dropped every document without a `position` field — exactly the ones the add form's `create()` and every import through `bulkAdd()` had just written, and nothing repaired them later because reordering builds from the same list. The store now reads the whole collection and sorts in memory (position ascending, documents without a position last, then title), which also removes the composite index the ordered query required. `create()` is one write with one snapshot notification instead of two, and the Firebase setup guide describes the real read behaviour.
