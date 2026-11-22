---
name: "BookmarkIt Design System"
description: "Modern, consistent, WCAG AA accessible, and i18n/RTL-ready design system for BookmarkIt—pairing crisp alabaster-slate surfaces and brick-crimson primary actions with unified AI-assist accents and logical layouts."
---

## Overview

BookmarkIt is a client-first, privacy-respecting bookmark manager delivered as both a full-page web application and a Chrome Manifest V3 extension popup. Its visual language blends **Modern Editorial Precision** with **Tactile Clarity**: crisp alabaster-slate surfaces (`#F8F9FF`) and pure white elevated cards (`#FFFFFF`) replace muted beige tones for higher contrast and effortless scanning, while deep brick-crimson (`#950B10` / `#B82925`) anchors primary actions and a unified violet accent (`#5D04CA` / `#7635E2`) marks every AI-assisted capability.

Every component and layout rule is built for **consistency, WCAG AA accessibility, and internationalization (i18n / RTL)**: controls share standardized heights and focus rings, status is never conveyed by color alone, and all spacing, alignment, and icons use CSS logical properties (`start`/`end`, `ps-`/`pe-`, `ms-`/`me-`) so `dir="rtl"` and 30–40% longer translated strings work without clipping or overlap.

## Colors

The palette pairs cool alabaster-slate surfaces with high-contrast brick-crimson primary controls, unified violet AI-assist triggers, and accessible semantic status tokens. Every `on-<role>` foreground pair clears WCAG AA (`>= 4.5:1` for text, `>= 3:1` for UI boundaries and focus rings).

- **Primary (Brick Crimson):** Reserved for the brand ribbon mark, active segmented-control states, primary modal CTAs (`Save Bookmark`, `Done`, `Got it`, `Open BookmarkIt`), and checked controls.
- **Unified AI Assist (Violet):** Every model-powered action—both Description and Tag `Suggest` buttons and the active AI search state—uses the unified `tertiary` violet token so users immediately distinguish AI features from local, offline actions.
- **Accessible Neutrals & Boundaries:** `outline` (`#585F69`) provides `>= 3:1` contrast for input borders and focus rings on light surfaces, while `outline-variant` (`#C0C7D2`) defines subtle card hairlines.
- **Never Color Alone:** Validation, broken-link, and destructive states always pair color (`success`, `danger`, `error`) with an icon and explicit text or `aria-label`.

```yaml
colors:
  brand-crimson: "#B82925"
  ai-suggest: "#6D28D9"
  success: "#1E7E34"
  danger: "#C92A2A"
  light:
    primary: "#950B10"
    on-primary: "#FFFFFF"
    primary-container: "#B82925"
    on-primary-container: "#FFD2CD"
    secondary: "#99443D"
    on-secondary: "#FFFFFF"
    secondary-container: "#FD9489"
    on-secondary-container: "#762A25"
    tertiary: "#5D04CA"
    on-tertiary: "#FFFFFF"
    tertiary-container: "#7635E2"
    on-tertiary-container: "#E5D6FF"
    error: "#BA1A1A"
    on-error: "#FFFFFF"
    error-container: "#FFDAD6"
    on-error-container: "#93000A"
    background: "#F8F9FF"
    on-background: "#151C24"
    surface: "#F8F9FF"
    surface-dim: "#D4DAE6"
    surface-bright: "#FFFFFF"
    surface-container-lowest: "#FFFFFF"
    surface-container-low: "#EEF4FF"
    surface-container: "#E8EEFA"
    surface-container-high: "#E2E9F4"
    surface-container-highest: "#DCE3EF"
    on-surface: "#151C24"
    surface-variant: "#FFDAD6"
    on-surface-variant: "#404751"
    outline: "#585F69"
    outline-variant: "#C0C7D2"
    inverse-surface: "#2A313A"
    inverse-on-surface: "#EAF1FD"
    inverse-primary: "#FFB4AB"
    shadow: "#000000"
    scrim: "#000000"
  dark:
    primary: "#FFB4AB"
    on-primary: "#690005"
    primary-container: "#B82925"
    on-primary-container: "#FFD2CD"
    secondary: "#FFB4AB"
    on-secondary: "#5D1814"
    secondary-container: "#7D302A"
    on-secondary-container: "#FF9F94"
    tertiary: "#D3BBFF"
    on-tertiary: "#3F008D"
    tertiary-container: "#7635E2"
    on-tertiary-container: "#E5D6FF"
    error: "#FFB4AB"
    on-error: "#690005"
    error-container: "#93000A"
    on-error-container: "#FFDAD6"
    background: "#0D141C"
    on-background: "#DCE3EF"
    surface: "#0D141C"
    surface-dim: "#0D141C"
    surface-bright: "#333A43"
    surface-container-lowest: "#080F17"
    surface-container-low: "#151C24"
    surface-container: "#192028"
    surface-container-high: "#242B33"
    surface-container-highest: "#2E353E"
    on-surface: "#DCE3EF"
    surface-variant: "#5A403E"
    on-surface-variant: "#AEB4BE"
    outline: "#8A919C"
    outline-variant: "#404751"
    inverse-surface: "#DCE3EF"
    inverse-on-surface: "#2A313A"
    inverse-primary: "#B42623"
    shadow: "#000000"
    scrim: "#000000"
```

## Typography

BookmarkIt uses **Red Hat Text** for headings, **Radio Canada Big** for UI controls and body copy (with broad Latin/diacritic coverage for i18n), and **Fira Code** for URLs, `<kbd>` shortcut chips, and provider status pills.

- **Zoom & Readability:** All text scales cleanly up to 200% browser zoom without clipping. Never apply fixed heights to text containers.
- **Numeric & Bidirectionality Rules:** Use `tabular-nums` for bookmark counts and timestamps. Apply `dir="auto"` to user-entered bookmark titles and descriptions, and force `dir="ltr"` with `unicode-bidi: plaintext` on raw URLs so RTL locales never reverse URL paths.

```yaml
typography:
  display-lg:
    fontFamily: "Red Hat Text"
    fontSize: 36px
    fontWeight: 600
    lineHeight: 44px
    letterSpacing: -0.5px
  display-lg-mobile:
    fontFamily: "Red Hat Text"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 34px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: "Red Hat Text"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 30px
    letterSpacing: -0.25px
  headline-md:
    fontFamily: "Red Hat Text"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 26px
    letterSpacing: -0.1px
  headline-sm:
    fontFamily: "Red Hat Text"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 22px
    letterSpacing: 0px
  body-lg:
    fontFamily: "Radio Canada Big"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 0px
  body-md:
    fontFamily: "Radio Canada Big"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  body-sm:
    fontFamily: "Radio Canada Big"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: 0px
  label-lg:
    fontFamily: "Radio Canada Big"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
  label-md:
    fontFamily: "Radio Canada Big"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 18px
    letterSpacing: 0px
  label-sm:
    fontFamily: "Radio Canada Big"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.1px
  mono-md:
    fontFamily: "Fira Code"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: 0px
  mono-sm:
    fontFamily: "Fira Code"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
```

## Layout & Spacing

BookmarkIt enforces a strict 4px/8px spatial rhythm across both surfaces, with **CSS logical properties** (`ps-`, `pe-`, `ms-`, `me-`, `text-start`, `start-`, `end-`) required everywhere so `dir="rtl"` mirrors layouts automatically:

- **Unified Toolbar & Segmented Controls:** Rather than a flat row of identical buttons, the top toolbar groups primary creation (`Add New`), collection tools (`Folders`, `Import/Export`, `Remove Duplicates`, `Digest`, `Check Links`), and a cohesive segmented control for view modes (`Single column`, `Flow columns`, `Grid`).
- **Accessible Touch & Click Targets:** Interactive controls maintain a minimum height of `36px` on desktop and `44px` on touch/mobile viewports.
- **i18n Text-Expansion Tolerance:** Buttons, filter chips, and form labels never use fixed widths (`w-*`) or `whitespace-nowrap` on multi-word copy; flex containers wrap gracefully to accommodate 30–40% longer translations.
- **Full Bookmark Manager (`index.html`):** Centered fluid max-width (`1280px`) with `24px` page margins and `16px` card gutters across Single column, 2-column Flow, and Grid views.
- **Toolbar Quick Add (`popup.html`):** Compact `340px–380px` popover with `16px` padding and `12px` vertical rhythm.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 16px
  gutter-lg: 24px
  gutter-xl: 32px
  section: 40px
  page-margin: 24px
```

## Elevation & Depth

Depth is conveyed through **crisp tonal layering**, **hairline slate borders**, and **high-visibility focus rings**:

- **Canvas to Card:** Pure white bookmark cards (`surface-container-lowest`) rest on the alabaster canvas (`surface`), framed by a `1px` `outline-variant` border and a subtle ambient shadow (`0 1px 2px rgba(21, 28, 36, 0.05), 0 4px 12px rgba(21, 28, 36, 0.03)`).
- **Accessible Focus Rings:** Every interactive element uses a consistent `2px` `outline` ring (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-primary`) so keyboard navigation is unmistakable.
- **Modals & Drawers:** Dialogs sit above a `scrim` (`rgba(13, 20, 28, 0.5)`) with elevated shadow and `aria-modal="true"` focus trapping.
- **Optional 3D Effects:** Disabled automatically when `prefers-reduced-motion: reduce` is active.

## Shapes

Consistent, modern soft-rounded geometry across all controls:

- **Micro chips & checkboxes (`4px`):** Checkboxes and inline `<kbd>` keycap badges.
- **Buttons, Inputs & Cards (`8px`):** Standard buttons, segmented-control items, text inputs, selects, and bookmark cards.
- **Search & Filter Bars (`10px`):** AI natural-language search bar and instant filter container.
- **Dialogs & Popovers (`12px`):** Modal sheets and Chrome extension popup.
- **Pills & Avatars (`9999px`):** Circular favicon containers and status pills.

```yaml
rounded:
  sm: 4px
  DEFAULT: 8px
  md: 10px
  lg: 12px
  xl: 16px
  full: 9999px
```

## Motion & Micro-interaction

Motion is crisp, purposeful, and strictly honors `prefers-reduced-motion: reduce`:

- **Immediate feedback:** Hover, focus, and selection states transition in `100ms` (`ease-out`).
- **Modal & Drawer transitions:** Dialogs enter over `200ms` (`cubic-bezier(0.2, 0, 0,