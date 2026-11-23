// ARCH-06: Individual bookmark card extracted from BookmarkApp.jsx.
// PERF-06, PERF-09: Wrapped in React.memo to skip re-renders when props haven't changed.
// #251: the card is the design system's card-interactive recipe — the resting
// manager-screen card (hairline border, hover raise) with the selected state
// on card-interactive-2, whose 2px primary border and aria-pressed the Card
// component renders itself.

import React from "react";
import { Card, Tag, Typography } from "../design-system/index.js";
import { fromNestedControl } from "../design-system/nested-control.js";
import { useMessages } from "../i18n/index.js";
import { StarIcon } from "./icons.jsx";
import { FAVICON_PLACEHOLDER, faviconSrc } from "../utils/favicon.js";

// #24: Ratings are 0–5 integers, but stored data is not guaranteed to be one.
const clampRating = (value) => Math.min(5, Math.max(0, Math.round(Number(value)) || 0));

const BookmarkCard = React.memo(function BookmarkCard({
  bookmark,
  isSelected,
  isMultiSelected,
  isPendingDelete,
  remoteFavicons,
  onClick,
  onDoubleClick,
  onKeyDown,
  onDragStart,
}) {
  const t = useMessages();
  const isActive = isSelected || isMultiSelected;
  const isInvalid = bookmark.urlStatus === "invalid" || bookmark.unreachable;
  // #24: stored data is not guaranteed complete — the legacy view defaulted
  // these, and an imported or half-synced bookmark still renders.
  const { title, url, description, faviconUrl, tags = [] } = bookmark;
  const rating = clampRating(bookmark.rating);

  // #39: faviconSrc decides, including whether the bookmark's own icon may be
  // fetched — a stored URL can point at a third party just as easily. A broken
  // icon falls back to the inline placeholder, not to another remote request.
  const favSrc = faviconSrc(url, {
    storedIcon: faviconUrl,
    allowRemote: remoteFavicons,
  });

  // The manager's activation is the selection hook's two-stage contract — the
  // first gesture selects, the same gesture on the selected bookmark acts —
  // with #190's held-key guard, so the app's handlers replace the Card
  // component's one-stage activation here. The #239 nested-control rule is
  // applied by hand for the same reason: a nested control's events belong to
  // it, never also to the card.
  const guarded = (handler) => (event) => {
    if (!handler || fromNestedControl(event)) return;
    handler(event);
  };

  return (
    <Card
      variant={isActive ? "interactive-selected" : "interactive"}
      className={`ui-bookmark-card ${isPendingDelete ? "ui-bookmark-card--pending" : ""}`}
      onClick={guarded(onClick)}
      onKeyDown={guarded(onKeyDown)}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={onDoubleClick}
      // #55: a card is draggable only where there is somewhere to drop it.
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
    >
      {isInvalid && (
        <span
          className="ui-bookmark-status"
          role="img"
          title={t("bookmarkCard.unreachable")}
          aria-label={t("bookmarkCard.unreachable")}
        />
      )}
      <span className="ui-bookmark-favicon">
        <img
          src={favSrc}
          alt=""
          width={20}
          height={20}
          onError={(event) => {
            event.currentTarget.src = FAVICON_PLACEHOLDER;
          }}
        />
      </span>
      <div className="ui-bookmark-body">
        <Typography variant="headline-sm" as="h3" dir="auto" className="ui-bookmark-title">
          {title}
        </Typography>
        <p className="ui-url ui-bookmark-url" dir="ltr">
          {url}
        </p>
        {description && <p className="ui-bookmark-description">{description}</p>}
        {(tags.length > 0 || rating > 0) && (
          <div className="ui-bookmark-meta">
            {tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            {rating > 0 && (
              <span
                className="ui-bookmark-rating"
                role="img"
                aria-label={t("bookmarkCard.rating", { rating })}
              >
                <StarIcon />
                <span className="ui-type-label-sm ui-numeric">{t.count(rating)}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});

export default BookmarkCard;
