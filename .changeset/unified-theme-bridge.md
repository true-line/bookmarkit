---
"bookmarkit": minor
---

The app entry loads the unified design system CSS once, and the theme hook stamps `data-ui-theme` on the document root (derived light/dark from the selected theme background) and maps the user accent onto the design system brand tokens. No surface renders the unified components yet — this is the plumbing every surface migration rides on.
