// #295: Link Health & Archive Recovery — the broken-links mockup's workspace
// view (design/mockups/bookmarkit_broken_links/code.html 283–354), living
// beside the navigation sidebar the way the weekly digest does. From `lg` the
// sidebar's Broken Links row opens this view instead of narrowing the list:
// link health is a page of its own — the sweep's summary, the re-check it
// offers, and the archive's recovery proposals reviewed in place — not a
// filter over the shelf. Below `lg` the same view presents as the mobile
// mockup's full-page sheet (#303, LinkHealthSheet): same data, same actions,
// different chrome.
//
// The review contract is ChangeReviewModal's (#102), carried into the view:
// every snapshot proposal starts accepted, any row can be dropped on its own,
// and nothing is written until Apply Selected — which lands on the same
// bulk-edit write path as the dialog, so re-pointing a set is one undo. The
// lookup itself stays an asked-for step (#102's privacy stance): the view
// offers "Find Archive Snapshots" and contacts the archive only then, once
// per run, about the dead links only — or, per row (#303), when Wayback is
// pressed on the one card being read.
//
// It renders what it is given and decides nothing: which links are broken is
// `utils/linkHealth.js`, whether an archived copy exists is
// `utils/archiveRecovery.js`, and what a failure is called is the check's
// stored reason (see LinkHealthRows).

import React, { useEffect, useMemo, useRef, useState } from "react";

import { useSidebarViewport } from "../hooks/useSidebarViewport.js";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import { Button, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import { lastScanLabel } from "../utils/linkHealth.js";
import { Banner, ProgressLines, ProposalRow, RowActions } from "./LinkHealthRows.jsx";
import LinkHealthSheet from "./LinkHealthSheet.jsx";
import { RefreshIcon } from "./icons.jsx";

const mutedStyle = { color: "var(--ui-on-surface-variant)" };

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

// The workspace composition: the title over the summary and freshness, the
// header's actions, and the shared content below. It exists only from `lg`,
// so landing focus on the title is simply its own mount effect.
const LinkHealthWorkspace = ({
  checkedTotal,
  unreachableCount,
  freshness,
  proposalCount,
  accepted,
  sweepRunning,
  archiveRunning,
  needsLookup,
  applying,
  content,
  onRecheck,
  onStopSweep,
  onFindSnapshots,
  onStopArchive,
  onApply,
}) => {
  const t = useMessages();
  const headingRef = useRef(null);

  // Opening the view announces where the reader landed: the sidebar row's
  // activation moves focus to the view's title, the way the digest's does.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

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
              {freshness && (
                <>
                  {" · "}
                  <span>{freshness}</span>
                </>
              )}
              {" · "}
              <span>{t("linkHealth.proposalNote")}</span>
            </Typography>
          </div>
          <HeaderActions
            sweepRunning={sweepRunning}
            archiveRunning={archiveRunning}
            needsLookup={needsLookup}
            applying={applying}
            proposalCount={proposalCount}
            accepted={accepted}
            onRecheck={onRecheck}
            onStopSweep={onStopSweep}
            onFindSnapshots={onFindSnapshots}
            onStopArchive={onStopArchive}
            onApply={onApply}
          />
        </header>
        {content}
      </div>
    </div>
  );
};

const LinkHealthView = ({
  checkedTotal,
  unreachableCount,
  broken = [],
  proposalUrls = {},
  // Whether a lookup is still owed, decided by the app: it knows which links
  // this session has already asked the archive about, misses included — a
  // dead link without a snapshot is not by itself a link worth re-asking.
  needsLookup = false,
  sweepRunning = false,
  sweepChecked = 0,
  sweepTotal = 0,
  archiveRunning = false,
  archiveDone = 0,
  archiveTotal = 0,
  applying = false,
  // #303: when the sweep last ran, for the freshness line.
  lastSweepAt = null,
  onRecheck,
  onStopSweep,
  onFindSnapshots,
  onStopArchive,
  onApply,
  // #303: the per-card actions — the ordinary edit form for the one link,
  // and a single-row ask of the archive.
  onEdit,
  onWayback,
  // Below `lg` the sheet is the composition, and the back bar needs its way
  // out. Unused in the workspace composition.
  onClose,
}) => {
  const t = useMessages();
  // The dialog's stance: everything starts accepted, and unticking is the
  // disagreement. Applied rows leave `broken` (the store's verdict is cleared),
  // so a stale rejection is harmless — it can only resurface as "this snapshot
  // was declined before" if the same link dies again.
  const [rejected, setRejected] = useState(() => new Set());

  // #303: the view is a workspace beside the rail from `lg`, and the mobile
  // mockup's full-page sheet below it — the digest's arrangement. The trap
  // arms only for the sheet; the view is no dialog and arms nothing.
  const isDialogViewport = useSidebarViewport();
  const sheetRef = useRef(null);
  useFocusTrap(sheetRef, !isDialogViewport);

  const snapshots = useMemo(
    () => broken.map((b) => proposalUrls[b.id] ?? null),
    [broken, proposalUrls]
  );
  const proposals = broken.filter((b) => proposalUrls[b.id]);
  const accepted = useMemo(
    () => proposals.filter((b) => !rejected.has(b.id)),
    [proposals, rejected]
  );
  const toggle = (id) =>
    setRejected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // One props bag per row, so the workspace view and the sheet render the
  // very same rows.
  const rows = broken.map((bookmark, index) => ({
    key: bookmark.id,
    bookmark,
    snapshot: snapshots[index],
    selected: Boolean(proposalUrls[bookmark.id]) && !rejected.has(bookmark.id),
    disabled: !proposalUrls[bookmark.id] || applying,
    onToggle: () => toggle(bookmark.id),
    actions: (onEdit || onWayback) && (
      <RowActions
        bookmark={bookmark}
        snapshot={snapshots[index]}
        onEdit={onEdit}
        onWayback={onWayback}
        archiveRunning={archiveRunning}
        applying={applying}
      />
    ),
  }));

  // The two readings the summary and the sheet's subtitle share.
  const freshness = lastScanLabel(lastSweepAt, t);

  // The alarm, the in-flight readings and the rows themselves — composed
  // once, shared by both compositions. The sheet is the chrome around them.
  const content = (
    <>
      {broken.length > 0 && <Banner count={broken.length} />}
      <ProgressLines
        sweepRunning={sweepRunning}
        sweepChecked={sweepChecked}
        sweepTotal={sweepTotal}
        archiveRunning={archiveRunning}
        archiveDone={archiveDone}
        archiveTotal={archiveTotal}
      />
      {broken.length === 0 ? (
        <Typography variant="body-sm" style={mutedStyle}>
          {t("linkHealth.noBroken")}
        </Typography>
      ) : (
        <section aria-label={t("linkHealth.rowsLabel")} className="flex flex-col gap-4">
          {rows.map(({ key, ...rowProps }) => (
            <ProposalRow key={key} {...rowProps} />
          ))}
        </section>
      )}
    </>
  );

  // #303: below `lg` the sheet is the whole composition — the bar's back and
  // re-check, this content, and the footer's write.
  if (!isDialogViewport) {
    return (
      <LinkHealthSheet
        sheetRef={sheetRef}
        brokenCount={broken.length}
        freshness={freshness}
        proposalCount={proposals.length}
        acceptedCount={accepted.length}
        sweepRunning={sweepRunning}
        archiveRunning={archiveRunning}
        needsLookup={needsLookup}
        applying={applying}
        onRecheck={onRecheck}
        onStopSweep={onStopSweep}
        onFindSnapshots={onFindSnapshots}
        onStopArchive={onStopArchive}
        onApplyAccepted={() => onApply(accepted.map((b) => b.id))}
        onClose={onClose}
      >
        {content}
      </LinkHealthSheet>
    );
  }

  return (
    <LinkHealthWorkspace
      checkedTotal={checkedTotal}
      unreachableCount={unreachableCount}
      freshness={freshness}
      proposalCount={proposals.length}
      accepted={accepted}
      sweepRunning={sweepRunning}
      archiveRunning={archiveRunning}
      needsLookup={needsLookup}
      applying={applying}
      content={content}
      onRecheck={onRecheck}
      onStopSweep={onStopSweep}
      onFindSnapshots={onFindSnapshots}
      onStopArchive={onStopArchive}
      onApply={onApply}
    />
  );
};

export default React.memo(LinkHealthView);
