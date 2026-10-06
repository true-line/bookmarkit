---
"bookmarkit": minor
---

A visual refresh of the app, plus optional 3D effects.

- The header no longer crops the search bar or overlaps the list: its height is
  measured from its content at every width, and the action row wraps with
  proper spacing.
- New default palette: warm paper surfaces, ink text, and the brand mark's
  bookmark red as the accent. Custom themes keep working; URL text now uses a
  muted mono style that meets WCAG AA contrast.
- Bookmark cards gain a subtle resting shadow, a hover lift, and a two-line
  description clamp; the filter bar takes less vertical space; the options
  button is a proper gear icon.
- New decorative 3D effects, on by default and toggleable in Options →
  Appearance: a dimensional bookmark-ribbon brand mark in the header that
  settles and tilts toward the pointer, and a small card stack that assembles
  on an empty shelf. Both render locally, stay entirely out of the initial
  bundle and the popup, render a single static frame under
  prefers-reduced-motion, pause when hidden or offscreen, and fall back to the
  static marks when WebGL is unavailable.
