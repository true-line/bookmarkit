---
"bookmarkit": minor
---

The rating input is part of the design system, and the whole app sits inside its scope. Rating stars in the edit form and the quick-add popup now come from `src/design-system` with the mockup's anatomy: 36px targets (44px on touch or narrow windows), filled stars in the theme's primary role instead of the old amber, a visible "N / 5" readout beside the stars, and a statically named group — "Bookmark rating" — whose changes the readout announces politely. The edit form's two **Suggest** buttons gain the mockup's sparkle icon, and quick-add's URL field shows the mockup's valid state — success border and check — as soon as what is typed is a saveable URL; the save still refuses what it always refused. The app itself now renders under the design system's `.ui-root`, so the spec's body typeface and the shared 2px focus ring hold across every screen, migrated or not.
