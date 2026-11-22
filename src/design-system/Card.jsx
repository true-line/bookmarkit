import React from "react";

// Unified UI design system card (#238). Sticker-sheet variants: card-elevated
// (the resting white card), card-action (elevated card with a footer action
// row), card-interactive and card-interactive-2 (the clickable readings — the
// second is the selected/checked state). The sticker-sheet HTML files were
// not in the supplied archive, so "interactive-2" as selected is this
// implementation's reading of the name; revisit if the sheets surface.

export function Card({
  variant = "elevated",
  actions = null,
  onClick,
  children,
  className = "",
  ...props
}) {
  const interactive = variant === "interactive" || variant === "interactive-selected";
  if (interactive) {
    return (
      <div
        // A card is a composition surface, so it stays a div with button
        // semantics rather than a real <button> — nested interactive content
        // inside a <button> is invalid HTML. Enter and Space activate it the
        // way a button would.
        role="button"
        tabIndex={0}
        className={`ui-card ui-card--interactive ${
          variant === "interactive-selected" ? "ui-card--selected" : ""
        } ${className}`}
        onClick={onClick}
        onKeyDown={(event) => {
          if (!onClick) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick(event);
          }
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
  return (
    <div className={`ui-card ${className}`} {...props}>
      {children}
      {actions && <div className="ui-card-actions">{actions}</div>}
    </div>
  );
}
