---
"bookmarkit": patch
---

Fix the help modal opening pushed below the viewport midline and clipped past its bottom edge. The dialog panel's max-height cap carried a cyclic percentage that grid track sizing cannot resolve, so the scrim's row sized to the panel's unclamped height; the cap is now viewport-definite and tall dialogs center correctly with their body scrolling internally.
