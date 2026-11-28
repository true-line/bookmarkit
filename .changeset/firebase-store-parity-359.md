---
"bookmarkit": patch
---

Firebase mode answers a sort and a bulk write the way the local stores do (#359). Sorting by folder compared the agent plan's `folder` key against the stored field, which is `folderId`, so every value was undefined and the order never changed; the two timestamps sorted by their spelling instead of their instant. The sort comparator is now shared with the local stores. A bulk write notified subscribers once per committed 500-operation batch — a 1,200-bookmark import announced itself three times, twice only partly done — and now notifies once, when the whole write is finished, as DESIGN.md already required. Reordering stamped `updatedAt` onto every bookmark it positioned, so "Date modified" no longer survived a sort in Firebase mode; it now writes positions only.
