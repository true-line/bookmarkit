---
"bookmarkit": minor
---

Migrate the manager header and toolbar chrome to the unified design system

The manager's chrome region now speaks the design system's vocabulary (#250, first link of the sequential manager chain): the natural-language search is an `input-field-icon` — 40px, leading search icon, a provider-ready badge on the trailing slot and the shared spinner while the agent runs; header actions render the canonical intents (Add New on primary, the rest on the mockup's button-with-icon outlined reading with the screens' icons, Help/Options as tonal bordered icon buttons); the filter strip's text input is an input-field-icon with a trailing clear affordance, the rating/sort selects are the tokenized native element, the broken-only/never-opened toggles and tri-state tag chips wear the pressed-state recipe, and sort direction is a button-with-icon; the view selector is the mockup's segmented control with `aria-pressed`; saved-view chips and folder-tree rows carry the pressed-state and sidebar-row recipes. Filtering and sorting logic is untouched, and the header action strip keeps its full-width, scrollable #210 behavior.
