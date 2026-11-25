// #296: The weekly digest as a workspace view — the weekly-digest mockup's
// main (design/mockups/bookmarkit_weekly_digest/code.html 288–392), living
// beside the navigation sidebar the way the manager does, instead of over it
// in a modal. The desktop modal retires here: from `lg` the sidebar's
// Weekly Digest row opens this view, and the view's own header carries the
// mockup's reading — the title over the week's range, "Show never opened"
// and "Triage untagged" — because a workspace is navigated, not dismissed.
// Leaving is the sidebar's job (another view), or one of the two actions
// handing the week's work to the filters and the organizer, exactly as the
// modal's footer did.
//
// It renders what it is given and decides nothing, as the modal never did:
// which bookmarks belong in each set is `utils/digest.js`, and the theme
// names either came from a model or from the folders the bookmarks are
// already in — the view cannot tell, on purpose.
//
// - The summary strip reports the week with the uncapped totals, its three
//   figures in the mockup's display type with tabular figures; the side
//   notes read the digest's own facts (N topic groups, the 7-day settle,
//   the triage handoff).
// - The topic clusters render the week's additions under their themes,
//   one row per bookmark: the favicon roundel, the title, the URL in the
//   mono type the mockup gives URLs. The title is the control that opens
//   the bookmark, and opening records the visit the digest reads next
//   week. A theme's summary shows when a model wrote one; the fallback
//   grouping has none to show.
//
// Below `lg` (#302) the digest is still the mobile mockup's full-page
// sheet (`DigestSheet`): same data, same actions, different chrome — the
// trap arms only for the sheet, because the view is no dialog.

import React, { useEffect, useId, useMemo, useRef } from "react";

import { WEEK_MS, themeItems, triageQueue } from "../utils/digest.js";
import { FAVICON_PLACEHOLDER, faviconSrc } from "../utils/favicon.js";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import { useSidebarViewport } from "../hooks/useSidebarViewport.js";
import { Button, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import DigestSheet from "./DigestSheet.jsx";

// The triage action's leading glyph, per the mockup's auto_awesome sparkles.
// The visible icon is aria-hidden; the button's label carries the name.
function SparkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
    </svg>
  );
}

const mutedStyle = { color: "var(--ui-on-surface-variant)" };

// The week the digest reports, as the mockup's "Nov 14 – Nov 21" range.
const weekRange = (now) => {
  const day = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  return `${day.format(now - WEEK_MS)} – ${day.format(now)}`;
};

// One summary-strip card: the mockup's label over its figure, with the side
// note riding the baseline. `accent` tints the note — primary for the topic
// groups, tertiary for the triage handoff — where the mockup colors them.
const MetricCard = ({ label, value, note, accent }) => (
  <article className="ui-digest-metric">
    <Typography variant="label-md" as="span" style={mutedStyle}>
      {label}
    </Typography>
    <div className="flex items-baseline justify-between gap-2">
      <Typography variant="display-lg-mobile" as="span" numeric>
        {value}
      </Typography>
      <Typography
        variant="label-sm"
        as="span"
        numeric
        style={accent ? { color: `var(--ui-${accent})` } : mutedStyle}
      >
        {note}
      </Typography>
    </div>
  </article>
);

// One bookmark row, in the mockup's composition: the favicon roundel, then
// the title over the URL in the mono type. The whole row is the control
// that opens the bookmark — the title carries the affordance, the URL line
// is a hint — so only the title takes the primary color, as the modal's
// item rows did.
const BookmarkRow = ({ bookmark, onOpen, remoteFavicons }) => {
  const favSrc = faviconSrc(bookmark.url, {
    storedIcon: bookmark.faviconUrl,
    allowRemote: remoteFavicons,
  });
  return (
    <button
      type="button"
      onClick={() => onOpen(bookmark)}
      title={bookmark.url}
      className="ui-digest-row"
    >
      <span className="ui-digest-roundel" aria-hidden="true">
        <img
          src={favSrc}
          alt=""
          width={20}
          height={20}
          // A broken icon falls back to the inline placeholder, not to
          // another remote request (#39).
          onError={(event) => {
            event.currentTarget.src = FAVICON_PLACEHOLDER;
          }}
        />
      </span>
      <span className="min-w-0 flex-1">
        <Typography
          variant="label-lg"
          as="span"
          dir="auto"
          className="block truncate ui-digest-row-title"
        >
          {bookmark.title || bookmark.url}
        </Typography>
        <Typography
          variant="mono-sm"
          as="span"
          dir="ltr"
          className="block truncate"
          style={mutedStyle}
        >
          {bookmark.url}
        </Typography>
      </span>
    </button>
  );
};

// One topic cluster: the mockup's headline over its count, the model's
// summary when there is one, and the cluster's rows.
const Cluster = ({ theme, added, onOpen, remoteFavicons }) => {
  const t = useMessages();
  const headingId = useId();
  const items = themeItems(theme, added);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Typography variant="headline-sm" as="h3" id={headingId}>
          {theme.title}
        </Typography>
        <Typography variant="label-sm" as="span" numeric style={mutedStyle}>
          {t("digest.bookmarkCount", { count: items.length })}
        </Typography>
      </div>
      {theme.summary && (
        <Typography variant="body-sm" style={mutedStyle}>
          {theme.summary}
        </Typography>
      )}
      <ul className="grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
        {items.map((bookmark) => (
          <li key={bookmark.id}>
            <BookmarkRow bookmark={bookmark} onOpen={onOpen} remoteFavicons={remoteFavicons} />
          </li>
        ))}
      </ul>
    </section>
  );
};

const WeeklyDigestView = ({
  digest,
  onOpen,
  onShowNeverOpened,
  onTriage,
  onEdit,
  onClose,
  remoteFavicons = false,
}) => {
  const t = useMessages();
  const { added = [], neverOpened = [], untagged = [], themes = [] } = digest || {};
  // The sets are capped for reading (MAX_ITEMS); the strip reports the week,
  // so it wants the uncapped sizes the digest carries alongside.
  const totals = digest?.totals ?? {
    added: added.length,
    neverOpened: neverOpened.length,
    untagged: untagged.length,
  };

  // #302: below `lg` the digest is the mobile mockup's full-page sheet — same
  // data, same actions, different chrome. The trap arms only for the sheet;
  // the view is no dialog and arms nothing.
  const isDialogViewport = useSidebarViewport();
  const sheetRef = useRef(null);
  useFocusTrap(sheetRef, !isDialogViewport);
  const sheetTitleId = useId();
  const queue = useMemo(() => triageQueue({ untagged, neverOpened }), [untagged, neverOpened]);
  const range = useMemo(() => weekRange(Date.now()), []);
  const headingRef = useRef(null);

  // Opening the view announces where the reader landed: the sidebar row's
  // activation moves focus to the view's title, the way the sheet's trap
  // lands on its app bar.
  useEffect(() => {
    if (isDialogViewport) headingRef.current?.focus();
  }, [isDialogViewport]);

  // The mockup's Auto-Tag strip: the digest's triage handoff — the untagged
  // set to the organizer — wearing the AI-assist accent, as on the modal.
  const autoTagButton = untagged.length > 0 && (
    <Button
      type="button"
      intent="tertiary"
      leadingIcon={<SparkIcon />}
      aria-label={t("digest.autoTagAria")}
      onClick={() => onTriage(untagged)}
    >
      {t("digest.autoTag")}
    </Button>
  );

  if (!isDialogViewport) {
    return (
      <DigestSheet
        sheetRef={sheetRef}
        sheetTitleId={sheetTitleId}
        count={totals.added}
        untaggedCount={totals.untagged}
        neverOpenedCount={totals.neverOpened}
        queue={queue}
        range={range}
        autoTagButton={autoTagButton}
        onOpen={onOpen}
        onEdit={onEdit}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="ui-digest-view min-h-0 w-full flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Typography variant="headline-lg" as="h2" ref={headingRef} tabIndex={-1}>
              {t("digest.title")}
            </Typography>
            <Typography variant="body-sm" className="mt-0.5" style={mutedStyle}>
              {t("digest.rangeSubtitle", { range })}
            </Typography>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {neverOpened.length > 0 && (
              <Button type="button" intent="secondary" onClick={onShowNeverOpened}>
                {t("digest.showNeverOpened")}
              </Button>
            )}
            {untagged.length > 0 && (
              <Button
                type="button"
                intent="tertiary"
                leadingIcon={<SparkIcon />}
                onClick={() => onTriage(untagged)}
              >
                {t("digest.triage")}
              </Button>
            )}
          </div>
        </header>

        <section
          aria-label={t("digest.summaryAria")}
          className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3"
        >
          <MetricCard
            label={t("digest.arrivedThisWeek")}
            value={totals.added}
            note={t("digest.topicGroups", { count: themes.length })}
            accent="primary"
          />
          <MetricCard
            label={t("digest.settledNeverOpened")}
            value={totals.neverOpened}
            note={t("digest.olderThanSevenDays")}
          />
          <MetricCard
            label={t("digest.needsTags")}
            value={totals.untagged}
            note={t("digest.readyForTriage")}
            accent="tertiary"
          />
        </section>

        {themes.length > 0 ? (
          // Each cluster names itself (aria-labelledby on the section), so
          // the wrapper carries no label of its own.
          <div className="flex flex-col gap-6">
            {themes.map((theme) => (
              <Cluster
                key={theme.title}
                theme={theme}
                added={added}
                onOpen={onOpen}
                remoteFavicons={remoteFavicons}
              />
            ))}
          </div>
        ) : (
          added.length === 0 && (
            <Typography variant="body-sm" style={mutedStyle}>
              {t("digest.nothingAdded")}
            </Typography>
          )
        )}
      </div>
    </div>
  );
};

export default React.memo(WeeklyDigestView);
