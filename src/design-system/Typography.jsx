import React from "react";

// Unified UI design system typography (#238). Sticker-sheet variants:
// typography-display (the display + headline scale), typography-body
// (body-lg/md/sm), typography-label (label-lg/md/sm, plus the mono and kbd
// helpers the spec folds into the type system).
//
// Red Hat Text carries headings, Radio Canada Big carries UI and body copy,
// Fira Code carries URLs, shortcut chips and provider pills. The default tag
// per variant keeps the semantic level honest in specimens; callers override
// with `as` where the document structure disagrees.

const DEFAULT_TAGS = {
  "display-lg": "h1",
  "display-lg-mobile": "h1",
  "headline-lg": "h2",
  "headline-md": "h3",
  "headline-sm": "h4",
  "body-lg": "p",
  "body-md": "p",
  "body-sm": "p",
  "label-lg": "span",
  "label-md": "span",
  "label-sm": "span",
  "mono-md": "span",
  "mono-sm": "span",
};

export function Typography({
  variant = "body-md",
  as,
  numeric = false,
  className = "",
  children,
  ...props
}) {
  const Tag = as || DEFAULT_TAGS[variant] || "p";
  const classes = [`ui-type-${variant}`, numeric ? "ui-numeric" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
}
