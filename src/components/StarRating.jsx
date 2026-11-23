// The rating control, extracted verbatim from the retired legacy
// DesignSystem.jsx library (#255) — the popup's quick-add form is its only
// consumer, and the #24 string-coercion contract travels with it.
import React from "react";

// #24: Ratings are 0–5 integers, but stored data is not guaranteed to be one.
const clampRating = (value) => Math.min(5, Math.max(0, Math.round(Number(value)) || 0));

export function StarRating({
  value = 0,
  onChange,
  readOnly = false,
  size = 24,
  buttonSemantics = false,
}) {
  const starRefs = React.useRef([]);
  // #24: A rating can reach here as a string — a JSON import writes through what
  // the file said. Every comparison below has to agree with the fill, or the
  // control renders as rated with nothing checked and so has no tab stop at all.
  const rating = clampRating(value);
  // A radiogroup is one tab stop, so focus moves with the arrow keys instead of
  // Tab. A group of toggle buttons keeps its five natural tab stops.
  const isRadioGroup = !readOnly && !buttonSemantics;
  const focusedStar = rating === 0 ? 1 : rating;

  const select = (star) => {
    onChange?.(star);
    starRefs.current[(star === 0 ? 1 : star) - 1]?.focus();
  };

  const handleKeyDown = (event) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    // Stepping below one star clears the rating, which the pointer can already
    // do by re-activating the selected star.
    select(clampRating(rating + step));
  };

  return (
    <div
      className="ui-star-rating"
      role={readOnly ? "img" : buttonSemantics ? "group" : "radiogroup"}
      aria-label={`Rating: ${rating} of 5`}
      onKeyDown={isRadioGroup ? handleKeyDown : undefined}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rating;
        const icon = (
          <svg
            width={size}
            height={size}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.683-1.539 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.783.565-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
          </svg>
        );
        if (readOnly) {
          return (
            <span key={star} className={filled ? "is-filled" : ""}>
              {icon}
            </span>
          );
        }
        return (
          <button
            key={star}
            ref={(node) => {
              starRefs.current[star - 1] = node;
            }}
            type="button"
            role={buttonSemantics ? undefined : "radio"}
            // Exactly one radio is checked, even though the fill is cumulative.
            aria-checked={buttonSemantics ? undefined : star === rating}
            aria-pressed={buttonSemantics ? filled : undefined}
            aria-label={`${star} star${star === 1 ? "" : "s"}${rating === star ? " (selected — activate to clear)" : ""}`}
            className={filled ? "is-filled" : ""}
            tabIndex={isRadioGroup && star !== focusedStar ? -1 : undefined}
            onClick={() => onChange?.(rating === star ? 0 : star)}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
