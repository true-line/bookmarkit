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
//   view above is that row here.
//
// The rail exists from `lg` up (index.css, `.ui-sidebar`) and BookmarkApp mounts
// it only there. Its copy is the catalogue's `sidebar` surface (#284).

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
  EyeOffIcon,
  HelpIcon,
  LinkOffIcon,
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

const SidebarNav = React.memo(function SidebarNav({
  effectsEnabled = true,
  onHelp,
  onAddBookmark,
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
  className = "",
}) {
  const t = useMessages();
  const [managing, setManaging] = useState(false);
  const counts = useMemo(() => viewCounts(bookmarks, brokenCount), [bookmarks, brokenCount]);

  return (
    <aside className={`ui-sidebar ${className}`} aria-label={t("sidebar.navLabel")}>
      <div className="ui-sidebar-brand">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandMark enabled={effectsEnabled} size={32} />
          <div className="ui-sidebar-title">
            <Typography variant="headline-sm" as="p" className="truncate">
              {t("sidebar.brandTitle")}
            </Typography>
            <Typography variant="label-sm" as="p" className="ui-sidebar-tagline">
              {t("sidebar.brandTagline")}
            </Typography>
          </div>
        </div>
        <IconButton label={t("sidebar.help")} onClick={onHelp}>
          <HelpIcon />
        </IconButton>
      </div>

      <Button onClick={onAddBookmark} leadingIcon={<AddIcon />} className="ui-sidebar-primary">
        {t("sidebar.addBookmark")}
      </Button>

      <nav className="ui-sidebar-nav" aria-label={t("sidebar.viewsLabel")}>
        <p className="ui-sidebar-caption">{t("sidebar.views")}</p>
        {SMART_VIEWS.map((view) => {
          const current = currentView === view.id;
          return (
            <button
              key={view.id}
              type="button"
              className={`ui-sidebar-row ${view.danger ? "ui-sidebar-row--danger" : ""}`}
              aria-current={current ? "page" : undefined}
              aria-busy={view.id === "digest" && digestBusy ? true : undefined}
              onClick={() => onSmartView(view.id)}
            >
              <span className="ui-sidebar-row-icon">
                <view.Icon size={18} />
              </span>
              <span className="ui-sidebar-row-label">{t(view.labelKey)}</span>
              <span className="ui-sidebar-row-count">{t.count(counts[view.id])}</span>
            </button>
          );
        })}
      </nav>

      <SmartViewBar
        layout="stack"
        views={views}
        activeViewId={activeSavedViewId}
        canSave={canSaveView}
        onApply={onApplyView}
        onSave={onSaveView}
        onForgetView={onForgetView}
      />

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
        manageable={managing}
        header={
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
        }
      />
    </aside>
  );
});

export default SidebarNav;
