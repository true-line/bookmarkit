// ARCH-06: Individual bookmark card extracted from BookmarkApp.jsx.
// PERF-06, PERF-09: Wrapped in React.memo to skip re-renders when props haven't changed.
// #251: the card is the design system's card-interactive recipe — the resting
// manager-screen card (hairline border, hover raise) with the selected state
// on card-interactive-2, whose 2px primary border and aria-pressed the Card
// component renders itself.
// #288: the card carries the mockups' own anatomy — the per-bookmark Edit
// control beside the label-lg title, and below `lg` the mobile mockup's meta
// footer (folder chip, # tags, Unrated where the count would sit).

import React from "react";
import { Card, Tag, Typography } from "../design-system/index.js";
import { fromNestedControl } from "../design-system/nested-control.js";
import { useMessages } from "../i18n/index.js";
import { EditIcon, FolderIcon, StarIcon } from "./icons.jsx";
import { FAVICON_PLACEHOLDER, faviconSrc } from "../utils/favicon.js";

// #24: Ratings are 0–5 integers, but stored data is not guaranteed to be one.
const clampRating = (value) => Math.min(5, Math.max(0, Math.round(Number(value)) || 0));

const BookmarkCard = React.memo(function BookmarkCard({
  bookmark,
  isSelected,
  isMultiSelected,
  isPendingDelete,
  isMobileViewport,
  remoteFavicons,
  onClick,
  onDoubleClick,
  onKeyDown,
  onDragStart,
  onEdit,
}) {
  const t = useMessages();
  const isActive = isSelected || isMultiSelected;
  const isInvalid = bookmark.urlStatus === "invalid" || bookmark.unreachable;
  // #24: stored data is not guaranteed complete — the legacy view defaulted
  // these, and an imported or half-synced bookmark still renders.
  const { title, url, description, faviconUrl, tags = [], folderId } = bookmark;
  const rating = clampRating(bookmark.rating);
  // #288: the mockup names the Edit control after the bookmark it opens; an
  // empty title falls back to the URL, exactly as the heading does.
  const displayTitle = title || url;

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
  // it, never also to the card — the rule that guards any control a caller
  // nests into the body. The Edit control needs no such guard: it renders on
  // the shell, outside the card's button role entirely, so its events cannot
  // reach the guarded handlers at all (see its JSX below).
  const guarded = (handler) => (event) => {
    if (!handler || fromNestedControl(event)) return;
    handler(event);
  };

  return (
    <div
      className={`ui-bookmark-card-shell ${isMobileViewport ? "ui-bookmark-card-shell--mobile" : ""} ${
        onEdit ? "ui-bookmark-card-shell--editable" : ""
      }`}
    >
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
          <Typography variant="label-lg" as="h3" dir="auto" className="ui-bookmark-title">
            {title}
          </Typography>
          <p className="ui-url ui-bookmark-url" dir="ltr">
            {url}
          </p>
          {description && <p className="ui-bookmark-description">{description}</p>}
          {/* #288: below `lg` the meta row is the mobile mockup's footer — the
              folder chip (no folder tree is on screen to carry it), the tags as
              # chips, and Unrated in the slot a count would hold. From `lg` up
              the desktop mockup's reading stands: plain chips, the count only,
              and no row at all when there is nothing to show. */}
          {(isMobileViewport || tags.length > 0 || rating > 0) && (
            <div className="ui-bookmark-meta">
              {isMobileViewport && folderId && (
                <span className="ui-bookmark-folder">
                  <FolderIcon />
                  <span className="ui-bookmark-folder-path">{folderId}</span>
                </span>
              )}
              {tags.map((tag) => (
                <Tag key={tag}>{isMobileViewport ? `#${tag}` : tag}</Tag>
              ))}
              {rating > 0 ? (
                <span
                  className="ui-bookmark-rating"
                  role="img"
                  aria-label={t("bookmarkCard.rating", { rating })}
                >
                  <StarIcon />
                  <span className="ui-type-label-sm ui-numeric">{t.count(rating)}</span>
                </span>
              ) : (
                isMobileViewport && (
                  <span className="ui-bookmark-unrated">{t("bookmarkCard.unrated")}</span>
                )
              )}
            </div>
          )}
        </div>
      </Card>
      {/* The Edit control is the card's sibling, never its child: the card is
          itself a button (the #251 recipe), and a button inside a button hands
          assistive technology two conflicting semantics (codex P2 on #288).
          Living on the shell also puts its events beyond the card's guarded
          activation — one gesture, one meaning. It sits at the mockup's
          pulled-in top-end corner, and the status dot holds the start corner,
          so the two never share a hit area. */}
      {onEdit && (
        <button
          type="button"
          className="ui-bookmark-edit"
          aria-label={t("bookmarkCard.edit", { title: displayTitle })}
          onClick={() => onEdit(bookmark)}
        >
          <EditIcon />
        </button>
      )}
    </div>
  );
});

export default BookmarkCard;
