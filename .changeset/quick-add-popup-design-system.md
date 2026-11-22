---
"bookmarkit": minor
---

Migrate the quick-add popup to the unified design system

The MV3 quick-add popup renders the toolbar mockup's compact shell: the brand-mark header, labeled input fields (the URL field in Fira Code with a forced LTR reading), the folder/tags grid, and a divided footer pairing the tonal "Open BookmarkIt" with the crimson "Save Bookmark". The design-system CSS and self-hosted fonts now load in the popup entry, and popup.html carries a light `data-ui-theme` default so the themed frame paints before the theme bridge runs. The save flow, tab discovery and chrome.* integration are unchanged; Escape still closes the popup.
