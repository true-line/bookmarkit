// #295/#303: the pieces of the link-health view that render a row's worth of
// the page — the failure chip, the proposal row with its per-card actions,
// the status banner, and the sweep's and lookup's in-flight readings. Both
// compositions (the workspace view from `lg`, LinkHealthSheet below) render
// these, so they live here rather than in either chrome.
//
// None of these decide anything: which links are broken is
// `utils/linkHealth.js`, whether an archived copy exists is
// `utils/archiveRecovery.js`, and what a failure is called (HTTP 404, DNS
// Unreachable, Timeout) is the check's stored reason, shared with the review
// dialog's diff through `statusReasonLabel`. The chip is text and icon — the
// color is the third channel, never the only one.

import React from "react";

import { Button, Tag, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import { statusReasonLabel } from "../utils/linkHealth.js";
import { ArchiveIcon, DnsIcon, EditNoteIcon, LinkOffIcon, TimerIcon } from "./icons.jsx";

const mutedStyle = { color: "var(--ui-on-surface-variant)" };

// The status chip's glyph, per the mockup's picks: the parted link for an
// HTTP status (and for the unexplained failure an older sweep left), the
// stacked hosts for the network's refusal, the timer for the probe that gave
// up. Text always rides beside it — status is never color alone.
const reasonIcon = (reason) =>
  reason === "timeout" ? TimerIcon : reason === "unreachable" ? DnsIcon : LinkOffIcon;

const ReasonChip = ({ reason }) => {
  const t = useMessages();
  const Icon = reasonIcon(reason);
  return (
    <Tag className="ui-health-chip">
      <Icon size={14} />
      {statusReasonLabel(reason, t)}
    </Tag>
  );
};

// One proposal row, in the mockup's composition: the checkbox over the title,
// the status chip on the row's end, and the two boxes — the dead address in
// the mono type with the strike the mockup gives it, and the snapshot beside
// it. A link the archive could not help keeps the row (the summary counts it)
// with the "no copy" reading and a checkbox there is nothing to apply. The
// card's own actions (#303) — Edit URL, and Wayback until a snapshot is
// staged — ride under the boxes, shared by both compositions.
export const ProposalRow = ({ bookmark, snapshot, selected, disabled, onToggle, actions }) => {
  const t = useMessages();
  return (
    <article className="ui-health-row" aria-label={bookmark.title || bookmark.url}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-w-0 cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            style={{ accentColor: "var(--ui-primary)" }}
            checked={selected}
            onChange={onToggle}
            disabled={disabled}
          />
          <Typography variant="label-lg" as="span" dir="auto" className="truncate">
            {bookmark.title || bookmark.url}
          </Typography>
        </label>
        <ReasonChip reason={bookmark.urlStatusReason} />
      </div>
      <div className="ui-health-grid">
        <div className="ui-health-box">
          <Typography variant="label-sm" as="span" className="block" style={mutedStyle}>
            {t("linkHealth.originalLabel")}
          </Typography>
          <Typography
            variant="mono-sm"
            as="p"
            dir="ltr"
            className="ui-health-url ui-health-url--dead"
          >
            {bookmark.url}
          </Typography>
        </div>
        {snapshot ? (
          <div className="ui-health-box ui-health-box--proposal">
            <Typography variant="label-sm" as="span" className="ui-health-box-label block">
              {t("linkHealth.snapshotLabel")}
            </Typography>
            <Typography variant="mono-sm" as="p" dir="ltr" className="ui-health-url">
              {snapshot}
            </Typography>
          </div>
        ) : (
          <div className="ui-health-box">
            <Typography variant="label-sm" as="span" className="block" style={mutedStyle}>
              {t("linkHealth.snapshotLabel")}
            </Typography>
            <Typography variant="body-sm" as="p" style={mutedStyle}>
              {t("linkHealth.noSnapshot")}
            </Typography>
          </div>
        )}
      </div>
      {actions && (
        <div className="ui-health-actions" role="group" aria-label={t("linkHealth.actionsLabel")}>
          {actions}
        </div>
      )}
    </article>
  );
};

// The mobile mockup's status banner (186–193): the alarm in words on the
// error-container tone, the count on the row's end. The sentence carries the
// count already — the trailing figure is the at-a-glance reading, the way the
// mockup draws it.
export const Banner = ({ count }) => {
  const t = useMessages();
  return (
    <section className="ui-health-banner">
      <LinkOffIcon size={18} />
      <Typography variant="body-sm" as="p" className="min-w-0 flex-1">
        {t("linkHealth.banner", { count })}
      </Typography>
      <Typography variant="label-md" as="span" numeric className="ui-numeric">
        {t.count(count)}
      </Typography>
    </section>
  );
};

// #303: the freshness line's words come from utils/linkHealth.js.

// The sweep's and the lookup's in-flight readings, in both compositions' flow.
export const ProgressLines = ({
  sweepRunning,
  sweepChecked,
  sweepTotal,
  archiveRunning,
  archiveDone,
  archiveTotal,
}) => {
  const t = useMessages();
  return (
    <>
      {sweepRunning && (
        <div className="ui-sweep-bar" role="status" aria-live="polite">
          <span className="ui-sweep-status">{t("linkSweep.checking")} </span>
          <Tag className="ui-numeric">
            {t("linkSweep.progress", { checked: sweepChecked, total: sweepTotal })}
          </Tag>
          <div className="ui-sweep-track">
            <div
              className="ui-sweep-fill"
              style={{
                width: `${sweepTotal ? Math.round((sweepChecked / sweepTotal) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      )}
      {archiveRunning && (
        <Typography variant="body-sm" role="status" aria-live="polite" style={mutedStyle}>
          {t("linkHealth.findingSnapshots", { done: archiveDone, total: archiveTotal })}
        </Typography>
      )}
    </>
  );
};

// #303: the per-card action pair, in the mobile mockup's composition —
// Edit URL always; Wayback until the row has its snapshot staged, and never
// while a lookup is already running or a write is in flight.
export const RowActions = ({ bookmark, snapshot, onEdit, onWayback, archiveRunning, applying }) => {
  const t = useMessages();
  const title = bookmark.title || bookmark.url;
  return (
    <>
      {onEdit && (
        <Button
          type="button"
          intent="secondary"
          leadingIcon={<EditNoteIcon size={14} />}
          aria-label={t("linkHealth.editUrlAria", { title })}
          onClick={() => onEdit(bookmark)}
        >
          {t("linkHealth.editUrl")}
        </Button>
      )}
      {onWayback && !snapshot && (
        <Button
          type="button"
          intent="secondary"
          leadingIcon={<ArchiveIcon size={14} />}
          aria-label={t("linkHealth.waybackAria", { title })}
          disabled={archiveRunning || applying}
          onClick={() => onWayback(bookmark)}
        >
          {t("linkHealth.wayback")}
        </Button>
      )}
    </>
  );
};
