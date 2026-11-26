import React from "react";
import { useMessages } from "../i18n/index.js";

// Unified UI design system rating input (#289), from the edit-bookmark
// screen: five 36px star targets with the visible "N / 5" readout beside
// them, filled stars in the primary role. The radiogroup carries the
// mockup's static group label — the readout is the live announcer, so a
// rating change reads as "4 / 5" rather than re-labeling the group.
//
// The #24 rating contract travels with the control: ratings are 0–5
// integers, but stored data is not guaranteed to be one.
const clampRating = (value) => Math.min(5, Math.max(0, Math.round(Number(value)) || 0));

export function StarRating({
  value = 0,
  onChange,
  readOnly = false,
  size = 22,
  buttonSemantics = false,
}) {
  const t = useMessages();
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

  // The mockup's readout: visible value, announced politely when it changes.
  // Read-only render puts it inside the role="img" label, so it stays decorative.
  const readout = (
    <span className="ui-rating-readout" aria-live={readOnly ? undefined : "polite"}>
      {t("starRating.readout", { rating })}
    </span>
  );

  return (
    <div
      className="ui-star-rating"
      role={readOnly ? "img" : buttonSemantics ? "group" : "radiogroup"}
      aria-label={readOnly ? t("starRating.groupLabel", { rating }) : t("starRating.groupName")}
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
            aria-label={t(rating === star ? "starRating.starSelected" : "starRating.star", {
              star,
            })}
            className={filled ? "is-filled" : ""}
            tabIndex={isRadioGroup && star !== focusedStar ? -1 : undefined}
            onClick={() => onChange?.(rating === star ? 0 : star)}
          >
            {icon}
          </button>
        );
      })}
      {readout}
    </div>
  );
}
