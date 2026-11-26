// #303: the mobile link-health sheet (design/mockups
// /bookmarkit_mobile_broken_links/code.html 167–256) — what the link-health
// view becomes below `lg`, where the broken-links page leaves the workspace
// column for the mockup's full-page sheet: a sticky app bar (back, "Broken
// Links" over the flagged count and the scan's freshness, Re-check), the
// status banner, and the same proposal rows the workspace view reviews —
// Edit URL and Wayback on every card, Apply Selected in the footer. A
// presentational twin like DigestSheet (#302): everything the sheet shows is
// the view's own content passed as children, and every action is the app's
// write path. Still a dialog to the keyboard, and part of whatever the page
// is doing: a click inside must never dismiss a selection behind it.

import React, { useId } from "react";

import { keepsSelectionProps } from "../hooks/useBookmarkSelection.js";
import { Button } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import { RefreshIcon } from "./icons.jsx";

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

const LinkHealthSheet = ({
  sheetRef,
  brokenCount,
  freshness,
  proposalCount,
  acceptedCount,
  sweepRunning,
  archiveRunning,
  needsLookup,
  applying,
  onRecheck,
  onStopSweep,
  onFindSnapshots,
  onStopArchive,
  onApplyAccepted,
  onClose,
  children,
}) => {
  const t = useMessages();
  const sheetTitleId = useId();

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={sheetTitleId}
      tabIndex={-1}
      className="ui-sheet ui-sheet--health"
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
          aria-label={t("linkHealth.backAria")}
          onClick={onClose}
        >
          <BackIcon />
        </button>
        <div className="ui-sheet-heading">
          <h2 id={sheetTitleId}>{t("linkHealth.sheetTitle")}</h2>
          {/* The mockup's second line: "7 flagged · Last scan 2h ago". Both
              halves are digit-led, so the line rides plaintext in RTL. */}
          <p className="ui-sheet-subtitle ui-numeric" style={{ unicodeBidi: "plaintext" }}>
            {brokenCount > 0 && t("linkHealth.scannedFlagged", { count: brokenCount })}
            {brokenCount > 0 && freshness && " · "}
            {freshness}
          </p>
        </div>
        {sweepRunning ? (
          <Button type="button" intent="secondary" onClick={onStopSweep}>
            {t("common.stop")}
          </Button>
        ) : (
          <Button
            type="button"
            intent="primary"
            leadingIcon={<RefreshIcon size={14} />}
            onClick={onRecheck}
          >
            {t("linkHealth.recheck")}
          </Button>
        )}
      </header>
      <main className="ui-sheet-body">{children}</main>
      {(needsLookup || proposalCount > 0) && (
        <footer className="ui-sheet-footer">
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
              onClick={onApplyAccepted}
              disabled={acceptedCount === 0}
              loading={applying}
            >
              {t("linkHealth.applySelected", { count: acceptedCount })}
            </Button>
          )}
        </footer>
      )}
    </div>
  );
};

export default LinkHealthSheet;
