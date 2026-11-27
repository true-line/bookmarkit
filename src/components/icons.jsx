// #250: the manager chrome's inline icon set. The design system ships no icon
// primitive — its stories inline their SVGs — so the migrated header, filter
// and toolbar region draws from one stroke-style set here (2px, currentColor,
// decorative by default) instead of repeating paths per surface. The glyphs
// shadow the mockups' Material Symbols picks: search, add, swap_vert,
// filter_none, calendar_today, health_and_safety, auto_awesome.

import React from "react";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

/** Leading search/filter icon (input-field-icon). */
export function SearchIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

/** Sort direction (button-with-icon); `up` reads ascending. */
export function ArrowIcon({ up = true, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      {up ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M19 12l-7 7-7-7" />}
    </svg>
  );
}

/** The shell's date quick sort (swap_vert): the two directions, one press apart. */
export function SortIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M8 4v13M4.5 13.5L8 17l3.5-3.5" />
      <path d="M16 20V7M12.5 10.5L16 7l3.5 3.5" />
    </svg>
  );
}

/** "Add Bookmark" (button-primary leading icon). */
export function AddIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** The empty shelf's Import reading (upload_file). */
export function UploadIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      <path d="M12 3v12M7 8l5-5 5 5" />
    </svg>
  );
}

/** Import/Export (swap_vert). */
export function SwapIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M8 17V3M4 7l4-4 4 4" />
      <path d="M16 7v14M12 17l4 4 4-4" />
    </svg>
  );
}

/** Remove Duplicates (filter_none — two stacked sheets). */
export function CopiesIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

/** Digest (calendar_today). */
export function CalendarIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/** Check Links (health_and_safety — shield with a cross). */
export function HealthIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  );
}

/** The selection bar's count marker (check_box). */
export function SelectionIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

/** The selection bar's count marker (check_circle), on the inverse band. */
export function CheckCircleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

/** "Bulk Edit" (edit_note): the pencil over the lines it writes. */
export function EditNoteIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M4 8h10M4 13h7M4 18h10" />
      <path d="M17.5 3.5l3 3L12 15h-3v-3z" />
    </svg>
  );
}

/** The card's per-bookmark "Edit" (edit: the bare pencil), #288. */
export function EditIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

/** The mobile card's folder chip (folder: the tabbed folder), #288. */
export function FolderIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 007.93 3H4a2 2 0 00-2 2v13a2 2 0 002 2Z" />
    </svg>
  );
}

/** A row's per-card "Wayback" action (archive: the lidded box) in the
    link-health view (#303). */
export function ArchiveIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

/** The card's rating reading (mockup: one filled star beside the count). */
export function StarIcon({ size = 14 }) {
  // Filled by design — the mockup's star reads solid (`FILL 1`), unlike the
  // stroke set above, so it declares its own paint instead of the base props.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

/** The provider-ready badge on the search field (auto_awesome). */
export function SparkIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15v4M17 17h4" />
    </svg>
  );
}

/** Help and keyboard shortcuts (help — a ringed question mark). */
export function HelpIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 115.82 1c-.44.86-1.26 1.3-1.91 1.63-.51.26-.75.52-.75.87v.5" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/** Options (settings — the gear). The header's icon button drew it inline
 *  before the sidebar's footer joined it (#297); both use this one now. */
export function SettingsIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

/* Navigation sidebar (#283): the mockup's Smart views glyphs — bookmarks,
   calendar_today, visibility_off, label_off, link_off. */

/** All Bookmarks (bookmarks). */
export function BookmarksIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2z" />
      <line x1="14" y1="3" x2="8" y2="11" />
    </svg>
  );
}

/** Never Opened (visibility_off). */
export function EyeOffIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/** Untagged (label_off — a tag struck through). */
export function TagOffIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M12.586 2.586A2 2 0 0011.172 2H4a2 2 0 00-2 2v7.172a2 2 0 00.586 1.414l8.704 8.704a2.426 2.426 0 003.42 0l6.58-6.58a2.426 2.426 0 000-3.42z" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

/** Broken Links (link_off — a link parted in the middle). */
export function LinkOffIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M9 17H7A5 5 0 017 7" />
      <path d="M15 7h2a5 5 0 014 8" />
      <line x1="8" y1="12" x2="12" y2="12" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

/** Re-check Links (refresh — a circular arrow) in the link-health view (#295). */
export function RefreshIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M21 12a9 9 0 11-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

/** DNS Unreachable chip (dns — two stacked hosts) in the link-health view (#295). */
export function DnsIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <rect x="3" y="4" width="18" height="6" rx="2" />
      <rect x="3" y="14" width="18" height="6" rx="2" />
      <line x1="7" y1="7" x2="7" y2="7.01" />
      <line x1="7" y1="17" x2="7" y2="17.01" />
    </svg>
  );
}

/** Timeout chip (timer — a dial and its button) in the link-health view (#295). */
export function TimerIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="13" r="8" />
      <line x1="12" y1="13" x2="12" y2="9" />
      <line x1="10" y1="2" x2="14" y2="2" />
    </svg>
  );
}

/** "Open navigation menu" (button-icon leading icon — menu). */
export function MenuIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

/** "Close navigation menu" (button-icon leading icon — close). */
export function CloseIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/** The sheet app bar's back arrow (arrow_back) — the narrow sheets' way out.
 *  The options and import/export sheets draw from the shared set (#293); the
 *  older sheet twins still carry the same glyph inline. */
export function BackIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}
