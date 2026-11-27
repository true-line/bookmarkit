// #283: The navigation sidebar — the mockup manager's persistent rail
// (design/mockups/bookmarkit_manager/code.html 167–288).
//
// It is navigation, not a second filter bar. A smart view is one manual filter
// flag — or, for the digest, the digest itself — and choosing it here is the
// same write as toggling it in the filter strip. The agent plan is never
// touched, so the filtering order holds (plan first, manual filters second,
// manual sort last) and the two halves still clear independently.
//
// What it holds, top to bottom:
// - the brand, with the help entry point, and Add Bookmark;
// - Smart views with a count on each. `aria-current="page"` marks the view on
//   screen; the rail only displays it — BookmarkApp decides which view that is;
// - the saved views (#49), stacked; and the folder tree (#55), which keeps its
//   own selection, drop and rename behavior and gains a caption, a "Manage
//   folders" switch for its per-row actions and no root row — the All Bookmarks
//   view above is that row here;
// - the maintenance and options footer (#297): Check Links, Remove Duplicates,
//   Import / Export and Options, the mockup's 267–288 rows, wired to the same
//   handlers the header strip uses. The rail owns none of that state — the
//   sweep's running flag and the dedupe's asking flag come down as props, the
//   way digestBusy does, so the actions behave exactly as today.
//
// The rail exists from `lg` up (index.css, `.ui-sidebar`) and BookmarkApp mounts
// it only there. Its copy is the catalogue's `sidebar` surface (#284). Below
// `lg` the same rail is the navigation drawer's content (NavDrawer, #294).

import React, { useMemo, useState } from "react";
import { Button, IconButton, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import { viewCounts } from "../utils/smartViewCounts.js";
import BrandMark from "./effects/BrandMark.jsx";
import FolderTree from "./FolderTree.jsx";
import SmartViewBar from "./SmartViewBar.jsx";
import {
  AddIcon,
  BookmarksIcon,
  CalendarIcon,
  CloseIcon,
  CopiesIcon,
  DockToLeftIcon,
  DockToRightIcon,
  EyeOffIcon,
  HealthIcon,
  HelpIcon,
  LinkOffIcon,
  SettingsIcon,
  SwapIcon,
  TagOffIcon,
} from "./icons.jsx";

/** The views, in the mockup's order. `danger` is the one whose news is bad. */
const SMART_VIEWS = [
  { id: "all", labelKey: "sidebar.allBookmarks", Icon: BookmarksIcon },
  { id: "digest", labelKey: "sidebar.digest", Icon: CalendarIcon },
  { id: "neverOpened", labelKey: "sidebar.neverOpened", Icon: EyeOffIcon },
  { id: "untagged", labelKey: "sidebar.untagged", Icon: TagOffIcon },
  { id: "brokenLinks", labelKey: "sidebar.brokenLinks", Icon: LinkOffIcon, danger: true },
];

/** The catalogue key naming a smart view, for a caller that titles the page
 *  with the view on screen (#294). Null for anything that is not one. */
export const SMART_VIEW_LABEL_KEYS = Object.fromEntries(
  SMART_VIEWS.map((view) => [view.id, view.labelKey])
);

const SidebarNav = React.memo(function SidebarNav({
  effectsEnabled = true,
  onHelp,
  onAddBookmark,
  // #294: given only when the rail is the navigation drawer's content, which
  // adds a close control beside the help entry point.
  onClose,
  // #346: the mini rail. `collapsed` folds the rail to its 64px icon state;
  // the caller passes it to the rail alone, and the guard below keeps that
  // true even if a caller slips — the drawer never folds.
  collapsed = false,
  onToggleCollapse,
  id,
  bookmarks = [],
  currentView = null,
  digestBusy = false,
  onSmartView,
  brokenCount = 0,
  views = [],
  activeSavedViewId = null,
  canSaveView = false,
  onApplyView,
  onSaveView,
  onForgetView,
  activeFolder = "",
  onSelectFolder,
  onMoveBookmarks,
  onMoveFolder,
  onRenameFolder,
  onDeleteFolder,
  // #297: the maintenance footer's handlers and the two busy flags it reads.
  // onCheckLinks is the header strip's own toggle — start when idle, stop when
  // running — so the row flips its label with the sweep instead of promising
  // "check" while the press would stop it.
  onCheckLinks,
  checkLinksRunning = false,
  onRemoveDuplicates,
  duplicatesBusy = false,
  onImportExport,
  onOptions,
  className = "",
}) {
  const t = useMessages();
  const [managing, setManaging] = useState(false);
  const counts = useMemo(() => viewCounts(bookmarks, brokenCount), [bookmarks, brokenCount]);
  const folded = collapsed && !onClose;
  // Folded, the rows' text is gone rather than hidden — the row still needs a
  // name and a hover reading, so the label (with the count, as the mockup
  // titles it) rides both aria-label and title.
  const nameWhenFolded = (label) => (folded ? { "aria-label": label, title: label } : {});
  // The sweep row's reading flips with the sweep, folded or not.
  const checkLabel = checkLinksRunning ? t("sidebar.stopCheck") : t("sidebar.checkLinks");

  return (
    <aside
      id={id}
      className={`ui-sidebar ${className}`}
      aria-label={t("sidebar.navLabel")}
      data-collapsed={folded ? "true" : undefined}
    >
      <div className="ui-sidebar-brand">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandMark enabled={effectsEnabled} size={32} />
          {!folded && (
            <div className="ui-sidebar-title">
              <Typography variant="headline-sm" as="p" className="truncate">
                {t("sidebar.brandTitle")}
              </Typography>
              <Typography variant="label-sm" as="p" className="ui-sidebar-tagline">
                {t("sidebar.brandTagline")}
              </Typography>
            </div>
          )}
        </div>
        {onClose ? (
          // First of the two, so it is the control the drawer's focus trap
          // lands on, as the mockup does.
          <div className="flex items-center gap-2">
            <IconButton label={t("shell.closeNav")} onClick={onClose}>
              <CloseIcon />
            </IconButton>
            <IconButton label={t("sidebar.help")} onClick={onHelp}>
              <HelpIcon />
            </IconButton>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {!folded && (
              <IconButton label={t("sidebar.help")} onClick={onHelp}>
                <HelpIcon />
              </IconButton>
            )}
            {onToggleCollapse && (
              <IconButton
                label={t(folded ? "sidebar.expand" : "sidebar.collapse")}
                aria-expanded={!folded}
                aria-controls={id}
                onClick={onToggleCollapse}
              >
                {folded ? <DockToRightIcon /> : <DockToLeftIcon />}
              </IconButton>
            )}
          </div>
        )}
      </div>

      <Button
        onClick={onAddBookmark}
        leadingIcon={<AddIcon />}
        className="ui-sidebar-primary"
        title={t("sidebar.addBookmark")}
        aria-label={folded ? t("sidebar.addBookmark") : undefined}
      >
        {folded ? null : t("sidebar.addBookmark")}
      </Button>

      <nav className="ui-sidebar-nav" aria-label={t("sidebar.viewsLabel")}>
        {!folded && <p className="ui-sidebar-caption">{t("sidebar.views")}</p>}
        {SMART_VIEWS.map((view) => {
          const current = currentView === view.id;
          const rowName = `${t(view.labelKey)} (${t.count(counts[view.id])})`;
          return (
            <button
              key={view.id}
              type="button"
              className={`ui-sidebar-row ${view.danger ? "ui-sidebar-row--danger" : ""}`}
              aria-current={current ? "page" : undefined}
              aria-busy={view.id === "digest" && digestBusy ? true : undefined}
              {...nameWhenFolded(rowName)}
              onClick={() => onSmartView(view.id)}
            >
              <span className="ui-sidebar-row-icon">
                <view.Icon size={18} />
              </span>
              {!folded && (
                <>
                  <span className="ui-sidebar-row-label">{t(view.labelKey)}</span>
                  <span className="ui-sidebar-row-count">{t.count(counts[view.id])}</span>
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* #346: folded, the saved views fold away with the captions — a form
          and a chip list have no 64px reading. */}
      {!folded && (
        <SmartViewBar
          layout="stack"
          views={views}
          activeViewId={activeSavedViewId}
          canSave={canSaveView}
          onApply={onApplyView}
          onSave={onSaveView}
          onForget={onForgetView}
        />
      )}

      <FolderTree
        bookmarks={bookmarks}
        activeFolder={activeFolder}
        onSelect={onSelectFolder}
        onMoveBookmarks={onMoveBookmarks}
        onMoveFolder={onMoveFolder}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={onDeleteFolder}
        className="ui-sidebar-folders"
        showRoot={false}
        alwaysShowUnfiled
        manageable={managing && !folded}
        iconOnly={folded}
        header={
          folded ? null : (
            <div className="ui-sidebar-caption">
              <span>{t("sidebar.folders")}</span>
              <button
                type="button"
                className="ui-sidebar-manage"
                aria-pressed={managing}
                aria-label={t("sidebar.manageFolders")}
                onClick={() => setManaging((current) => !current)}
              >
                {t("sidebar.edit")}
              </button>
            </div>
          )
        }
      />

      {/* #297: the mockup's maintenance & options footer — the rail's last
          block, parted from the tree by a hairline (index.css). The rows reuse
          the smart-view recipe; Remove Duplicates holds while the semantic
          pass asks the provider, exactly as the header's button does. */}
      <div className="ui-sidebar-footer">
        <button
          type="button"
          className="ui-sidebar-row"
          {...nameWhenFolded(checkLabel)}
          onClick={onCheckLinks}
        >
          <span className="ui-sidebar-row-icon">
            <HealthIcon size={18} />
          </span>
          {!folded && <span className="ui-sidebar-row-label">{checkLabel}</span>}
        </button>
        <button
          type="button"
          className="ui-sidebar-row"
          disabled={duplicatesBusy}
          aria-busy={duplicatesBusy || undefined}
          {...nameWhenFolded(t("sidebar.removeDuplicates"))}
          onClick={onRemoveDuplicates}
        >
          <span className="ui-sidebar-row-icon">
            <CopiesIcon size={18} />
          </span>
          {!folded && <span className="ui-sidebar-row-label">{t("sidebar.removeDuplicates")}</span>}
        </button>
        <button
          type="button"
          className="ui-sidebar-row"
          {...nameWhenFolded(t("sidebar.importExport"))}
          onClick={onImportExport}
        >
          <span className="ui-sidebar-row-icon">
            <SwapIcon size={18} />
          </span>
          {!folded && <span className="ui-sidebar-row-label">{t("sidebar.importExport")}</span>}
        </button>
        <button
          type="button"
          className="ui-sidebar-row ui-sidebar-row--options"
          {...nameWhenFolded(t("sidebar.options"))}
          onClick={onOptions}
        >
          <span className="ui-sidebar-row-icon">
            <SettingsIcon size={18} />
          </span>
          {!folded && <span className="ui-sidebar-row-label">{t("sidebar.options")}</span>}
        </button>
      </div>
    </aside>
  );
});

export default SidebarNav;
