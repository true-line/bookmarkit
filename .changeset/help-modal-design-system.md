---
"bookmarkit": minor
---

Migrate the help/shortcuts modal to the unified design system

HelpModal now renders the design system's modal-standard shell (divided header, tinted footer) at the help-shortcuts mockup's wide 2xl reading, with design-system typography, `ui-kbd` keycap chips for every real binding (including undo via Cmd/Ctrl+Z), example-command chips for agent search, and the mockup's shortcut-row recipe. The design-system Modal gains a `size` prop for the wider shell reading.
