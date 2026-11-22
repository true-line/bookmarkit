# design/ — canonical design reference

This tree is the verbatim Stitch export checked in as reference material for
the design-system adoption plan (#241). It is third-party content committed
**as-is**: read it, never execute or build from it, and never let it leak into
`src/`. It is excluded from the formatter (see `.prettierignore`) so the
artifacts stay byte-identical to the export.

This README is the only repo-authored file in the tree.

## Contents

- `spec/bookmarkit_design_system.md` — the export's design-system spec
  (tokens, palette, typography, spacing, motion).
- `mockups/<screen>/code.html` — 20 mockup screens: 11 desktop and 9 mobile.
  `toolbar_quick_add` and `help_shortcuts` are desktop-only; the export has no
  mobile variant for them.

## Excluded from the check-in

- `design_474248.md` — a byte-identical echo of this repo's own `DESIGN.md`
  (duplicating it here would fork the durable doc).
- 7 timestamped `screenshot_*.png` files (~1.4 MB) — ambiguous mapping to the
  mockup screens; the `code.html` files are the canonical artifacts.

## Known gap: the spec's `## Components` section

The spec points component implementations at `components/*.html` sticker
sheets (`button.html`, `card.html`, `input-field.html`, `modal.html`,
`typography.html`). **Those files were never part of the Stitch export** — no
`components/` directory exists in the export and none of the checked-in
mockup files carry `<!-- COMPONENT: … -->` markers, so those references are
unresolvable here.

The canonical component implementations in this repo are the ones shipped by
the unified design system (PR #239): `src/design-system/tokens.css`,
`src/design-system/components.css`, and the components under
`src/design-system/` with their Storybook stories — read those instead of the
paths the spec references.
