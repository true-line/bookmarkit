import React from "react";
import { fromNestedControl } from "./nested-control.js";

// Unified UI design system card (#238). Sticker-sheet variants: card-elevated
// (the resting white card), card-action (elevated card with a footer action
// row — listed on the sticker sheet but unexercised by the screens),
// card-interactive and card-interactive-2. The manager screen confirms the
// interactive recipe: a white card with a hairline border that raises and
// steps its border to outline on hover, and the "-2" reading as the selected
// state — a 2px primary border with aria-pressed rendered by the component.

// Events coming from nested interactive content belong to that content — a
// nested link or button never also fires the card action. The rule itself
// lives in nested-control.js so a call site that owns the card's activation
// (the manager's two-stage bookmark selection) applies the same predicate.

export function Card({
  variant = "elevated",
  actions = null,
  onClick,
  children,
  className = "",
  ...props
}) {
  const interactive = variant === "interactive" || variant === "interactive-selected";

  // One activation path for click and keyboard.
  function handleCardActivation(event) {
    if (!onClick || fromNestedControl(event)) return;
    if (event.type === "keydown") {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
    }
    onClick(event);
  }

  if (interactive) {
    return (
      <div
        // A card is a composition surface, so it stays a div with button
        // semantics rather than a real <button> — nested interactive content
        // inside a <button> is invalid HTML. Enter and Space activate it the
        // way a button would.
        role="button"
        tabIndex={0}
        aria-pressed={variant === "interactive-selected"}
        className={`ui-card ui-card--interactive ${
          variant === "interactive-selected" ? "ui-card--selected" : ""
        } ${className}`}
        onClick={handleCardActivation}
        onKeyDown={handleCardActivation}
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
