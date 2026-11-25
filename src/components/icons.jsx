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
