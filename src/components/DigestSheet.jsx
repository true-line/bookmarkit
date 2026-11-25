// #302: the mobile weekly digest (design/mockups
// /bookmarkit_mobile_weekly_digest/code.html 186–277) — what DigestModal
// becomes below `lg`, where the week's triage leaves the centered modal for
// the mockup's full-page sheet: a sticky app bar (back, the title over the
// week's range and count, Auto-Tag), the summary's three counts, and the
// Needs Review queue with an Open and a Tag & File action on every card. A
// presentational twin of the modal, like BulkEditSheet (#301): the sets come
// from utils/digest.js, and every action is the app's own write path —
// Auto-Tag is the digest's triage handoff to the organizer, Tag & File opens
// the bookmark in the edit form, Open opens the page. Still a dialog to the
// keyboard, and part of whatever the page is doing: a click inside must never
// dismiss a selection behind it.

import React from "react";
import { keepsSelectionProps } from "../hooks/useBookmarkSelection.js";
import { Button, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import { EditNoteIcon } from "./icons.jsx";

// The sheet app bar's back arrow — the edit-bookmark sheet's glyph (#300).
function BackIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

// The queue card's page glyph, per the mockup's article icon.
function ArticleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
    </svg>
  );
}

// The Open action's open_in_new glyph.
function OpenIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
    </svg>
  );
}

const muted = { color: "var(--ui-on-surface-variant)" };

// One summary tile: the mockup's count over its label, the Unopened count in
// the primary tint and the Untagged one in the tertiary, as drawn.
const Tile = ({ value, label, accent }) => (
  <div className="ui-digest-tile">
    <Typography
      variant="headline-md"
      as="span"
      numeric
      className="block"
      style={accent ? { color: accent } : undefined}
    >
      {value}
    </Typography>
    <Typography variant="label-sm" as="span" className="block" style={muted}>
      {label}
    </Typography>
  </div>
);

const DigestSheet = ({
  sheetRef,
  sheetTitleId,
  count,
  untaggedCount,
  neverOpenedCount,
  queue,
  range,
  autoTagButton,
  onOpen,
  onEdit,
  onClose,
}) => {
  const t = useMessages();

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={sheetTitleId}
      tabIndex={-1}
      className="ui-sheet ui-sheet--digest"
      {...keepsSelectionProps}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        // Like the dialog's panel: never let the app's shortcuts hear it.
        event.stopPropagation();
        onClose();
      }}
    >
      <header className="ui-sheet-bar">
        <button
          type="button"
          className="ui-icon-button"
          aria-label={t("digest.backAria")}
          onClick={onClose}
        >
          <BackIcon />
        </button>
        <div className="ui-sheet-heading">
          <h2 id={sheetTitleId}>{t("digest.title")}</h2>
          <p className="ui-sheet-subtitle ui-numeric">{t("digest.rangeSaved", { range, count })}</p>
        </div>
        {autoTagButton}
      </header>
      <main className="ui-sheet-body">
        <section className="ui-sheet-section" aria-label={t("digest.summaryAria")}>
          <div className="grid grid-cols-3 gap-2">
            <Tile value={count} label={t("digest.summarySaved")} />
            <Tile
              value={neverOpenedCount}
              label={t("digest.summaryUnopened")}
              accent="var(--ui-primary)"
            />
            <Tile
              value={untaggedCount}
              label={t("digest.summaryUntagged")}
              accent="var(--ui-tertiary)"
            />
          </div>
        </section>

        {queue.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <Typography variant="label-lg" as="h3">
                {t("digest.needsReviewTitle")}
              </Typography>
              <Typography variant="label-sm" as="span" numeric style={muted}>
                {t("digest.queueCount", { count: queue.length })}
              </Typography>
            </div>
            {queue.map(({ bookmark, days, untagged, neverOpened: neverOpenedFlag }) => {
              const reasons = [
                untagged && t("digest.flagUntagged"),
                neverOpenedFlag && t("digest.flagNeverOpened"),
              ].filter(Boolean);
              return (
                <article key={bookmark.id} className="ui-sheet-section">
                  <div className="flex items-start gap-3">
                    <span className="ui-digest-icon" aria-hidden="true">
                      <ArticleIcon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Typography variant="label-lg" as="h4" dir="auto" className="truncate">
                        {bookmark.title || bookmark.url}
                      </Typography>
                      <Typography
                        variant="mono-sm"
                        as="p"
                        dir="ltr"
                        className="truncate"
                        style={muted}
                      >
                        {bookmark.url}
                      </Typography>
                      <Typography variant="body-sm" as="p" style={muted}>
                        {reasons.length > 0
                          ? `${t("digest.daysAgo", { count: days })} · ${reasons.join(" · ")}`
                          : t("digest.daysAgo", { count: days })}
                      </Typography>
                    </div>
                  </div>
                  <div className="ui-digest-actions">
                    <Button
                      type="button"
                      intent="secondary"
                      leadingIcon={<OpenIcon />}
                      onClick={() => onOpen(bookmark)}
                    >
                      {t("digest.openCard")}
                    </Button>
                    <Button
                      type="button"
                      intent="primary"
                      leadingIcon={<EditNoteIcon size={16} />}
                      onClick={() => onEdit(bookmark)}
                    >
                      {t("digest.tagAndFile")}
                    </Button>
                  </div>
                </article>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
};

export default DigestSheet;
