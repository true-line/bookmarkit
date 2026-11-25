// #295: Link Health & Archive Recovery — the broken-links mockup's workspace
// view (design/mockups/bookmarkit_broken_links/code.html 283–354), living
// beside the navigation sidebar the way the weekly digest does. From `lg` the
// sidebar's Broken Links row opens this view instead of narrowing the list:
// link health is a page of its own — the sweep's summary, the re-check it
// offers, and the archive's recovery proposals reviewed in place — not a
// filter over the shelf. Below `lg` the list, its sweep bar and the review
// dialog stay as they are today; their dedicated mobile composition is #303.
//
// The review contract is ChangeReviewModal's (#102), carried into the view:
// every snapshot proposal starts accepted, any row can be dropped on its own,
// and nothing is written until Apply Selected — which lands on the same
// bulk-edit write path as the dialog, so re-pointing a set is one undo. The
// lookup itself stays an asked-for step (#102's privacy stance): the view
// offers "Find Archive Snapshots" and contacts the archive only then, once
// per run, about the dead links only.
//
// It renders what it is given and decides nothing: which links are broken is
// `utils/linkHealth.js`, whether an archived copy exists is
// `utils/archiveRecovery.js`, and what a failure is called (HTTP 404, DNS
// Unreachable, Timeout) is the check's stored reason, shared with the review
// dialog's diff through `statusReasonLabel`. The chip is text and icon — the
// color is the third channel, never the only one.

import React, { useEffect, useMemo, useRef, useState } from "react";

import { Button, Tag, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import { statusReasonLabel } from "../utils/linkHealth.js";
import { DnsIcon, LinkOffIcon, RefreshIcon, TimerIcon } from "./icons.jsx";

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
// with the "no copy" reading and a checkbox there is nothing to apply.
const ProposalRow = ({ bookmark, snapshot, selected, disabled, onToggle }) => {
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
    </article>
  );
};

// The mockup's header actions: Re-check Links — the sweep's stop while it
// runs — then Find Archive Snapshots while a lookup is still owed, then
// Apply Selected once there are proposals to review. The lookup's stop is
// the same kind of swap, so a running ask never leaves its button promising
// to start one.
const HeaderActions = ({
  sweepRunning,
  archiveRunning,
  needsLookup,
  applying,
  proposalCount,
  accepted = [],
  onRecheck,
  onStopSweep,
  onFindSnapshots,
  onStopArchive,
  onApply,
}) => {
  const t = useMessages();
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {sweepRunning ? (
        <Button type="button" intent="secondary" onClick={onStopSweep}>
          {t("common.stop")}
        </Button>
      ) : (
        <Button type="button" intent="secondary" leadingIcon={<RefreshIcon />} onClick={onRecheck}>
          {t("linkHealth.recheck")}
        </Button>
      )}
      {archiveRunning ? (
        <Button type="button" intent="secondary" onClick={onStopArchive}>
          {t("common.stop")}
        </Button>
      ) : (
        needsLookup && (
          <Button type="button" intent="secondary" onClick={onFindSnapshots}>
            {t("linkHealth.findSnapshots")}
          </Button>
        )
      )}
      {proposalCount > 0 && (
        <Button
          type="button"
          intent="primary"
          onClick={() => onApply(accepted.map((b) => b.id))}
          disabled={accepted.length === 0}
          loading={applying}
        >
          {t("linkHealth.applySelected", { count: accepted.length })}
        </Button>
      )}
    </div>
  );
};

const LinkHealthView = ({
  checkedTotal,
  unreachableCount,
  broken = [],
  proposalUrls = {},
  sweepRunning = false,
  sweepChecked = 0,
  sweepTotal = 0,
  archiveRunning = false,
  archiveDone = 0,
  archiveTotal = 0,
  applying = false,
  onRecheck,
  onStopSweep,
  onFindSnapshots,
  onStopArchive,
  onApply,
}) => {
  const t = useMessages();
  const headingRef = useRef(null);
  // The dialog's stance: everything starts accepted, and unticking is the
  // disagreement. Applied rows leave `broken` (the store's verdict is cleared),
  // so a stale rejection is harmless — it can only resurface as "this snapshot
  // was declined before" if the same link dies again.
  const [rejected, setRejected] = useState(() => new Set());

  // Opening the view announces where the reader landed: the sidebar row's
  // activation moves focus to the view's title, the way the digest's does.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const snapshots = useMemo(
    () => broken.map((b) => proposalUrls[b.id] ?? null),
    [broken, proposalUrls]
  );
  const proposals = broken.filter((b) => proposalUrls[b.id]);
  const accepted = useMemo(
    () => proposals.filter((b) => !rejected.has(b.id)),
    [proposals, rejected]
  );
  // A lookup is owed while any dead link has no snapshot to show yet.
  const needsLookup = !archiveRunning && broken.length > proposals.length;
  const toggle = (id) =>
    setRejected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="ui-health-view min-h-0 w-full flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Typography variant="headline-lg" as="h2" ref={headingRef} tabIndex={-1}>
              {t("linkHealth.title")}
            </Typography>
            <Typography
              variant="body-sm"
              className="mt-0.5"
              style={{ ...mutedStyle, unicodeBidi: "plaintext" }}
            >
              <span>
                {t("linkHealth.summary", { checked: checkedTotal, unreachable: unreachableCount })}
              </span>
              {" · "}
              <span>{t("linkHealth.proposalNote")}</span>
            </Typography>
          </div>
          <HeaderActions
            sweepRunning={sweepRunning}
            archiveRunning={archiveRunning}
            needsLookup={needsLookup}
            applying={applying}
            proposalCount={proposals.length}
            accepted={accepted}
            onRecheck={onRecheck}
            onStopSweep={onStopSweep}
            onFindSnapshots={onFindSnapshots}
            onStopArchive={onStopArchive}
            onApply={onApply}
          />
        </header>

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

        {broken.length === 0 ? (
          <Typography variant="body-sm" style={mutedStyle}>
            {t("linkHealth.noBroken")}
          </Typography>
        ) : (
          <section aria-label={t("linkHealth.rowsLabel")} className="flex flex-col gap-4">
            {broken.map((bookmark, index) => (
              <ProposalRow
                key={bookmark.id}
                bookmark={bookmark}
                snapshot={snapshots[index]}
                selected={Boolean(proposalUrls[bookmark.id]) && !rejected.has(bookmark.id)}
                disabled={!proposalUrls[bookmark.id] || applying}
                onToggle={() => toggle(bookmark.id)}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default React.memo(LinkHealthView);
