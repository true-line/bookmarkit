import React from "react";

// Unified UI design system card (#238). Sticker-sheet variants: card-elevated
// (the resting white card), card-action (elevated card with a footer action
// row — listed on the sticker sheet but unexercised by the screens),
// card-interactive and card-interactive-2. The manager screen confirms the
// interactive recipe: a white card with a hairline border that raises and
// steps its border to outline on hover, and the "-2" reading as the selected
// state — a 2px primary border with aria-pressed at the call site.

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
