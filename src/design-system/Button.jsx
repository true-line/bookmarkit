import React from "react";

// Unified UI design system button (#238). Sticker-sheet variants:
// button-primary, button-icon, button-with-icon.
//
// Intent is the spec's color rule made structural: primary is the brick
// crimson for local, offline actions ("Add New", "Save Bookmark"), tertiary
// is the unified violet every model-powered action wears ("Suggest"), so AI
// features are distinguishable at a glance from local ones. Labels use Title
// Case for primary actions and explicit verb-object phrasing — never a bare
// "OK". Text wraps rather than ellipsising: translated labels run 30–40%
// longer and buttons never fix their width.

export function Button({
  children,
  intent = "primary",
  type = "button",
  disabled = false,
  loading = false,
  leadingIcon = null,
  className = "",
  style = {},
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`ui-button ui-button--${intent} ${className}`}
      style={style}
      {...props}
    >
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : leadingIcon}
      {children}
    </button>
  );
}

// Sticker sheet: button-icon. The visible icon is aria-hidden; `label` is the
// accessible name and the tooltip, and is required — an icon-only control
// with no name is exactly the "status by color alone" mistake in button form.
export function IconButton({ children, label, className = "", ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`ui-icon-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
