# BookmarkIt design

BookmarkIt is a client-first bookmark manager delivered as a Vite/React web
build and a Chrome Manifest V3 extension. This document records the boundaries
that are costly to rediscover from individual files; component-level behavior
belongs beside the code and user-facing behavior belongs in `README.md`.

## Surfaces and build

Vite builds two HTML entry points from the repository root:

| Surface               | Entry        | React root                        |
| --------------------- | ------------ | --------------------------------- |
| Full bookmark manager | `index.html` | `src/main.jsx` → `BookmarkApp`    |
| Toolbar quick add     | `popup.html` | `src/popup/main.jsx` → `QuickAdd` |

`scripts/build-chrome.js` runs after the Vite build and copies only extension
metadata, the background worker, icons, and legal notices into `dist/`. It must
not overwrite `dist/popup.html`, because that file contains Vite's generated
asset references. There is no content script and BookmarkIt injects nothing
into visited pages.

The default local store depends on Chrome extension APIs. The standalone web
build is therefore a Firebase deployment target rather than a localStorage-only
edition.

## Application and state flow

`src/components/BookmarkApp.jsx` orchestrates the full app: it decides what is
shown and which dialog is open, and wires the pieces together. It does not
implement them. Each concern with its own rules lives in a hook that can be read
and tested without a UI:

| Hook                      | Owns                                                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `useBookmarkStore`        | The active store, the bookmark list, every write path, and the inverse each write records.                        |
| `useLLMSettings`          | Which provider is in use, its options, and the passphrase lock protecting the API key at rest.                    |
| `useAgentEngine`          | One agent request: rate limiting, cancellation, discarding superseded replies, parsing, and error classification. |
| `useBookmarkSelection`    | Which bookmarks are selected, and the pointer and key gestures that change that.                                  |
| `useKeyboardShortcuts`    | App-level shortcuts, suspended while a dialog is open.                                                            |
| `useLinkSweep`            | The dead-link sweep: which links to check next, how fast, and where the answers go.                               |
| `usePageMetadata`         | What the page at a URL says about itself, fetched once per URL.                                                   |
| `useSmartViews`           | Saved views: reading them from storage, and writing the list back.                                                |
| `useUndoHistory`          | The undo stack and the toast offering its newest entry.                                                           |
| `useTheme`, `useDebounce` | Theme selection; debounced values.                                                                                |

The dividing line is worth stating, because it is what keeps the orchestration
from creeping back: a hook owns a rule, the component owns the consequences.
`useAgentEngine` produces a plan and hands the steps back; opening a dialog or
persisting an order in response is the component's business. `useBookmarkSelection`
decides what is selected; deleting the selection is not its concern. The agent
plan itself is component state, since the view, the manual filters, and a
persisted reorder all read it.

`src/popup/QuickAdd.jsx` is a separate small surface, but it uses the same store
hook and theme hook so bookmark writes do not fork. It passes no undo recorder,
which is how a surface opts out of undo: there is nowhere in a popup that closes
on save to offer it.

The visible list is a projection, never a second source of truth:

```text
store bookmarks
  → applyAgentPlan(lastAction)
  → applyManualFilters(effectiveFilters)
  → displayedBookmarks
```

Manual sorting runs last and intentionally overrides an agent sort. Clearing
manual filters does not clear the agent plan, and clearing agent search does
not clear manual filters.

A saved view (#49) is a name over both inputs to that projection, which is why it
is persistence rather than a feature: `utils/smartViews.js` holds what a view is,
`useSmartViews` holds where it lives, and applying one just sets the plan and the
filters. Views are read back as untrusted input — a stored plan is re-serialized
through `parseAgentResponse` so it faces the same action whitelist a model's
answer does, and an unknown action cannot reach `applyAgentPlan` by way of
storage. Which view is active is derived by comparing the screen to the saved
ones, so editing a filter afterwards visibly leaves it.

Anything persisted goes through `utils/extensionStorage.js`, which knows the one
thing callers should not have to: `chrome.storage.local` in the extension,
`localStorage` in the web build, and never `chrome.storage.sync`.

Keyboard behavior has one owner at a time. The `Modal` wrapper in
`src/design-system/Modal.jsx` gives every dialog the same contract — focus moves in on
open, Tab is trapped, Escape closes through the same guard as a scrim click, and
focus returns to whatever opened it — so no dialog implements this for itself.
Escape is handled on the dialog's own panel and stops there, which is what keeps
the app's shortcuts from firing behind an open dialog and stops a nested dialog
from closing its parent. App-level shortcuts are declared through
`useKeyboardShortcuts`, which skips typing contexts and is suspended entirely
while any dialog is open.

## The unified design system (Storybook-first)

`src/design-system/` is the additive implementation of the supplied unified UI
spec (#238): `tokens.css` defines the light/dark palettes, the Red Hat Text /
Radio Canada Big / Fira Code type scale, the 4px/8px spacing rhythm, radii,
elevation and motion as `--ui-*` variables scoped to a `[data-ui-theme]` root,
and the components (Button, Card, InputField, Modal, StarRating, Typography) style
themselves from those tokens with CSS logical properties, so `dir="rtl"`
mirrors without per-component overrides. The app entry imports both
stylesheets once (#240), and `useTheme`'s DOM application is the bridge: it
stamps `data-ui-theme` on the document element — derived light/dark from the
theme's own background, so user-uploaded themes land on the right palette —
and maps the user's accent/accent-hover onto `--ui-brand-crimson`/`-hover`
(the canonical `--ui-*` palette otherwise stays the one the Stitch screens
ship; only brand follows the user). Surfaces migrate one at a time by
rendering under that attribute — `HelpModal` is the first (#244), in the app
under the bridge's scope and in Storybook under the preview's scope root,
which also supplies the UI-theme and direction toolbars. The app root is
itself such a surface now (#289): the app entry renders under `.ui-root`, so
the spec's body typeface and the shared 2px focus contract hold across the
whole app — the entry wraps every terminal render state, loading and
load-error included, migrated surfaces or not — and the rating input joined
the component set, the edit-bookmark mockup's 36px star targets with the visible
"N / 5" readout, a radiogroup statically named "Bookmark rating" whose
changes the readout announces. The legacy
`DesignSystem.jsx` library is retired (#255); `useTheme` and its seven
runtime theme variables stay — they are the theme-bridge source feeding
`data-ui-theme` — and the unified `Modal` reuses `useFocusTrap`, so the one
keyboard contract carried over intact. The spec's `@components/*.html` files
arrived afterwards as full screen mockups (22 screens, desktop and mobile)
annotated with `data-component-id`; the components follow them where they are
more specific than the token sections — filled buttons rest on the container
role and hover to the base role, `button-secondary` (tonal bordered) is the
dialog Cancel, inputs sit at 40px with on-surface labels, the selected card
wears a 2px primary border, dialogs are bordered with a divided header
(headline-md title, optional body-sm description, both wired into the aria
labelling) and a tinted footer band, and `card-interactive-2`'s selected
reading is confirmed; the help-shortcuts screen extends the dialog shell
with the `Modal` `size` prop (its max-w-2xl panel) and contributes the
shortcut-row and command-chip recipes alongside `ui-kbd`. Where the screens
say nothing, the sticker sheet's
`modal-alert`/`modal-drawer` and `card-action` stand as listed; where screen
and spec text disagree (the digest's `rounded-md` card, inputs' 1px focus
ring), the spec text wins and the divergence is noted in comments.

### Appearance and motion settings (#290)

The options modal's appearance section gains the mockups' missing settings,
all owned by `useTheme` because they land on the document element beside
`data-ui-theme` (so the popup follows the manager for free):

- **"System default"** is a resolution, not a palette: the select entry
  resolves through `prefers-color-scheme` — Light (Alabaster) or Dark (Slate)
  — and a `matchMedia` listener re-resolves live when the OS flips while the
  app is open. The choice persists like any other theme selection.
- **Built-in palettes.** "Dark (Slate)" takes its seven bridge variables from
  the design system's own dark token scope, so the legacy variables and the
  `--ui-*` palette read as one surface. "High Contrast" is a fixed light
  palette at maximum contrast (white canvas, ink text, black hairlines, the
  brand crimson at ~6:1 on white) — a statement, deliberately not a mirror of
  the OS scheme. Its contrast reaches the tokenized surfaces too: applying it
  stamps the design system's ink and border roles (`--ui-outline`,
  `--ui-outline-variant`, the on-surface pair) inline, cleared the moment any
  other theme takes over. Uploaded themes cannot shadow built-ins — names
  that collide with a built-in (or `system`, the OS-follow mode) are rejected
  up front — and the select lists built-ins under their mockup labels ahead
  of uploads by file name.
- **Label pattern.** The two mockups name the dark theme differently
  ("Dark Slate" desktop, "Dark (Slate)" mobile); the mobile pattern wins —
  "Scheme (Palette)" generalizes to High Contrast and future palettes, and
  the same mobile mockup is the source of the "System default" entry the
  issue asks for. The four built-in labels are i18n'd; uploaded names are
  data, as filenames always were.
- **Reduce motion** is an override, not an echo: checked forces the
  transition collapse `prefers-reduced-motion` provides, stamped as
  `data-ui-motion="reduce"` on the document element for the stylesheets'
  attribute-driven collapse rules; unchecked removes the attribute and the OS
  media queries stand alone. The direction of the override is deliberate — a
  user can force reduction on top of an OS that doesn't ask, but unchecked
  never fights an OS that does (the safe default for accessibility).
- **The chosen-file status** beside the custom-theme picker is a
  `role="status"` span: "No file chosen" until a picker resolves, the file's
  name after — so the outcome of an upload (whose toasts land elsewhere) is
  still announced.

### Legal footers and copy alignment (#292)

- **Legal links.** The Help dialog's footer gains the mockup's legal row —
  version and license in the mono style, then Privacy Policy and Licenses —
  and the options modal gains the mockup's "About, Privacy & Licensing"
  section (version beside the heading, a privacy subline, the same two
  links as secondary anchors sharing the button recipe's classes). The
  version and license come from `package.json` via `src/version.js`, which
  Vite inlines at build time so both targets agree without reading a
  manifest at runtime. The links open public https pages in a new tab —
  this repo's README "Privacy and storage" section and the committed
  `THIRD-PARTY-NOTICES.md` — targets the extension is allowed to open; the
  app fetches nothing from them.
- **Copy alignment.** The empty shelf's CTAs carry the mobile mockup's
  "Add First Bookmark" / "Import Bookmarks" rather than the toolbar's
  generic Add New / Import (the desktop mockup says only "Add Bookmark";
  the mobile wording the issue quotes wins — it is the first-run voice).
  The bookmark form's folder field takes the mockup's placeholder/hint pair
  ("e.g., Work/Project A" / "Use / for nested subfolders"). The dialog
  close control's fallback label is now "Close dialog", the dialog mockups'
  shared X label; callers with a better name keep theirs — Help ("Close
  help") and Options ("Close options") match their mockups, and the two
  review dialogs deliberately say "Close without applying/removing", where
  a generic label would understate the stakes.
- **The help example chips stay.** The mockup's three chips are looser,
  invented readings ("find tags: react sort by rating desc", "show 4+
  stars"); the six shipped chips are the real agent grammar (`filter
rating >= 4 then sort by title asc`, the `then` compositions, the
  `"options"` command) and keeping invented syntax in the help dialog would
  teach commands that do not run. The divergence is this paragraph: the
  mockup's chip copy is not the spec — the shipped chips are.

### Stories coverage and the accessibility/RTL sweep (#291)

- **Stories.** Every application component now carries stories under the
  shared `UiScope` decorator (the preview's theme and direction toolbars):
  `BulkEditBar`, `EmptyShelf`, `FilterBar`, `FolderTree`, `LinkSweepBar`,
  `SmartViewBar` and `ViewSelector` join the migrated components', so the
  whole catalogue renders under the same `[data-ui-theme]` root the app
  gets from the bridge. The stories pin the stateful readings — the sweep's
  progress and verdict, the filter bar at rest and working, the bulk bar's
  selection with Auto-Tag armed on a keyless local provider — not just one
  happy path.
- **RTL.** `FolderTree`, the app's deepest mirroring surface, drops its
  physical left-side classes for logical ones (`ms-6` for the delete
  confirmation's indent, `text-start` for row labels), and the change-review
  dialog's row titles take `dir="auto"` like the bookmark cards' titles:
  user content reads its own direction.
- **Targets and live regions.** The coarse-pointer 44px floor extends to
  the settings' checkbox rows (`.ui-settings-row`): the label wraps the
  box, so the row is the touch target and carries the height, not the tiny
  native checkbox inside it. The review dialog's footer count announces
  with `aria-live="polite"` as rows tick, instead of waiting for the reader
  to find the footer. Every control in the tree, the filter bar and the
  review dialog is a native button/input/select, so keyboard order is DOM
  order under the shared focus contract.

### The options draft and the narrow sheets (#293)

- **Settings draft until Done.** The options dialog no longer writes as its
  controls change. It stages a draft of everything it edits — provider, key
  and endpoint, model, theme, language, and the toggles — and the footer's
  **Done** replays it through the same write path as before
  (`updateProviderOptions` still merges its patch, `setLocale` still
  persists, the callbacks are the components'), then closes. **Reset** puts
  the dialog back the way it found it. Every other way out — the close
  control, Escape, the sheet's back arrow — discards the draft, which the
  dialog footer now says outright: "Changes apply when you choose Done."
  A key the user has not touched keeps following its source (the stored
  locale loads a tick after open), while a touched key belongs to the draft
  alone until Reset, so nothing behind the dialog clobbers what is staged.
- **Actions stay immediate.** Theme upload and the key-encryption and
  unlock operations are actions, not settings, and keep writing as they
  did; the key row's destructive **Clear** also stays immediate — it wipes
  the stored key now and the staged field with it, so Done cannot
  resurrect what Clear removed.
- **The narrow sheets.** Below `lg` the options dialog and the import/export
  dialog join the sheet twins (#300–#303): the mobile mockups' full-page
  compositions — back bar, the same body — with the options sheet carrying
  the sticky **Reset / Done** footer and the import/export sheet drawing no
  footer at all (the mockup has none; the back arrow is the way out), while
  keeping #287's tabbed composition. The options sheet runs the dialog's
  two-column provider row full width (`.ui-sheet--options
.ui-options-grid`), and the confirm card's choice rows take the 44px
  coarse-pointer floor (#291's `.ui-settings-row`). The import/export body
  moved out as it narrowed: `ExportPanel.jsx` (the export tab, its
  serializations memoized as UX-03 had them) joins `ImportPanel.jsx`, and
  the sheet chrome itself is `ImportExportSheet.jsx`. At dialog widths
  nothing changes — the panel cap already keeps both dialogs inside the
  viewport, which is the issue's acceptance.

### The filter row's parity items (#286)

The mockup's unified search-and-filter row carries three items that stand on
their own, landed without the row's fourth: "Unrated" joins the rating
select — its own `unratedOnly` flag, because rating 0 is the bookmarks
nothing has rated, an exact pick rather than a minimum on `minRating` —
riding the same shared ladder (`RATING_OPTIONS`/`applyRatingPick`) as the
shell's compact row so the two controls cannot drift, and round-tripping
through saved views like the other flags. The summary count is a live region
(`role="status"`, `aria-live="polite"`) in the tabular reading. The sort
labels take the mockup's words — "Recently added", "Title (A–Z)" — while the
field set stays the superset it is.

The row's remaining item was a decision, and it is made: the mockup's merged
field — instant filtering and the AI ask in one always-enabled input — is
rejected, on both the mockup and today's gated strip. The agent input leaves
the row entirely, in every provider state, and comes back as a
Spotlight-style overlay centered toward the bottom of the window, summoned
with Cmd/Ctrl+K; without a configured provider the shortcut answers with a
toast instead of a field, moving the #207 gate to press time. Agent search
and manual filters keep clearing independently — two surfaces, two
clearings. The mockup records the decision
(`design/mockups/bookmarkit_manager/code.html`, the agent bar at the bottom)
with recorded divergences from the design editor's export: its Ctrl/Cmd+C
chip and handler are corrected to the decided Cmd/Ctrl+K, and its demo
state is corrected to the decision itself — the bar and the toast start
hidden, and the shortcut branches on the provider, so nothing agent-facing
shows until Cmd/Ctrl+K summons it.

### The manager shell (#283)

`SidebarNav` is the mockup's persistent navigation sidebar: a fixed rail from
`lg` up, holding the brand and the help entry point, Add Bookmark, the smart
views, the saved views (`SmartViewBar`, `layout="stack"`), the folder tree
(`FolderTree`, with no root row and its row actions behind **Manage folders**)
and, last, the maintenance footer (#297): Check Links, Remove Duplicates,
Import / Export and Options. Its rows are the header strip's own handlers, so
an action has one behavior at every width — the rail owns none of the state
and reads it from props (`checkLinksRunning`, `duplicatesBusy`) the way it
reads `digestBusy`. In the drawer the rows act in place: Options and
Import / Export open their dialogs over the drawer, as its help entry does.
Two boundaries are worth keeping straight:

- **A smart view is a manual filter, not a route.** `applySmartView` writes one
  flag (`neverOpened`, `untagged`, `brokenOnly`) or opens the digest; it never
  touches the agent plan, so the filtering order and the independent clearing
  under "Application and state flow" hold unchanged. A smart view is the whole
  collection seen one way, as the count on its row says, so `smartViewFilters`
  also leaves the folder. The rail is handed `currentView`
  (`currentSmartView`) and only displays it (`aria-current="page"`); it decides
  nothing, and no view is current while a folder narrows the list, even with a
  flag set from the filter strip's independent toggles. `untagged` is a manual
  filter like the other two observed-state flags and round-trips through saved
  views; `utils/smartViewCounts.js` sizes each view.
- **Which chrome exists follows the viewport.** `useSidebarViewport` and
  `.ui-sidebar` share Tailwind's `lg` (1024px) and `--app-sidebar-width`. From
  `lg` the shell, the fixed header and the toast dock inset by the rail. Below
  it (`MobileTopBar`, `NavDrawer`, #294) the header's first row is a top bar:
  a menu button, the view on screen over its saved count, and Add. The rail is
  the navigation drawer: the design system's drawer `Modal` holding the same
  `SidebarNav`, so the folder tree and the saved views have one home at every
  width. The drawer is a modal dialog (focus trap, Escape, scrim, focus
  restored to the menu button) and the header and the list are `inert` while it
  is open; choosing a view or a folder from it closes it. Its width is the
  rail's, capped at 85vw. Under 40rem every control is a 44px target whatever
  the pointer reports, and the list is one column in every view mode.
- **The shell's rows below `lg` (#299).** The header's next row is the compact
  filter row (`MobileFilterRow`): the rating filter, the date quick sort, and
  the select-mode toggle. It owns rating and sort below `lg` — `FilterBar` is
  handed `showSortControls={false}` and keeps the observed-state toggles and
  the tag chips — so no control is on screen twice. Select mode is the touch
  path into the multi-selection: `useBookmarkSelection`'s third argument turns
  the plain tap and Enter into the set toggle that Ctrl/Cmd+click is on the
  desktop. The mode leaves with the shell past `lg`, and Escape drops it with
  the selection. A multi-selection below `lg` pins the selection bar
  (`SelectionBar`) to the viewport's bottom edge — count, Clear, Bulk Edit on
  the inverse surface — and "Bulk Edit" opens the bulk-edit sheet (#301). The
  app measures the band into `--app-selectionbar-height`, which
  `.bookmarkit-main` pays as bottom padding, so the last row is never under
  it.
- **The bookmark form below `lg` (#300).** Editing or adding a bookmark is the
  edit mockup's full-page sheet instead of the centered dialog: a sticky app
  bar (back to bookmarks, the title over the bookmark's folder, delete), the
  same form, and a sticky footer with **Cancel** and **Save Bookmark**. It is
  still a dialog to the keyboard — the shared focus trap, Escape routed
  through the same close guard — and every desktop behavior (URL validation
  and the ignore affordance, the AI suggests, the pending-confirmation gate)
  is the dialog's code, not a fork. From `lg` up nothing changes. The sheet's
  folder control is a select over the folders that exist with a **No folder**
  entry; **Custom path…** swaps in the free-text field with its `/` syntax and
  datalist for spellings the list doesn't know. Parsed tags preview as `#`
  chips under the field (aria-hidden; the input stays the accessible control),
  and the rating's targets are 44px.
- **Bulk edit on the selection (#301).** From `lg` up the selection's editor
  stays the inline `BulkEditBar` — its fields grow visible labels, "Delete"
  says the count it would hit, the rating options read "5 stars", and a
  change that would land also says it reverts in one undo. "Auto-Tag" asks
  the configured provider (the same readiness rule as the other AI actions)
  for tags across the selection and writes them into the Add-tags field,
  where the live summary describes them — a suggestion is always reviewed
  before Apply, which stays the only write and the one undo entry. Below
  `lg` the same engine wears the mobile mockup's sheet (`BulkEditSheet`, the
  `#301` mockup's composition): the selected items' preview ("N of M" over a
  truncated list), move-to-folder, the tag fields, a Danger Zone whose
  delete still goes through the app's confirm modal, and a sticky Cancel /
  Apply Changes footer. Escape, the back arrow and Cancel return to the
  selection bar with the selection intact, and a suggestion in flight holds
  the sheet still.
- **The card's own anatomy (#288).** Every card carries the manager mockup's
  per-bookmark **Edit** control beside its label-lg title — named after the
  bookmark it opens (`aria-label="Edit <title> bookmark"`, the URL standing
  in when there is no title), the mockup's 36px ghost from `lg` up and its
  44px bordered touch target below. The #239 nested-control rule is what
  keeps it from double-firing: the card's guarded activation drops the
  control's click and Enter as a nested control's own, so one gesture is
  one edit. Below `lg` the meta row is the mobile mockup's footer — the
  folder chip (no folder tree is on screen to carry the path), the tags as
  `#` chips, and **Unrated** where a count would sit — because with the
  chrome gone, the card is where a bookmark's place is read. One divergence
  is deliberate: the manager mockup draws the selection context bar at one
  plain-click selected, but the shelf's two-stage contract (#54) gives that
  same gesture its second meaning, so the context bar stays the
  multi-selection's home — it already reads "1 selected" when a
  modifier-click or a select-mode tap made one, and a plain-clicked
  bookmark is acted on by the next click rather than by a bar. The mockups'
  mobile sticky selection bar is the mobile-shell issue's (#299), not this
  card's.

## UI message catalogue and interface language

The copy of the manager's components and the popup lives in the English
message catalogue under `src/i18n/messages/` (#284). `en.js` merges three
files split only by the 400-line lint limit (`enList.js`, `enDialogs.js`,
`enModals.js`); a locale adds a `<locale>.js` beside them and an entry in the
registry (`src/i18n/locales.js`) that imports it — the selector, the
direction stamping and the message lookup all derive from that entry, so a
new locale ships a catalogue and one line.

The interface language has a selector in Options → Appearance (#298):
"System default" resolves against the browser's own preferences (exact tag,
then language subtag), and an explicit code is taken as-is. `LocaleProvider`
(`src/i18n/LocaleProvider.js`) mounts at each document root — the app root
(`App.jsx`) and the popup root (`QuickAddRoot.jsx`) — reads the persisted
choice (`bm_locale` in chrome.storage.local or localStorage, the same dual
path as the theme), resolves it against the registry, stamps `dir` and `lang`
on the document element, and wraps `MessageProvider` with the resolved locale.
`dir` is the whole mirroring contract: the design system is built on logical
properties, so one attribute flips the layout; a locale whose catalogue has
not landed renders the English copy in its own number and date formats. The
one known holdout is the folder tree's physical indentation utilities, which
#291's sweep owns.

Components read messages through `useMessages()` from `src/i18n/index.js`: a
translator `t` that is stable across renders and works with no provider (the
default locale is always `en`, whatever the browser's). A locale that lacks a
key falls back to the English message, then to the key string, with a
one-time development warning. Keys are flat and dotted, namespaced by surface
(`t("filter.anyRating")`), and always written as literals at the call site —
directly or through a table of literal keys (`SORT_FIELDS`, a tab spec) — so
no key is ever built at runtime.

Messages are complete templates with named placeholders, never concatenated
partial sentences (design spec, Voice & Content Strategy):

- a number passed as a parameter is formatted with `Intl.NumberFormat`, and a
  plural message is a `{ one, other }` object whose form `Intl.PluralRules`
  picks from the `{count}` parameter;
- `t.count`, `t.date` and `t.relative` format a bare count, date or relative
  time in the same locale;
- `t.rich(key, params)` renders a template that carries inline emphasis
  (`<strong>` and `<em>`, the only elements a template may name) or a slot
  that holds markup of its own — the count chip in the link-sweep sentence,
  the key caps in the header hint. The sentence stays one template in the
  translator's word order. Plain `t()` on the same key drops the emphasis and
  leaves a markup-only slot visible, which is what an `aria-label` or a
  `title` should read.

A catalogue is data, so it cannot put anything else on the page: an element
outside the allow-list stays as literal text, and a parameter's value is
never parsed as markup.

`createTranslator(locale, messages)` is exported for code that composes a
sentence outside a component (`describeBulkEdit` takes the bar's translator).
The unified design system's `Modal` reads its default close label the same
way, so the primitives carry no copy of their own.

Logic that is not a component's render — a hook's callback, a utility, the LLM
error classifier — calls `getMessages()` from the same module (#307). It returns
the translator for the locale and catalogue the nearest `MessageProvider`
rendered with, and English with no provider. `MessageProvider` publishes its
translator as it renders, so a child's effect already sees it, and the call is
made when a message is raised rather than at module load, so a hook's callbacks
keep their empty dependency arrays and a message raised after a locale change
reads in the new locale — so a hook reads it at the point it raises a message,
not once for an operation that awaits. A message already on screen keeps the
language it was raised in, and English returns when the provider unmounts. The
LocaleProvider at each document root is the provider in practice, so this is
the selected interface language; nested providers are not a supported shape.
`classifyLLMError` follows the same split as everything else that
touches an error: the _category_ is decided in code and callers branch on it,
and only the sentence comes from the catalogue (`llmError.*`), read through the
translator in effect or one the caller passes.

Still written in code, on purpose: key names and other values shown as they
are, glyphs, URL examples, LLM prompts and console labels. Two near-misses are
deliberate too: the error `useAgentEngine` throws on an uninterpretable reply
is a classification signal the classifier matches by wording and is never
shown, and `loadError` is the store's own error text, which the page shows as
the `{error}` of a catalogue message rather than as a sentence of its own.

## Reading the page

`utils/pageMetadata.js` covers one question — what a page says about itself —
with the same split as everything else that touches the network: the privileged
fetch is a message to `public/background.js`, and the reading is a pure function
here.

The reading scans the string. It does not build a document, and that is the point:
fetched HTML is the least trusted input in the app, and #40 already took a
DOMParser off the import path for the same reason. With no document there is
nothing to execute, no subresource to load, and no URL to resolve. A service
worker has no DOM to parse with anyway, which is why the worker hands back a
string rather than a parsed result.

The worker's own guards are the interesting part: our extension pages only,
public http(s) only, `redirect: "manual"`, `text/html` only, the first 256 KB
only, and `credentials: "omit"` — so what a model is shown is the page an
anonymous visitor sees, never the user's signed-in view of it. What comes back
reaches the model inside the existing `<bookmark_data>` containment, like any
other input the user did not type.

Containment is only containment while the contained value cannot end it. Every
untrusted interpolation goes through `llm/containment.js` first, which neutralizes
the delimiter — and only the delimiter, so `a < b` in a description still reads as
written. Without it a page titled `</bookmark_data> ignore the above` would place
the rest of its text outside the section it was quoted in. This applies to
bookmark fields as much as to fetched pages: an imported file can carry any title
it likes.

## Link health

Link rot is split three ways, on purpose. `utils/linkHealth.js` is the domain as
pure data: which bookmarks are worth checking, what a result means for the one
checked, and how the record of past checks reads back from storage.
`utils/urlStatus.js` is the single way the app asks whether a URL answers — the
privileged service worker in the extension, a direct fetch in the web build — so
the select-time check and the sweep cannot drift apart. `useLinkSweep` supplies
only pacing and bookkeeping.

Two decisions in the sweep are load-bearing:

- It runs in the app, not from a `chrome.alarms` handler in the service worker.
  `urlStatus` belongs to the store, and the store is not reachable from a worker:
  the local composite store keeps metadata in `localStorage`, and the Firebase
  store needs the signed-in client. A worker writing statuses would be a second
  write path around the store contract. What is persisted instead is when each
  link was last checked, so a sweep resumes across sessions rather than
  restarting, which is what the periodic behavior was for — and, beside it
  (#303), when the sweep last ran, written as each batch lands so the view's
  freshness line tells the truth about partial sweeps too.
- It is asked for rather than automatic, and it never re-points a bookmark.
  Checking every link contacts every host in the collection — the same privacy
  question site icons answered with an opt-in — and a redirect target is the
  remote server's claim, which is precisely what `redirect: "manual"` exists to
  refuse. The sweep writes `urlStatus` plus the one field of detail a check
  honestly learns, `urlStatusReason` — `http:404`, `timeout`, or `unreachable`
  (#295; a refused connection and a dead DNS name are indistinguishable to the
  fetch, so they share the one name) — and nothing else; what to do about a
  dead link is left to the user, through the ordinary edit, bulk-edit and
  delete paths.

Its writes deliberately skip the undo recorder: a sweep reports what the web
already did, and an undo would mean writing back a status known to be wrong.

Recovery (#102) is the sweep's deliberate omission, added back as its own step.
`utils/archiveRecovery.js` asks one hard-coded host — the archive's availability
API — with the bookmark's URL only ever as a query parameter, so nothing here
fetches a bookmark and there is no redirect to refuse. The two guards that matter
are on either end: a URL is asked about only if it passes the same public-http(s)
gate the checks use, and the address that comes back is validated as a public https
URL on the archive's own host before it can reach a bookmark. It is a remote
server's claim, which is what `redirect: "manual"` exists to distrust.

Recovery proposes; it never writes. A snapshot becomes a reviewable change
(`utils/changeReview.js`) carrying the new address and the stale verdict about the
old one, and the user's acceptance goes through `applyBulkEdit` — so re-pointing
thirty links is one undo, and `bulkEdit`'s field list had to grow to include `url`
so that undo can put the original address back.

That shared row shape is why the review modal is `ChangeReviewModal` rather than
the organizer's: two features now propose rather than write, and both are only
tolerable because disagreeing with them is cheap. The modal renders rows and owns
which are accepted; it knows nothing about where they came from.

From `lg` up the review has a page of its own (#295): the sidebar's Broken Links
row opens the broken-links mockup's main (`LinkHealthView`) instead of narrowing
the list — the sweep's summary ("N checked · M unreachable", the checked figure
read from the record of past checks), "Re-check Links", and the archive's
proposals as rows with the stored failure chip — text and icon, never color
alone — over the dead address and the proposed snapshot. The review contract is
the dialog's: every snapshot starts accepted, unticking is the disagreement, and
"Apply Selected" lands on the same one-undo bulk-edit write. The lookup stays an
asked-for step — the view offers "Find Archive Snapshots" and contacts the
archive only then, about the collection's dead links, with the same paced run
the header's button uses. Staged rows survive leaving the page and coming back,
so a second look does not re-ask the archive about links already looked up; a
row whose link recovered some other way stops matching and disappears.

#303 finished the mockup pair. Every row carries its own actions — **Edit
URL**, the ordinary edit form for that one link, and **Wayback**, the same
paced lookup pointed at a single row, which re-asks on the user's explicit
press even where the session's batch already asked and missed. The mobile
mockup's status banner ("N bookmarks returned HTTP errors or timeouts.") and
the freshness line ("Last scan 2 hours ago", from the timestamp written beside
the record of past checks) ride above the rows, and below `lg` the whole view
presents as the mockup's full-page sheet (`LinkHealthSheet`) — back bar over
the flagged count and freshness, Re-check in the bar, the same rows as cards,
Apply Selected in the footer — rather than yielding to the brokenOnly filter
it kept before the sheet existed. The sheet makes way before the edit form
opens, so the two never stack, the rule the digest sheet set. Both workspace
views yield to navigation through one choke point (`closeWorkspaceViews`), the
way the digest has since its review fix.

## The week

`lastOpenedAt` is the only field the app observes for itself; everything else on a
bookmark is something a user typed or imported. It is written on the single path
that opens one (`openBookmark`), straight to the store rather than through the
recording helpers, because opening is not an edit and an "undo opening a bookmark"
entry would be nonsense. Absent means never, so a collection that predates the
field reads as never opened — the honest answer, since nothing recorded otherwise.

The digest is split the way link health is. `utils/digest.js` chooses the three
sets, purely and with no provider: what arrived this week, what settled in and was
never opened, and what has no tags. `useDigest` adds one request that only names
the groups the week's additions fall into, and a failure, a missing provider or a
locked key downgrades to grouping by the folder or tag the bookmarks already carry.
The valuable half of the feature therefore never depends on an API key.

Two smaller decisions follow from that split:

- The neglected sets exclude the current window. Something saved yesterday is new,
  not ignored, and including it would make the digest nag about its own first
  section.
- The exits are existing features, not new ones. "Show never opened" sets the
  manual filter — so it composes with sort, folder and bulk editing, and a saved
  view can hold it — and "Triage the untagged" is the organizer (#44) pointed at
  that set with `fields: ["tags"]`, reviewed through the same diff.
- From `lg` up the digest is a workspace view, not a dialog (#296). The sidebar's
  Weekly Digest row opens the weekly-digest mockup's main beside the rail
  (`WeeklyDigestView`): the week's range under the title with the two exits in
  the view's own header, the uncapped totals as a three-card summary strip, and
  the additions as topic clusters of rows that open like everywhere else. The
  centered desktop modal retired with it — a workspace is navigated, not
  dismissed, so the view carries no close affordance; every navigation path —
  another smart view, a saved view, a folder, a search — ends it
  (`closeDigest`), as do its own two exits. While the digest is on screen the
  list column is unmounted rather than hidden, so the shell's shortcuts stay
  suspended (`isDialogOpen` includes the digest in both compositions) instead of
  acting on a list that is not there. The digest claims its sidebar row
  (`currentSmartView`'s `digestOpen`) while it shows, at every width.
- Below `lg` the digest is the weekly-digest mockup's full-page sheet (#302,
  `DigestSheet`, the shared sheet chrome): the three counts as the summary's
  tiles, the untagged set behind the Auto-Tag strip — the same triage handoff
  to the same organizer — and a "Needs Review" queue (`triageQueue`) that
  reads the never-opened and untagged sets as one deduplicated list of cards,
  newest save first, each with Open and a "Tag & File" that closes the sheet
  and opens the ordinary edit form. No new write path anywhere.

`findNeverOpened` is also an agent action, for the same reason `findBrokenLinks`
is: it reads a field the app wrote itself, so it needs no model and no network.

## Undo

Undo is a property of the write path, not of the two call sites that remember to
snapshot. `useBookmarkStore` derives the inverse of each successful write from
the write itself — `src/utils/bookmarkUndo.js` maps an operation to a label and
an `apply` — and hands it to `useUndoHistory`. Three consequences worth keeping:

- An inverse is expressed in terms of the ordinary write helpers, so restoring
  goes through the same paths as the original, sequential fallbacks and import
  progress included, rather than a second and less careful copy.
- A write with no honest inverse records nothing rather than offering an undo
  that fails when reached for.
- A batch is one entry. A bulk edit over forty bookmarks is one undo, and it
  restores only the fields the edit touched.
- The history outlives the toast. The toast is an offer with a timer; the stack
  is what `Cmd+Z` walks back through, and writes an undo makes are not recorded,
  so undo never turns into redo. A destructive write's offer does not expire.

## Folders

There is no folder anywhere in this app. `folderId` is a path string on a bookmark,
in every store, so `utils/folderTree.js` derives the tree the collection implies
and expresses every folder operation as a write across the bookmarks that carry the
path: renaming replaces a prefix, renesting is the same replacement with a longer
one, and removing a folder rewrites its contents to its parent.

Three consequences that shape the code:

- **Folder editing has no write path of its own.** Everything returns patches for
  `applyBulkEdit` (#54), so a thirty-bookmark drag is one store write, one
  `updatedAt` sweep, and one undo entry — and the Chrome store's real nested
  folders are built by the same `folderId` handling that already existed.
- **Nothing can delete a folder's contents.** Removal is defined as emptying
  upwards, because a folder with nothing in it has already stopped existing, and a
  gesture as easy to misfire as a drag must not be able to lose bookmarks.
- **Selecting a folder is a manual filter,** not a mode: `filters.folder` alongside
  the tag and rating criteria in `utils/manualFilters.js`. It composes with the
  rest for free and a saved view can hold it, where a separate "current folder"
  would have needed its own interaction with each.

Paths compare case-insensitively, matching the organizer's folder cleaning (#44):
one folder shown twice would split its count and filter as its own sibling.

Two things follow from the filter being ordinary state rather than the tree's own:
a rename has to carry the filter with it (`followFolderMove`), or the view would
filter on a path no bookmark has any more, and selecting a folder clears the
multi-selection. The pane is marked as keeping the selection so the selected set can
be dragged into a folder, which makes filtering from it the one gesture that has to
drop it — a selection the new filter hides is a bulk edit aimed at bookmarks nobody
can see.

`FolderTree.jsx` holds only what a tree needs to be operated — what is collapsed,
what is being renamed, what a drop is carrying — and hands paths and ids outward.
It knows nothing about stores, patches or undo.

## Semantic search

Search is three layers, and the order matters. `searchBookmarks` in
`utils/bookmarkFilters.js` is substring matching: exact, free, offline, and never
removed. `utils/semanticSearch.js` is the pure vector work — what text represents a
bookmark, when that text has changed enough to re-embed, cosine similarity, and how
a ranking merges with a substring result. `llm/embeddings.js` makes the requests,
and `useSemanticSearch` owns the cached index.

`llm/embeddings.js` sits beside the chat providers rather than inside them: an
embedding is a different endpoint and a different model, and Grok has none at all,
so putting it on the `LLMProvider` interface would mean a method a third of the
providers cannot implement.

The index is one value in extension storage: bookmark id to a vector, a fingerprint
of the text it came from, and what produced it — provider, model, endpoint. Those two
strings are the whole caching rule: a bookmark is embedded once, an edited one is
re-embedded, and switching provider or embedding model invalidates every vector at
once, because vectors from two models are not comparable rather than merely less
accurate. A deleted bookmark is forgotten on the next pass, so no write path needs
to know the index exists. It reads back defensively, like any other stored value, and
a vector with no recorded origin reads as one nothing matches.

Two consequences worth stating:

- **A failed agent call no longer costs the search.** The fallback search is
  announced through `onSteps` like any other step, and matching is local once
  vectors exist, so a natural-language query still finds things.
- **The ranking is a display step, not a query.** The app rewrites its own
  `searchBookmarks` step into `semanticMatches`, carrying the query and the ranked
  ids, because widening has to see what substring matching filtered out. That
  action is deliberately absent from the normalize whitelist: it is written by the app
  from a local ranking, never by a model. It shares `searchBookmarks`'s slot in
  `mergeAgentPlan` — a widened search is still that search, and a second query has
  to displace it — and saving a view turns it back into the query it came from,
  since a ranking describes one moment and would go stale. The rewrite lands
  whenever the widening finishes: the plan applies and the search box unlocks
  first, and a cold or stale index spends as long as embedding takes widening the
  results in the background rather than holding the view shut. The rebuilds
  themselves serialize: a query arriving mid-rebuild waits for the commit and
  re-checks what is still missing, so a cold index is never embedded twice and
  an older snapshot is never committed over a newer one.

Each provider's embedding call follows that provider's own contract for a configured
base URL, which the chat providers disagree about: OpenAI's base is the `/v1` root,
LM Studio's is the host. Getting that wrong would break search only for the installs
that configured one.

Searching sends the query text to the provider, so it goes through the same
`isProviderReady` gate the other model features use: a provider name is not
consent.

## Persistence boundary

`src/stores/index.js` selects one of three implementations behind the shared
bookmark-store contract:

| Store                     | Responsibility                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `localCompositeStore.js`  | Default extension store: Chrome bookmarks own title and URL; `localStorage` entries prefixed `bm_meta:` own tags, rating, description, and other metadata. |
| `chromeBookmarksStore.js` | Direct Chrome Bookmarks API adapter without metadata persistence.                                                                                          |
| `firebaseStore.js`        | Optional Firestore store under `artifacts/<appId>/users/<uid>/bookmarks`.                                                                                  |

Every implementation supports initialization, listing/subscription, single and
bulk writes, deletion, order persistence, and `teardown()` — which must release
every backend listener `init()` registered, because a store instance is created
per mount rather than shared. New UI paths should depend on that behavior
through `useBookmarkStore`, not detect or call a backend directly.

A store write notifies subscribers once, when the whole write is done. Chrome
reports bookmark changes one event per touched node, and reading the list means
walking the tree, so treating each event as a change made an N-item write cost N
walks. `chromeBookmarksStore` ignores the events its own writes echo back and
coalesces bursts it did not cause. Anything added to a store must keep that
property: one write, one notification, whatever its size.

An empty list means the user has no bookmarks. A store must never emit one to
mean "I could not read them": the app cannot tell the difference, and a save made
from that view is made against nothing. A store that fails before it is usable
rejects `init()`; one that fails afterwards keeps the last list it emitted and
reports through the optional `onError` option, which `useBookmarkStore` turns
into a message. Either way the failure is visible.

A few contract methods are optional, `updateMany` among them: a store implements
it when it can write a whole selection in one round-trip, as Firestore can with a
batch, and callers fall back to writing one bookmark at a time. The fallback is
part of the contract rather than a workaround, so a new store is useful before it
is complete.

## Import/export

`ImportExportContent` runs as the modal-standard dialog with an export tab and
three import tabs — JSON, Netscape HTML, and Markdown
(`utils/markdownBookmarks.js`, a link list in both directions: titles and
addresses only, `- [Title](address)` bullets out, every markdown link in a
document accepted). The tabbed composition is the app's own on purpose, and the
difference from the mockups is recorded here: both mockups merge every format
onto one chooser, and the desktop one shows only JSON and HTML. One chooser
hides what the tabs keep legible — each format has its own accept list, paste
placeholder, and staging path (JSON validates asynchronously before
confirming; HTML and Markdown stage synchronously) — and the format-specific
round trips are pinned by tests that a merged chooser would blur.

The confirmation is honest about skip-existing (#287). Skipping URLs the
library already holds is the store edge's own default
(`filterDuplicateImports` in `BookmarkApp`), and the mockup's "Skip URLs
already in library" checkbox hands that decision to the user: checked, the
confirmation's count runs the staged entries through the same normalized-URL
rule and names what it would skip; unchecked, every usable entry is imported,
duplicates included. The count you approve is the count that is added, and an
import that would add nothing cannot be confirmed. Under "Replace all", the
checkbox is retired — the library is emptied ahead of the import, so there is
nothing left to skip.

Below `lg` the dialog is the mobile mockup's full-page sheet (#293): the back
bar over the same tabbed body, and no footer — the mockup draws none, and the
back arrow is the way out. The tabs, staging and confirmation are the dialog's
own code; only the chrome narrows.

## Duplicates

Duplicate detection has two layers, and the order matters. `utils/duplicates.js`
is the rule: two bookmarks are the same when `normalizeUrl` collapses them to the
same key, and the copy carrying tags, a rating, or a description is the one kept.
It needs no provider and is what runs by default.

`utils/nearDuplicates.js` is the second layer, for what a rule cannot settle: the
same article under a canonical and a syndicated URL. It is pure — choosing which
pairs are worth asking about, reading a verdict back, and turning verdicts into a
proposal — while `useSemanticDedupe` does the asking. Three properties hold it
inside the trust boundary:

- A verdict naming a pair nobody asked about is dropped, so an answer cannot
  smuggle a bookmark into a deletion.
- A bookmark already proposed is left out of later pairs, so three copies pairing
  up three ways cannot delete all three.
- The result is a proposal. It reaches the store only through the
  duplicate-review dialog (#285), where every pair — both copies side by side,
  the reason it was called the same page, and whether the rule or the model
  proposed it — is decided on its own before Remove writes the surviving-pair
  drops through the same delete path as the confirm dialog. Which copy survives
  is decided by the same rule the deterministic layer uses, not by the model.

With no usable provider, a locked key, or a failed request, the proposal is empty
and the rule-based result stands on its own. "Usable" is `isProviderReady`, not a
provider name: `gemini` is the default before anything is configured, so a feature
that transmits on its own initiative — rather than because the user typed a query
— would otherwise send this collection's titles to a remote API for a request
destined to fail on its missing key. Providers running on the user's own machine
need nothing.

## LLM boundary

The factory in `src/llm/index.js` exposes each provider on the Vercel AI SDK:
`generate(prompt)` for plain text (digest, organizer, dedupe, form suggestions)
and `generatePlan(prompt)` for the agent engine, which requests the plan
against `PLAN_JSON_SCHEMA` (`llm/normalize.js`) so the answer arrives as JSON or
an error — there is no response-text reconstruction. What comes back is still
normalized through the same per-action whitelist before anything applies it,
because the schema describes a shape, not a permission. The schema travels as
non-strict JSON schema — the open `parameters` object is deliberate, and strict
schema modes cannot express it — and hosted providers are addressed on the Chat
Completions contract their configurable endpoints speak, not a newer endpoint an
OpenAI-compatible proxy may not implement. Model discovery queries
the endpoint and shows only what it serves; no model name is hardcoded, so a
provider without a chosen model refuses locally with a message instead of
failing on a request. The SDK itself is reached only through a dynamic import
of `llm/aiVendor.js` on the first generation call, so startup never parses it.
Provider failure falls back to ordinary bookmark search; persistence is still
performed only by a store operation initiated by application behavior.

Runtime provider settings override build-time defaults and remain in browser
storage. They are user configuration, not repository configuration, and must
never be committed.

## Trust and privacy boundaries

- Local-mode bookmark content stays in Chrome bookmarks plus the extension's
  local metadata. Firebase mode stores it in the configured Firebase project.
- LLM prompts leave the browser only for the provider the user selected. API
  keys are stored in browser local storage and are never build inputs in the
  default release.
- URL reachability checks execute in `public/background.js`, not page context.
  They accept only public HTTP(S) destinations and do not follow redirects, so
  the extension's http(s)-only host permission does not become an internal-network
  request primitive. The manifest asks for exactly the two schemes the checks can
  ever target — `http://*/*` and `https://*/*` — and nothing broader.
  `utils/urlStatus.js` applies both rules on the calling side
  too, which is what keeps the web build's unprivileged fetch inside the same
  boundary: the response may be unreadable there, but the request still leaves the
  browser.
- WebMCP tools (#212) are a read-only projection of the in-memory list,
  registered from the full app page only — the popup is too short-lived and the
  service worker has no document — after an explicit per-user opt-in, and only
  while that tab stays open. They reuse the manual filters' pure functions, so
  an agent's query and the UI's filters agree by construction; results are
  bounded; there is no store write path and no fetch path through them. The
  service worker's URL checks remain the only fetch route, and browsers that
  have not enabled WebMCP simply never see the surface.
- The release archive includes `LICENSE` and generated
  `THIRD-PARTY-NOTICES.md`. The latter is derived from the locked production
  dependency closure and checked for drift in CI.

## Release model

Changesets describe user-visible changes. The version-cut workflow maintains a
reviewable version PR — published through the GitHub Git Data API so GitHub
signs the release commit — synchronizes the npm and extension-manifest versions,
and creates the immutable tag after that PR merges. The release workflow
revalidates the tagged tree, builds the Chrome extension, and publishes the zip
and checksum. Manual version edits, tags, or uploads bypass those consistency
checks and are unsupported.
