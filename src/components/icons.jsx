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

/** "Add Bookmark" (button-primary leading icon). */
export function AddIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M12 5v14M5 12h14" />
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
