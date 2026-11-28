# Firebase Setup for BookmarkIt

## Reads and ordering

`firebaseStore.js` reads the whole bookmark collection — it does not send an
`orderBy()` query — and sorts in memory: `position` ascending, documents
without a `position` last, then `title` (case-insensitive).

This is deliberate (#358): Firestore's `orderBy()` is also an existence filter —
from [Order and limit data](https://firebase.google.com/docs/firestore/query-data/order-limit-data),
"The result set will not include documents that do not contain the given
field." `create()` and `bulkAdd()` write no `position` field, so an ordered
query would silently hide exactly the bookmarks they had just written. Fetching
everything avoids that trap, needs no composite index (a multi-field
`orderBy()` query would require one, and Firestore rejects the query with an
error linking to the console until it exists), and costs nothing extra since
the app renders the collection in full.

## Offline Persistence

`firebaseStore.init()` enables IndexedDB-based offline persistence via
`enableIndexedDbPersistence(db)`. This caches the bookmark collection locally
so the app loads instantly on repeat visits without a network round-trip.

**Known limitations:**

- Offline persistence only works in one browser tab at a time. If multiple tabs
  are open, only the first will have persistence enabled (others log a warning).
- Some older browsers do not support IndexedDB and will silently fall back to
  online-only mode.
