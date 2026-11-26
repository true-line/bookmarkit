// ARCH-06: Slimmed BookmarkApp — orchestration only. Logic delegated to hooks/utils.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyAgentPlan, sortStepsByPriority, widenPlanSearch } from "../utils/bookmarkFilters.js";
import {
  EMPTY_FILTERS,
  applyManualFilters,
  cycleTag,
  deriveTagCounts,
  hasActiveFilters,
  smartViewFilters,
} from "../utils/manualFilters.js";
import { filterDuplicateImports, findDuplicateIds } from "../utils/duplicates.js";
import {
  dissolveFolderPatches,
  followFolderMove,
  folderPaths,
  moveToFolderPatches,
  parentFolder,
  renameFolderPatches,
} from "../utils/folderTree.js";
import { recoverable } from "../utils/archiveRecovery.js";
import { isSearchEnabled } from "../llm/index.js";
import { isBroken } from "../utils/linkHealth.js";
import { fetchUrlStatus } from "../utils/urlStatus.js";
import { acceptedPatches } from "../utils/changeReview.js";
import { openedPatch } from "../utils/openHistory.js";
import { currentSmartView, isViewWorthSaving, matchingViewId } from "../utils/smartViews.js";
import { useSemanticDedupe } from "../hooks/useSemanticDedupe.js";
import { isSafeHttpUrl } from "../utils/url.js";
import { parseNetscapeHtml } from "../utils/netscapeBookmarks.js";
import { remoteFaviconsEnabled, setRemoteFaviconsEnabled } from "../utils/favicon.js";
import { effectsEnabled, setEffectsEnabled } from "../utils/effects.js";
import { listViewMode, setListViewMode } from "../utils/listView.js";
import { readImportedBookmarks } from "../utils/importedBookmarks.js";
import { useAgentEngine } from "../hooks/useAgentEngine.js";
import { useBookmarkSelection, keepsSelectionProps } from "../hooks/useBookmarkSelection.js";
import { useBookmarkStore } from "../hooks/useBookmarkStore.js";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts.js";
import { useLinkSweep } from "../hooks/useLinkSweep.js";
import { useOrganizer } from "../hooks/useOrganizer.js";
import { useArchiveRecovery } from "../hooks/useArchiveRecovery.js";
import { useDigest } from "../hooks/useDigest.js";
import { useSemanticSearch } from "../hooks/useSemanticSearch.js";
import { useLLMSettings } from "../hooks/useLLMSettings.js";
import { useWebMcpTools } from "../hooks/useWebMcpTools.js";
import { useTheme } from "../hooks/useTheme.js";
import { useDebounce } from "../hooks/useDebounce.js";
import { useSmartViews } from "../hooks/useSmartViews.js";
import { useUndoHistory } from "../hooks/useUndoHistory.js";
import MobileTopBar from "./MobileTopBar.jsx";
import MobileFilterRow from "./MobileFilterRow.jsx";
import NavDrawer from "./NavDrawer.jsx";
import { useSidebarViewport } from "../hooks/useSidebarViewport.js";

import { useMessages } from "../i18n/index.js";

import ErrorBoundary from "./ErrorBoundary.jsx";
import HelpModal from "./HelpModal";
import MessageModal from "./MessageModal";
import BookmarkForm from "./BookmarkForm";
import ImportExportContent from "./ImportExportContent";
import DeleteConfirmModal from "./DeleteConfirmModal";
import OptionsModal from "./OptionsModal";
import BookmarkList from "./BookmarkList.jsx";
import ViewSelector from "./ViewSelector.jsx";
import BulkEditBar from "./BulkEditBar.jsx";
import SelectionBar from "./SelectionBar.jsx";
import WeeklyDigestView from "./WeeklyDigestView.jsx";
import LinkHealthView from "./LinkHealthView.jsx";
import { DRAG_BOOKMARKS } from "./FolderTree.jsx";
import LinkSweepBar from "./LinkSweepBar.jsx";
import ChangeReviewModal from "./ChangeReviewModal.jsx";
import SidebarNav, { SMART_VIEW_LABEL_KEYS } from "./SidebarNav.jsx";
import AgentPlan from "./AgentPlan.jsx";
import Kbd from "./Kbd.jsx";
import Toast from "./Toast.jsx";
// #250: the header/toolbar chrome speaks the unified design system — buttons,
// icon buttons and the search input-field-icon (leading search icon, trailing
// provider-ready badge). AgentPlan/Kbd/Toast are standalone app components,
// re-homed verbatim when the legacy library retired (#255). Row/state
// compositions live in index.css.
import { Button, IconButton, InputField } from "../design-system/index.js";
import {
  AddIcon,
  CopiesIcon,
  HealthIcon,
  SearchIcon,
  SettingsIcon,
  SparkIcon,
  SwapIcon,
} from "./icons.jsx";

// Plan steps that write a new order to the store, rather than sorting the view.
const REORDER_ACTIONS = ["reorder", "reorderAscending", "reorderDescending", "persistSortedOrder"];

// The import result as complete message templates; `t` comes from the component
// (the translator is plain function, so helpers outside the tree can use it).
const getImportResultMessage = (t, importedCount, skippedCount, emptyMessage) => {
  if (importedCount > 0) {
    const skipped = skippedCount > 0 ? ` ${t("app.importSkipped", { count: skippedCount })}` : "";
    return {
      message: `${t("app.importedCount", { count: importedCount })}${skipped}`,
      type: "success",
    };
  }

  if (skippedCount > 0) {
    return {
      message: `${t("app.importNone")} ${t("app.importSkipped", { count: skippedCount })}`,
      type: "info",
    };
  }

  return { message: emptyMessage, type: "info" };
};

// ─── Component ────────────────────────────────────────────────────────────────

const BookmarkApp = () => {
  // ─── Messages ───────────────────────────────────────────────────────────────
  const t = useMessages();

  // ─── Theme ──────────────────────────────────────────────────────────────────
  const { currentTheme, themes, selectTheme, uploadTheme } = useTheme();

  // ─── Store ──────────────────────────────────────────────────────────────────
  // #56: every write records its own inverse, so undo covers whatever the store
  // is asked to do rather than the two operations that remembered to snapshot.
  const undo = useUndoHistory(showCustomMessage);
  const {
    bookmarks,
    isLoading,
    loadError,
    importProgress,
    storeRef,
    init,
    saveBookmark,
    deleteBookmarks,
    saveAllBookmarks,
    appendBookmarks,
    persistSortedOrder,
    applyBulkEdit,
  } = useBookmarkStore(undo.record);

  // Init store on mount
  useEffect(() => init(showCustomMessage), []); // eslint-disable-line react-hooks/exhaustive-deps

  // The header is fixed so it can slide out of view, but its height is its
  // content's: a fixed 9rem cropped the search bar at desktop widths and
  // overlapped it at narrow ones. The measured height drives the main area's
  // padding through --app-header-height, which is the only other consumer.
  // The header is not rendered while loading, so this re-runs once it is.
  const headerRef = useRef(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;
    const syncHeight = () =>
      document.documentElement.style.setProperty("--app-header-height", `${header.offsetHeight}px`);
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [isLoading]);

  // ─── LLM provider settings (#9/#29/#36 live in the hook) ────────────────────
  const {
    provider: runtimeProvider,
    setProvider: setRuntimeProvider,
    providerOptions,
    updateProviderOptions,
    encryption,
    enableEncryption,
    disableEncryption,
    unlock,
  } = useLLMSettings(showCustomMessage);

  // ─── WebMCP agent tools (#212) ──────────────────────────────────────────────
  // A read-only projection of this same list, offered to browser agents while
  // this tab is open. Registered only once the store opened cleanly, and only
  // after the user opts in — an agent asking is one thing; who may ask is the
  // user's call.
  const { webMcpEnabled, setWebMcpEnabled, webMcpAvailable } = useWebMcpTools({
    bookmarks,
    isLoading,
    loadError,
  });

  // ─── UI state ───────────────────────────────────────────────────────────────
  // #39: Off by default — fetching favicons from a third party would report the
  // user's hostnames on every render.
  const [remoteFavicons, setRemoteFavicons] = useState(remoteFaviconsEnabled);
  // Decorative 3D effects, on by default and opted out in Options.
  const [effects, setEffects] = useState(effectsEnabled);
  // #198: the list's view mode — single column, flow columns, grid — a
  // display preference persisted like the other display toggles.
  const [viewMode, setViewMode] = useState(listViewMode);
  const [searchQuery, setSearchQuery] = useState("");
  // The agent's accumulated plan. It stays here rather than inside the engine
  // because the view, the manual filters and a persisted reorder all read it.
  const [lastAction, setLastAction] = useState(null);
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  // #86: why a pair was proposed, shown in the confirmation. Empty for the
  // deterministic pass, which needs no explaining.
  const [duplicateReasons, setDuplicateReasons] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false); // UX-09
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  // #283: which chrome is mounted follows the viewport, not a preference. From
  // `lg` the navigation sidebar is a fixed rail. #294: below it the same rail
  // is the navigation drawer, opened from the top bar's menu button, so the
  // folder tree and the saved views have exactly one home at every width.
  const isSidebarViewport = useSidebarViewport();
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  // Crossing into the rail's viewport takes the drawer away, and its state must
  // not outlive it: the page would stay inert with no dialog on screen. The
  // flag is masked for that first render and cleared straight after.
  const navDrawerOpen = isNavDrawerOpen && !isSidebarViewport;
  useEffect(() => {
    if (isSidebarViewport) setIsNavDrawerOpen(false);
  }, [isSidebarViewport]);
  // #299: the shell's select mode — the touch path into the multi-selection.
  // Past `lg` the gestures keep their modifiers again, so the mode is left
  // behind with the rest of the shell chrome when the window grows.
  const [selectMode, setSelectMode] = useState(false);
  useEffect(() => {
    if (isSidebarViewport) setSelectMode(false);
  }, [isSidebarViewport]);
  const [bookmarksToDelete, setBookmarksToDelete] = useState([]);
  // #50: the digest being read, null when none is.
  const [digest, setDigest] = useState(null);
  // #295: the link-health workspace view — the Broken Links row's destination
  // from `lg` up. Like the digest, it is a page and not a lens: it yields to
  // navigation through the same choke point below.
  const [linkHealthOpen, setLinkHealthOpen] = useState(false);
  // #296/#295: ending a workspace view is one decision, made wherever
  // navigation happens. Neither view is a filter over the list, so every
  // destination — another smart view, a saved view, a folder, a search — names
  // a page neither view is, and both yield to it.
  const closeWorkspaceViews = useCallback(() => {
    setDigest(null);
    setLinkHealthOpen(false);
  }, []);
  // #44/#102: the change set waiting to be reviewed — `{title, rows}` — and whether
  // it is being written. One at a time, whoever proposed it.
  const [review, setReview] = useState(null);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ message: "", type: "info" });
  // #53: manual filter state, independent of the agent plan so neither clobbers the other.
  const [manualFilters, setManualFilters] = useState(EMPTY_FILTERS);

  // #49: saved views name what is on screen — the plan and the filters together.
  const { views, save: saveView, forget: forgetView } = useSmartViews();

  // #11: only http(s) URLs open — javascript: and data: are refused out loud
  // rather than silently ignored.
  //
  // #50: opening is also the one thing the app observes about a bookmark, so it is
  // recorded here — the single path that opens one. It writes straight to the store
  // rather than through the recording helpers: opening is not an edit, and an
  // "undo opening a bookmark" entry would be nonsense.
  const openBookmark = useCallback(
    (bookmark) => {
      if (!isSafeHttpUrl(bookmark.url)) {
        showCustomMessage(t("app.unsafeUrl"), "error");
        return;
      }
      window.open(bookmark.url, "_blank", "noopener,noreferrer");
      storeRef.current?.update(bookmark.id, openedPatch()).catch(() => {});
    },
    [storeRef, t]
  );

  // #190: where the selection hook's Shift gestures land — Shift+Enter and
  // Shift+double-click edit the bookmark instead of opening it.
  const handleEditBookmark = useCallback((bookmark) => {
    setEditingBookmark(bookmark);
    setIsModalOpen(true);
  }, []);

  const {
    selectedId: selectedBookmarkId,
    multiSelectedIds: multiSelectedBookmarkIds,
    selectedIds,
    selectAll,
    clear: clearSelectedBookmarks,
    onBookmarkClick: handleBookmarkClick,
    onBookmarkDoubleClick: handleBookmarkDoubleClick,
    onBookmarkKeyDown: handleBookmarkKeyDown,
  } = useBookmarkSelection(openBookmark, handleEditBookmark, selectMode);

  // #299: below `lg` the selection's actions live in the bar at the bottom,
  // and "Bulk Edit" opens the bulk-edit sheet (#301). Above `lg` the inline
  // editor appears on its own, as it always has. Either way the editor is the
  // selection's, and dies with it.
  const [bulkEditorOpen, setBulkEditorOpen] = useState(false);
  useEffect(() => {
    if (multiSelectedBookmarkIds.length === 0) setBulkEditorOpen(false);
  }, [multiSelectedBookmarkIds]);

  // The bar floats over the list's bottom edge, so the list pays for it the
  // way it pays for the fixed header: the measured height becomes the main
  // area's bottom padding through --app-selectionbar-height.
  const selectionBarRef = useRef(null);
  const selectionBarShown = !isSidebarViewport && multiSelectedBookmarkIds.length > 0;
  useEffect(() => {
    const bar = selectionBarRef.current;
    const root = document.documentElement;
    if (!selectionBarShown || !bar) {
      root.style.setProperty("--app-selectionbar-height", "0px");
      return undefined;
    }
    const syncHeight = () =>
      root.style.setProperty("--app-selectionbar-height", `${bar.offsetHeight}px`);
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.setProperty("--app-selectionbar-height", "0px");
    };
  }, [selectionBarShown]);

  // Read by an effect that must not resubscribe when the list changes.
  const bookmarksRef = useRef(bookmarks);
  useEffect(() => {
    bookmarksRef.current = bookmarks;
  }, [bookmarks]);

  // PERF-07: Debounce search for displayedBookmarks (input updates instantly; search updates after 300ms)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  // #53: debounce only the filter text — chips/selects apply immediately, since they
  // are discrete choices and waiting on them feels broken.
  const debouncedFilterText = useDebounce(manualFilters.text, 300);
  const effectiveFilters = useMemo(
    () => ({ ...manualFilters, text: debouncedFilterText }),
    [manualFilters, debouncedFilterText]
  );

  // ─── Background URL validation on select ────────────────────────────────────
  // When a bookmark is selected, silently validate its URL and auto-save if the
  // status or URL has changed (e.g. 404 discovered, or a redirect destination).
  // Skips bookmarks where the user explicitly set urlStatus="ignored".
  useEffect(() => {
    if (!selectedBookmarkId) return;
    const bookmark = bookmarksRef.current.find((b) => b.id === selectedBookmarkId);
    if (!bookmark?.url || bookmark.urlStatus === "ignored") return;

    let cancelled = false;
    fetchUrlStatus(bookmark.url)
      .then(({ status, redirectUrl }) => {
        if (cancelled) return;
        const newUrl = redirectUrl || bookmark.url;
        if (newUrl !== bookmark.url || status !== bookmark.urlStatus) {
          storeRef.current?.update(bookmark.id, { url: newUrl, urlStatus: status });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedBookmarkId, storeRef]); // bookmarksRef is a ref, no dep needed

  // ─── Dead-link sweep (#47) ──────────────────────────────────────────────────
  // Asked for rather than automatic: checking every link contacts every host in
  // the collection. It resumes where it left off, so a large collection can be
  // swept over several runs.
  const sweep = useLinkSweep({ bookmarks, storeRef, showMessage: showCustomMessage });
  const brokenCount = useMemo(() => bookmarks.filter(isBroken).length, [bookmarks]);
  const archive = useArchiveRecovery({ showMessage: showCustomMessage });
  const showBrokenOnly = useCallback(
    () => setManualFilters((prev) => ({ ...prev, brokenOnly: true })),
    []
  );

  // ─── Displayed bookmarks (PERF-08: precise deps, ARCH-10: empty state handled in BookmarkList) ─
  // #53: the agent plan narrows first, then the manual filters layer on top. Tag facets
  // come from the planned set (pre-manual) so the chip row doesn't rearrange itself out
  // from under the pointer as you click chips.
  const plannedBookmarks = useMemo(
    () => applyAgentPlan(lastAction, bookmarks),
    [bookmarks, lastAction]
  );

  const tagFacets = useMemo(() => deriveTagCounts(plannedBookmarks), [plannedBookmarks]);

  // #55: the folders that exist, for the form to complete against — typing a path
  // by hand is how a second "Wrok" folder gets created.
  const knownFolders = useMemo(() => folderPaths(bookmarks), [bookmarks]);

  // #54: The bulk bar needs the bookmarks, not just their ids — what a change
  // would write depends on what each of them currently holds.
  const selectedBookmarks = useMemo(
    () => bookmarks.filter((b) => multiSelectedBookmarkIds.includes(b.id)),
    [bookmarks, multiSelectedBookmarkIds]
  );

  const displayedBookmarks = useMemo(
    () =>
      applyManualFilters(effectiveFilters, plannedBookmarks).map((b) =>
        b.unreachable ? { ...b, urlStatus: "invalid" } : b
      ),
    [plannedBookmarks, effectiveFilters]
  );

  // #102: what a lookup would actually ask about — the dead links in the selection
  // if there is one, otherwise the dead links on screen. Nothing offers to contact
  // the archive when there is nothing to ask about.
  // The archive question is asked about a selection when there is one, and one
  // click on a bookmark is a selection — so this follows selectedIds rather than
  // the multi-select list the bulk-edit bar works from.
  const bookmarksInReach = useMemo(
    () =>
      selectedIds.length > 0
        ? bookmarks.filter((b) => selectedIds.includes(b.id))
        : displayedBookmarks,
    [bookmarks, displayedBookmarks, selectedIds]
  );

  const deadLinksInReach = useMemo(() => recoverable(bookmarksInReach).length, [bookmarksInReach]);

  // #49: A view is "active" when the screen matches it, rather than because it was
  // the last one clicked — editing a filter afterwards should visibly leave it.
  const activeViewId = useMemo(
    () => matchingViewId(views, lastAction, manualFilters),
    [views, lastAction, manualFilters]
  );

  const applyView = useCallback(
    (view) => {
      closeWorkspaceViews();
      setLastAction(view.plan.length > 0 ? view.plan : null);
      setManualFilters(view.filters);
      setSearchQuery("");
    },
    [closeWorkspaceViews]
  );

  const handleSaveView = useCallback(
    (name) => {
      if (!saveView(name, lastAction, manualFilters)) {
        showCustomMessage(t("app.nothingToSave"), "info");
        return false;
      }
      return true;
    },
    [saveView, lastAction, manualFilters, t]
  );

  // ─── Message helper ──────────────────────────────────────────────────────────

  function showCustomMessage(message, type = "info") {
    setMessageModalContent({ message, type });
    setIsMessageModalOpen(true);
  }

  // ─── CRUD handlers ───────────────────────────────────────────────────────────
  const handleSaveBookmark = useCallback(
    async (b) => {
      await saveBookmark(b, showCustomMessage);
      setIsModalOpen(false);
    },
    [saveBookmark]
  );

  // #86: Staging a deletion always says why, even when the reason is "you asked".
  // Two setters that had to move together is how a stale "same page as" line ends
  // up explaining an unrelated delete.
  const stageDeletion = useCallback((ids, reasons = []) => {
    setBookmarksToDelete(ids);
    setDuplicateReasons(reasons);
    setIsDeleteConfirmModalOpen(true);
  }, []);

  const handleDeleteBookmark = useCallback((id) => stageDeletion([id]), [stageDeletion]);

  // #54: The bar plans the patches; applying them and saying how many landed is
  // the app's business, as with any other write.
  const handleBulkEdit = useCallback(
    async (patches) => {
      try {
        await applyBulkEdit(patches);
        showCustomMessage(t("app.updatedCount", { count: patches.length }), "success");
      } catch (e) {
        console.error("Bulk edit failed:", e);
        showCustomMessage(t("app.bulkEditFailed"), "error");
      }
    },
    [applyBulkEdit, t]
  );

  // #55: A folder is a path its bookmarks carry and nothing else, so every gesture
  // in the tree — a drop, a rename, a removal — is a write across the bookmarks it
  // holds. Going through the bulk-edit path keeps folder editing on the one write
  // path, and makes each gesture a single undo entry however many bookmarks moved.
  const applyFolderChange = useCallback(
    async (patches, describe) => {
      if (patches.length === 0) return false;
      try {
        await applyBulkEdit(patches);
        showCustomMessage(describe(patches.length), "success");
        return true;
      } catch (e) {
        console.error("Folder change failed:", e);
        showCustomMessage(t("app.folderChangeFailed"), "error");
        return false;
      }
    },
    [applyBulkEdit, t]
  );

  const handleMoveToFolder = useCallback(
    (ids, folder) =>
      applyFolderChange(moveToFolderPatches(bookmarks, ids, folder), (count) =>
        t("app.movedCount", { count })
      ),
    [applyFolderChange, bookmarks, t]
  );

  // A filter naming a folder that just moved would match nothing, so it follows.
  const followFolder = useCallback((from, to) => {
    setManualFilters((prev) => ({ ...prev, folder: followFolderMove(prev.folder, from, to) }));
  }, []);

  // Renaming and renesting are the same write: both replace a path prefix.
  const handleRenameFolder = useCallback(
    async (from, to) => {
      const moved = await applyFolderChange(renameFolderPatches(bookmarks, from, to), (count) =>
        t("app.renamedFolderCount", { count, folder: to || t("common.noFolder") })
      );
      if (moved) followFolder(from, to);
    },
    [applyFolderChange, bookmarks, followFolder, t]
  );

  const handleDeleteFolder = useCallback(
    async (path) => {
      const moved = await applyFolderChange(dissolveFolderPatches(bookmarks, path), (count) =>
        t("app.removedFolderCount", { path, count })
      );
      if (moved) followFolder(path, parentFolder(path));
    },
    [applyFolderChange, bookmarks, followFolder, t]
  );

  // The pane keeps the selection alive so it can be dragged, which makes filtering
  // from it the one gesture that has to drop it: a selection the folder hides is a
  // bulk edit aimed at bookmarks nobody can see.
  const selectFolder = useCallback(
    (folder) => {
      clearSelectedBookmarks();
      closeWorkspaceViews();
      setManualFilters((prev) => ({ ...prev, folder }));
      // #294: the drawer covers the list it just filtered, so picking a
      // folder is also done with it.
      setIsNavDrawerOpen(false);
    },
    [clearSelectedBookmarks, closeWorkspaceViews]
  );

  // A dragged card carries the selection it belongs to, and only itself otherwise.
  const handleBookmarkDragStart = useCallback(
    (event, bookmark) => {
      const ids = multiSelectedBookmarkIds.includes(bookmark.id)
        ? multiSelectedBookmarkIds
        : [bookmark.id];
      if (!event.dataTransfer) return;
      event.dataTransfer.setData(DRAG_BOOKMARKS, JSON.stringify(ids));
      event.dataTransfer.effectAllowed = "move";
    },
    [multiSelectedBookmarkIds]
  );

  // UX-09: Keep modal open during delete; show error on failure; success toast
  const handleConfirmDelete = useCallback(async () => {
    if (!storeRef.current) return;
    const ids = [...bookmarksToDelete];
    if (ids.length === 0) return;

    setIsDeleting(true);
    try {
      await deleteBookmarks(ids);
      setIsDeleteConfirmModalOpen(false);
      setIsModalOpen(false);
      clearSelectedBookmarks();
      showCustomMessage(t("app.deletedCount", { count: ids.length }), "success");
    } catch (e) {
      console.error("Delete failed:", e);
      // UX-09: Error message persists (no auto-dismiss) — user must acknowledge data loss risk
      showCustomMessage(t("app.deleteFailed"), "error");
    } finally {
      setIsDeleting(false);
      setBookmarksToDelete([]);
      setDuplicateReasons([]);
    }
  }, [bookmarksToDelete, deleteBookmarks, storeRef, clearSelectedBookmarks, t]);

  const handleCancelDelete = useCallback(() => {
    setBookmarksToDelete([]);
    setDuplicateReasons([]);
    setIsDeleteConfirmModalOpen(false);
  }, []);

  const handleAddNewBookmark = useCallback(() => {
    setEditingBookmark({
      id: null,
      title: "",
      url: "",
      description: "",
      tags: [],
      rating: 0,
      folderId: "",
      faviconUrl: "",
    });
    setIsModalOpen(true);
  }, []);

  const handleImportExportOpen = useCallback(() => setIsImportExportModalOpen(true), []);
  const handleImportExportClose = useCallback(() => setIsImportExportModalOpen(false), []);

  // #44: A tidy-up is a proposal. The model answers, the diff is reviewed, and
  // only what the user keeps is written — through the bulk-edit path, so the whole
  // tidy-up is one undo entry rather than a hundred.
  const semantic = useSemanticSearch({
    provider: runtimeProvider,
    providerOptions,
    locked: encryption.locked,
  });

  const organizer = useOrganizer({
    provider: runtimeProvider,
    providerOptions,
    locked: encryption.locked,
    showMessage: showCustomMessage,
  });

  // The list is passed in rather than read from state: a plan that searches and
  // then organizes runs both in the same tick, before React has re-rendered with
  // the new plan, so `displayedBookmarks` would still be the previous view and the
  // tidy-up would range over bookmarks the query had just excluded.
  // #50: the week, on request. The sections are computed locally; a model only
  // names the groups, and there is a deterministic grouping when there is none.
  const digestEngine = useDigest({
    provider: runtimeProvider,
    providerOptions,
    locked: encryption.locked,
  });

  const handleOrganize = useCallback(
    async (list, fields) => {
      const rows = await organizer.run(list, fields ? { fields } : {});
      if (rows.length === 0) {
        showCustomMessage(t("app.alreadyOrganized"), "info");
        return;
      }
      setReview({ title: t("changeReview.defaultTitle"), rows });
    },
    [organizer, t]
  );

  // #295: the archive's answers held for the link-health view — the same
  // reviewable rows the dialog flow stages (utils/changeReview.js). Kept here
  // rather than in the view so leaving the page and coming back does not ask
  // the archive again about links already looked up this session.
  const [recoveryRows, setRecoveryRows] = useState([]);

  // #102: a dead link is the one thing the sweep found and deliberately would not
  // fix. Asking the archive is a separate, asked-for step, and it proposes rather
  // than writes: the same review and the same one-undo write as a tidy-up.
  const handleRecoverDeadLinks = useCallback(async () => {
    const { rows } = await archive.run(bookmarksInReach);
    if (rows.length > 0) setReview({ title: t("changeReview.archivedTitle"), rows });
  }, [archive, bookmarksInReach, t]);

  const recoverableBroken = useMemo(() => recoverable(bookmarks), [bookmarks]);

  // #295 (codex): every link this session has already asked the archive about —
  // hits, which stay staged in recoveryRows, and misses, which stage nothing —
  // so pressing Find again asks only about links a run has not reached. The run
  // itself caps at its first fifty; without this, a collection with more dead
  // links than that could never get past them, and misses would be re-asked on
  // every press.
  const [askedArchive, setAskedArchive] = useState(() => new Set());

  // The run's answer, staged: the ids it really put a question about join
  // `askedArchive` — a run stopped mid-pace leaves its unasked tail owed for
  // the next press — and its reviewable rows replace any staged ones, so a
  // second look refreshes rather than duplicates.
  const stageRecoveryRows = useCallback((asked, rows) => {
    setAskedArchive((prev) => {
      const next = new Set(prev);
      for (const id of asked) next.add(id);
      return next;
    });
    if (rows.length === 0) return;
    const fresh = new Set(rows.map((row) => row.id));
    setRecoveryRows((prev) => [...prev.filter((row) => !fresh.has(row.id)), ...rows]);
  }, []);

  // #303 (codex): which staged proposals the reader unticked — held here,
  // above the breakpoint-dependent mounts, so crossing `lg` while the view is
  // open swaps the workspace for the sheet without re-selecting what was
  // explicitly declined.
  const [rejectedRecovery, setRejectedRecovery] = useState(() => new Set());

  const toggleRejectedRecovery = useCallback((id) => {
    setRejectedRecovery((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // #295: the view's lookup — the whole collection's dead links, not the
  // selection or the screen the header button works from. The same paced run
  // and the same proposal-not-write shape.
  const handleLinkHealthLookup = useCallback(async () => {
    const outstanding = recoverableBroken.filter((b) => !askedArchive.has(b.id));
    if (outstanding.length === 0) return;
    const { rows, asked } = await archive.run(outstanding);
    stageRecoveryRows(asked, rows);
  }, [archive, askedArchive, recoverableBroken, stageRecoveryRows]);

  // #303: one row's Wayback — the same paced run, pointed at the one link
  // being read. A press is the user asking, so it re-asks even a link this
  // session already missed; a miss stages nothing and says so with the
  // run's own "none found" message.
  const handleRowLookup = useCallback(
    async (bookmark) => {
      const { rows, asked } = await archive.run([bookmark]);
      stageRecoveryRows(asked, rows);
    },
    [archive, stageRecoveryRows]
  );

  // #303: the sheet's per-card "Edit URL" — the ordinary edit form. Below
  // `lg` the sheet closes first, so the two sheets never stack (the digest's
  // rule, #302); from `lg` the form is a dialog over the view, which stays.
  const editFromLinkHealth = useCallback(
    (bookmark) => {
      if (!isSidebarViewport) setLinkHealthOpen(false);
      handleEditBookmark(bookmark);
    },
    [handleEditBookmark, isSidebarViewport]
  );

  // A lookup is still owed while a dead link the session has not asked about
  // remains — misses included, which is why this is not proposals versus rows.
  const lookupOwed = useMemo(
    () => recoverableBroken.some((b) => !askedArchive.has(b.id)),
    [askedArchive, recoverableBroken]
  );

  // #295: the view's proposal map — row id to the snapshot it proposes. The
  // view reads the dead links and their stored failure reasons off the
  // bookmarks themselves, so a stale row (its link recovered another way)
  // simply stops matching and disappears.
  const proposalUrls = useMemo(
    () => Object.fromEntries(recoveryRows.map((row) => [row.id, row.after.url])),
    [recoveryRows]
  );

  // The reviewed rows' write: acceptedPatches onto the bulk-edit path, so a
  // reviewed set is one store write and one undo entry however many rows it
  // held. Answers whether it wrote, so a caller can clear what it staged.
  const applyReviewedRows = useCallback(
    async (rows, acceptedIds) => {
      const patches = acceptedPatches(rows, acceptedIds);
      if (patches.length === 0) return false;
      setIsApplyingChanges(true);
      try {
        await applyBulkEdit(patches);
        showCustomMessage(t("app.updatedCount", { count: patches.length }), "success");
        return true;
      } catch (e) {
        console.error("Applying reviewed changes failed:", e);
        showCustomMessage(t("app.applyFailed"), "error");
        return false;
      } finally {
        setIsApplyingChanges(false);
      }
    },
    [applyBulkEdit, t]
  );

  const handleApplyReviewed = useCallback(
    async (acceptedIds) => {
      const applied = await applyReviewedRows(review?.rows, acceptedIds);
      if (applied) setReview(null);
    },
    [applyReviewedRows, review]
  );

  // #295: the view's Apply Selected — the dialog's write, with the applied
  // rows dropped afterwards so the staged set is honest about what remains.
  const handleApplyLinkHealth = useCallback(
    async (acceptedIds) => {
      const applied = await applyReviewedRows(recoveryRows, acceptedIds);
      if (applied) {
        const done = new Set(acceptedIds);
        setRecoveryRows((prev) => prev.filter((row) => !done.has(row.id)));
      }
    },
    [applyReviewedRows, recoveryRows]
  );

  const showDigest = useCallback(async () => {
    const built = await digestEngine.build(bookmarks);
    if (!built) {
      showCustomMessage(t("app.nothingToReport"), "info");
      return;
    }
    setDigest(built);
  }, [bookmarks, digestEngine, t]);

  const showNeverOpened = useCallback(() => {
    setManualFilters((prev) => ({ ...prev, neverOpened: true }));
    setDigest(null);
  }, []);

  // #302: the digest sheet's per-card "Tag & File" — the ordinary edit form
  // for that bookmark, with the digest closed first so the two sheets never
  // stack. The form's Save is the same write path an edit from the list uses.
  const editFromDigest = useCallback(
    (bookmark) => {
      setDigest(null);
      handleEditBookmark(bookmark);
    },
    [handleEditBookmark]
  );

  // #283: a smart view chosen from the navigation sidebar. It is one manual
  // filter flag — the same write as the filter strip's toggle — so the agent
  // plan is untouched and the filtering order holds. The sidebar's views are
  // exclusive, and each is the whole collection seen one way (the count on its
  // row says so), so choosing one also leaves any folder; smartViewFilters
  // says exactly what changes.
  const applySmartView = useCallback(
    (view) => {
      if (view === "digest") {
        setLinkHealthOpen(false);
        showDigest();
        return;
      }
      // #295: the Broken Links row opens the link-health view at every width —
      // a page of its own rather than a lens. From `lg` it is the workspace
      // composition beside the rail; below it, #303's sheet.
      if (view === "brokenLinks") {
        closeWorkspaceViews();
        setLinkHealthOpen(true);
        return;
      }
      // #296: a workspace view yields to any other destination — its row
      // would otherwise stay highlighted over a page that moved on, and a
      // digest of additions alone would have no exit.
      closeWorkspaceViews();
      setManualFilters((prev) => smartViewFilters(prev, view));
    },
    [closeWorkspaceViews, showDigest]
  );

  // Which sidebar row is the one on screen. Decided beside the other saved
  // view rules in utils/smartViews.js, where it is tested: no view claims the
  // page while a folder narrows the list.
  const currentView = useMemo(
    () => currentSmartView(manualFilters, { digestOpen: Boolean(digest), linkHealthOpen }),
    [digest, linkHealthOpen, manualFilters]
  );

  // #303: below `lg` the link-health view has its own composition — the
  // mobile mockup's full-page sheet — so the view no longer yields to the
  // brokenOnly filter when the window shrinks past the breakpoint; the same
  // `linkHealthOpen` flag renders the sheet there, and the rail keeps
  // claiming the page it is showing.

  // #294: the top bar's title is the view on screen: the smart view, or the
  // folder narrowing the list, and otherwise the whole collection.
  const shellTitle = useMemo(() => {
    if (currentView) return t(SMART_VIEW_LABEL_KEYS[currentView]);
    return manualFilters.folder || t(SMART_VIEW_LABEL_KEYS.all);
  }, [currentView, manualFilters.folder, t]);

  // "Triage these" is the organizer, pointed at the untagged set rather than at
  // whatever is on screen.
  const triageUntagged = useCallback(
    async (untagged) => {
      setDigest(null);
      await handleOrganize(untagged, ["tags"]);
    },
    [handleOrganize]
  );

  // #86: the optional second opinion on duplicates. With no provider configured,
  // or an encrypted key nobody unlocked, it proposes nothing and the rule-based
  // pass stands on its own.
  const { isAsking: isAskingAboutDuplicates, propose: proposeSemanticDuplicates } =
    useSemanticDedupe({
      provider: runtimeProvider,
      providerOptions,
      locked: encryption.locked,
    });

  // #86: the rule-based pass first, then — only if a provider is configured — a
  // second look at the pairs no rule can settle. Both end in the same
  // confirmation, and the model's reason for each pair is shown there.
  const handleRemoveDuplicates = useCallback(async () => {
    const certain = findDuplicateIds(displayedBookmarks);
    const remaining = displayedBookmarks.filter((b) => !certain.includes(b.id));
    const { ids: likely, reasons } = await proposeSemanticDuplicates(remaining);
    const ids = [...certain, ...likely];

    if (ids.length === 0) {
      showCustomMessage(t("app.noDuplicates"), "info");
      return;
    }
    stageDeletion(ids, reasons);
  }, [displayedBookmarks, proposeSemanticDuplicates, stageDeletion, t]);

  const resetSearch = useCallback(() => {
    setLastAction(null);
    clearSelectedBookmarks();
    setBookmarksToDelete([]);
  }, [clearSelectedBookmarks]);

  // #53: filter handlers. "Clear filters" (in the bar) and "Clear Search" (the agent
  // plan) stay separate so clearing one doesn't silently discard the other; the
  // empty-state CTA clears both, since that's the "give me everything back" button.
  const handleCycleTag = useCallback((tag) => setManualFilters((prev) => cycleTag(prev, tag)), []);
  const clearManualFilters = useCallback(() => setManualFilters(EMPTY_FILTERS), []);
  const clearAllFilters = useCallback(() => {
    setManualFilters(EMPTY_FILTERS);
    resetSearch();
  }, [resetSearch]);

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────
  // Escape drops the selection, the select mode it was made in, and anything
  // staged for deletion with it.
  const clearSelection = useCallback(() => {
    clearSelectedBookmarks();
    setBookmarksToDelete([]);
    setSelectMode(false);
  }, [clearSelectedBookmarks]);

  const confirmDeleteSelection = useCallback(() => {
    if (selectedIds.length === 0) {
      showCustomMessage(t("app.selectToDelete"), "info");
      return;
    }
    setBookmarksToDelete(selectedIds);
    setIsDeleteConfirmModalOpen(true);
    clearSelectedBookmarks();
  }, [selectedIds, clearSelectedBookmarks, t]);

  // #27: An open dialog owns the keyboard. Escape inside one closes it and stops
  // there, and the rest of the shortcuts stay bound but inactive rather than
  // reaching the list behind the dialog.
  const isDialogOpen =
    isModalOpen ||
    isImportExportModalOpen ||
    isDeleteConfirmModalOpen ||
    isHelpModalOpen ||
    isOptionsOpen ||
    isMessageModalOpen ||
    Boolean(review) ||
    Boolean(digest) ||
    // #295: the link-health view unmounts the list like the digest does, so
    // the shortcuts stay suspended in both compositions instead of acting on
    // a shelf that is not there.
    linkHealthOpen ||
    // #294: the navigation drawer. It handles its own Escape, as every dialog
    // does; this keeps the list shortcuts from firing behind it.
    navDrawerOpen ||
    // #301: the bulk-edit sheet below `lg` — a dialog to the keyboard like
    // the rest, so `d` cannot stage a deletion behind it while it is open.
    bulkEditorOpen;

  useKeyboardShortcuts(
    {
      // Dialogs, the navigation drawer included (#294), take Escape
      // themselves; with one open the shortcuts are disabled altogether.
      Escape: clearSelection,
      // #56: the history outlives the toast, so this reaches writes whose offer
      // has already gone.
      "Mod+z": (event) => {
        event.preventDefault();
        undo.undoLast();
      },
      h: () => setIsHeaderVisible((prev) => !prev),
      // #22: select the currently visible (filtered) bookmarks, not the whole store
      "Mod+a": (event) => {
        event.preventDefault();
        selectAll(displayedBookmarks.map((b) => b.id));
      },
      "Mod+d": (event) => {
        event.preventDefault();
        confirmDeleteSelection();
      },
      "Mod+Delete": (event) => {
        event.preventDefault();
        confirmDeleteSelection();
      },
      // macOS's delete key reports "Backspace"; forward-delete reports "Delete".
      "Mod+Backspace": (event) => {
        event.preventDefault();
        confirmDeleteSelection();
      },
      d: (event) => {
        event.preventDefault();
        confirmDeleteSelection();
      },
      e: (event) => {
        const id = selectedBookmarkId || (selectedIds.length === 1 ? selectedIds[0] : null);
        const bookmark = id && bookmarks.find((b) => b.id === id);
        if (!bookmark) return;
        event.preventDefault();
        setEditingBookmark(bookmark);
        setIsModalOpen(true);
      },
      c: () => {
        const selected = bookmarks.find((b) => b.id === selectedBookmarkId);
        // SEC-05: URL validation stub (corsproxy removed)
        if (selected?.url) showCustomMessage(t("app.urlCheckUnavailable"), "info");
      },
    },
    { enabled: !isDialogOpen }
  );

  // ─── Persisted reorder (UX-05: with undo) ───────────────────────────────────
  const persistReorder = useCallback(
    async (order = "asc", sortByOverride) => {
      if (!storeRef.current) return;
      const plan = Array.isArray(lastAction) ? lastAction : lastAction ? [lastAction] : [];
      let sortBy = "title";
      if (sortByOverride) sortBy = sortByOverride;
      else {
        const sortStep = plan.find((s) => s.action === "sortBookmarks");
        if (sortStep?.parameters?.sortBy) sortBy = sortStep.parameters.sortBy;
      }
      try {
        await persistSortedOrder({ sortBy, order });
        showCustomMessage(
          t(order === "asc" ? "app.reorderedAsc" : "app.reorderedDesc", { field: sortBy }),
          "success"
        );
        if (plan.length > 0) {
          // The order now lives in the store, so the steps that asked for it have
          // been honoured and would otherwise re-sort the view forever.
          const withoutSort = plan.filter(
            (s) => !["sortBookmarks", ...REORDER_ACTIONS].includes(s.action)
          );
          setLastAction(withoutSort.length > 0 ? withoutSort : null);
        }
      } catch (e) {
        console.error("Persist reorder failed", e);
        showCustomMessage(t("app.persistFailed"), "error");
      }
    },
    [lastAction, persistSortedOrder, storeRef, t]
  );

  const handlePersistReorderFromAgent = useCallback(
    async (step) => {
      const action = (step?.action || "").toLowerCase();
      const order = step?.parameters?.order || (action.includes("descending") ? "desc" : "asc");
      let sortBy = step?.parameters?.sortBy || "title";
      if (!step?.parameters?.sortBy) {
        const plan = Array.isArray(lastAction) ? lastAction : lastAction ? [lastAction] : [];
        const sortStep = plan.find((s) => s.action === "sortBookmarks");
        if (sortStep?.parameters?.sortBy) sortBy = sortStep.parameters.sortBy;
      }
      await persistReorder(order, sortBy);
    },
    [lastAction, persistReorder]
  );

  // ─── Agent plan side effects ─────────────────────────────────────────────────
  // What a plan *does* to the app, as opposed to how it was obtained. #21: in the
  // priority order the model assigned, and awaited, so a step that writes finishes
  // before the next one starts.
  // #46: A search reaches the vector index too, and the answer replaces the step
  // that asked — `semanticMatches` carries the query with it, because widening has
  // to see what substring matching filtered out. With no index and no provider this
  // returns nothing and the plain search stands.
  //
  // The widening is an upgrade to results the user is already looking at, not a
  // gate in front of them, so it is not awaited: `semantic.search` re-embeds every
  // stale bookmark on a cold index, and holding the loop for it pinned the search
  // box shut long after the list had filtered down. A widening that answers late
  // is harmless — `widenPlanSearch` only touches the plan that still asks for its
  // term — and `semantic.search` answers [] on failure rather than rejecting.
  const widenSearch = useCallback(
    async (searchTerm) => {
      const ids = await semantic.search(searchTerm, bookmarks);
      if (ids.length === 0) return;
      setLastAction((plan) => widenPlanSearch(plan, searchTerm, ids));
    },
    [bookmarks, semantic]
  );

  const runPlanSteps = useCallback(
    async (steps, plan) => {
      // What this plan shows, computed from the plan itself for the same reason
      // `handleOrganize` takes a list: the render carrying it has not happened yet.
      const inView = () => applyManualFilters(effectiveFilters, applyAgentPlan(plan, bookmarks));
      for (const step of sortStepsByPriority(steps)) {
        if (step.action === "help") setIsHelpModalOpen(true);
        if (step.action === "importBookmarks" || step.action === "exportBookmarks")
          setIsImportExportModalOpen(true);
        if (step.action === "removeDuplicates") {
          const inView = applyAgentPlan(plan, bookmarks);
          const certain = findDuplicateIds(inView);
          const { ids: likely, reasons } = await proposeSemanticDuplicates(
            inView.filter((b) => !certain.includes(b.id))
          );
          const ids = [...certain, ...likely];
          if (ids.length > 0) stageDeletion(ids, reasons);
          else showCustomMessage(t("app.noDuplicates"), "info");
        }
        if (step.action === "searchBookmarks" && step.parameters?.searchTerm)
          widenSearch(step.parameters.searchTerm);
        if (step.action === "weeklyDigest") await showDigest();
        if (step.action === "organizeBookmarks")
          await handleOrganize(inView(), step.parameters?.fields);
        if (REORDER_ACTIONS.includes(step.action)) await handlePersistReorderFromAgent(step);
      }
    },
    [
      bookmarks,
      effectiveFilters,
      handleOrganize,
      handlePersistReorderFromAgent,
      proposeSemanticDuplicates,
      showDigest,
      stageDeletion,
      widenSearch,
      t,
    ]
  );

  // The natural-language box fronts the provider, so it is enabled only when a
  // provider can actually be asked something — the same readiness rule the
  // dedupe and embedding paths apply (#86). A locked key keeps the box open:
  // submitting a query is how the user reaches the engine's unlock prompt.
  const isAgentConfigured = isSearchEnabled(runtimeProvider, providerOptions, encryption.locked);
  // #301: Auto-Tag asks the provider directly and has no unlock prompt to
  // offer, so its gate is the same readiness without the locked pass-through
  // search uses to reach the unlock flow — locked settings mean it is off.
  const canAutoTag = isSearchEnabled(runtimeProvider, providerOptions, false);

  const { isProcessing, run: runAgent } = useAgentEngine({
    provider: runtimeProvider,
    providerOptions,
    locked: encryption.locked,
    plan: lastAction,
    onPlan: setLastAction,
    onSteps: runPlanSteps,
    showMessage: showCustomMessage,
  });

  const handleSearchInputKeyDown = useCallback(
    (e) => {
      if (e.key !== "Enter") return;
      // The one query that is not a query: "options" opens the dialog. It predates
      // the agent and costs nothing to keep working.
      if ((searchQuery || "").trim().toLowerCase() === "options") {
        setIsOptionsOpen(true);
        return;
      }
      setBookmarksToDelete([]);
      // #296/#295: a query names the list it wants; a workspace view yields to it.
      closeWorkspaceViews();
      runAgent(searchQuery);
    },
    [closeWorkspaceViews, searchQuery, runAgent]
  );

  // ─── Import handlers ─────────────────────────────────────────────────────────
  const handleImportJson = useCallback(
    async (arr, replaceAll = false) => {
      const existing = replaceAll ? [] : bookmarks;
      // #25: The dialog already ran the array through readImportedBookmarks, but
      // this is the store-facing edge, so it validates rather than assuming.
      // #11 lives there too: only entries with a safe http(s) URL survive.
      const { bookmarks: safe } = readImportedBookmarks(arr);
      const { bookmarks: bookmarksToImport, skippedCount } = filterDuplicateImports(safe, existing);

      if (replaceAll) {
        await saveAllBookmarks(bookmarksToImport);
      } else if (bookmarksToImport.length > 0) {
        await appendBookmarks(bookmarksToImport);
      }

      const result = getImportResultMessage(
        t,
        bookmarksToImport.length,
        skippedCount,
        t("app.noBookmarksInData")
      );
      showCustomMessage(result.message, result.type);
      handleImportExportClose();
      setLastAction(null);
    },
    [appendBookmarks, bookmarks, handleImportExportClose, saveAllBookmarks, t]
  );

  const handleImportHtml = useCallback(
    async (html, replaceAll = false) => {
      try {
        const importedBookmarks = parseNetscapeHtml(html);

        // #11: only import links with a safe http(s) URL.
        const safeBookmarks = importedBookmarks.filter((b) => isSafeHttpUrl(b.url));
        const existing = replaceAll ? [] : bookmarks;
        const { bookmarks: bookmarksToImport, skippedCount } = filterDuplicateImports(
          safeBookmarks,
          existing
        );

        if (replaceAll) {
          await saveAllBookmarks(bookmarksToImport);
        } else if (bookmarksToImport.length > 0) {
          await appendBookmarks(bookmarksToImport);
        }

        if (safeBookmarks.length > 0) {
          const result = getImportResultMessage(
            t,
            bookmarksToImport.length,
            skippedCount,
            t("app.noBookmarksInHtml")
          );
          showCustomMessage(result.message, result.type);
        } else {
          showCustomMessage(t("app.noBookmarksInHtml"), "info");
        }
        setLastAction(null);
      } catch (e) {
        console.error("Error parsing HTML bookmarks:", e);
        showCustomMessage(t("app.htmlParseFailed"), "error");
      } finally {
        handleImportExportClose();
      }
    },
    [appendBookmarks, bookmarks, handleImportExportClose, saveAllBookmarks, t]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--bg-secondary)" }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
            style={{ borderColor: "var(--accent)" }}
          />
          <p style={{ color: "var(--text-secondary)" }}>{t("app.loading")}</p>
        </div>
      </div>
    );
  }

  // #18: A collection that could not be opened is not an empty collection. The
  // app is withheld rather than shown empty, because every empty-state route out
  // of it — Add, Import — would write against bookmarks we never managed to read.
  if (loadError) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: "var(--bg-secondary)" }}
      >
        <div className="text-center max-w-md">
          <h1 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            {t("app.loadErrorTitle")}
          </h1>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            {t("app.loadErrorBody", { error: loadError })}
          </p>
          <Button onClick={() => window.location.reload()}>{t("app.tryAgain")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      // The design system's scope root sits on the App wrapper (#289), above
      // this component's loading and load-error returns; the shell keeps only
      // its own canvas background.
      className="bookmarkit-shell h-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: "var(--bg-secondary)" }}
    >
      {/* UX-06: Import progress bar */}
      {importProgress && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-accent text-white text-sm text-center py-2">
          {t("app.importProgress", { done: importProgress.done, total: importProgress.total })}
          <div className="h-1 bg-white bg-opacity-30 mt-1">
            <div
              className="h-1 bg-white transition-all"
              style={{
                width: `${Math.round((importProgress.done / importProgress.total) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* UX-05: Undo toast */}
      {undo.offered && (
        <div className="bookmarkit-toast-dock">
          <Toast label={undo.offered.label} onAction={undo.undoLast} onDismiss={undo.dismiss} />
        </div>
      )}

      {/* #283: the navigation sidebar — from `lg` up, where it has room.
          #294: below it, the same navigation is the drawer. */}
      {isSidebarViewport && (
        <SidebarNav
          effectsEnabled={effects}
          onHelp={() => setIsHelpModalOpen(true)}
          onAddBookmark={handleAddNewBookmark}
          bookmarks={bookmarks}
          currentView={currentView}
          digestBusy={digestEngine.running}
          onSmartView={applySmartView}
          brokenCount={brokenCount}
          views={views}
          activeSavedViewId={activeViewId}
          canSaveView={isViewWorthSaving(lastAction, manualFilters)}
          onApplyView={applyView}
          onSaveView={handleSaveView}
          onForgetView={forgetView}
          activeFolder={manualFilters.folder}
          onSelectFolder={selectFolder}
          onMoveBookmarks={handleMoveToFolder}
          onMoveFolder={handleRenameFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          // #297: the maintenance footer rides both mounts of the rail — the
          // same handlers the header strip uses, so the actions behave exactly
          // as today. In the drawer the rows operate in place, the way its
          // help entry opens HelpModal over the drawer rather than closing it.
          onCheckLinks={sweep.running ? sweep.stop : sweep.start}
          checkLinksRunning={sweep.running}
          onRemoveDuplicates={handleRemoveDuplicates}
          duplicatesBusy={isAskingAboutDuplicates}
          onImportExport={handleImportExportOpen}
          onOptions={() => setIsOptionsOpen(true)}
        />
      )}
      {!isSidebarViewport && navDrawerOpen && (
        <NavDrawer
          effectsEnabled={effects}
          onHelp={() => setIsHelpModalOpen(true)}
          onClose={() => setIsNavDrawerOpen(false)}
          // Picking a destination is the end of the trip: each of these
          // changes the list the drawer is covering.
          onAddBookmark={() => {
            setIsNavDrawerOpen(false);
            handleAddNewBookmark();
          }}
          onSmartView={(view) => {
            setIsNavDrawerOpen(false);
            applySmartView(view);
          }}
          bookmarks={bookmarks}
          currentView={currentView}
          digestBusy={digestEngine.running}
          brokenCount={brokenCount}
          views={views}
          activeSavedViewId={activeViewId}
          canSaveView={isViewWorthSaving(lastAction, manualFilters)}
          onApplyView={(view) => {
            setIsNavDrawerOpen(false);
            applyView(view);
          }}
          onSaveView={handleSaveView}
          onForgetView={forgetView}
          activeFolder={manualFilters.folder}
          onSelectFolder={selectFolder}
          onMoveBookmarks={handleMoveToFolder}
          onMoveFolder={handleRenameFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onCheckLinks={sweep.running ? sweep.stop : sweep.start}
          checkLinksRunning={sweep.running}
          onRemoveDuplicates={handleRemoveDuplicates}
          duplicatesBusy={isAskingAboutDuplicates}
          onImportExport={handleImportExportOpen}
          onOptions={() => setIsOptionsOpen(true)}
        />
      )}

      {/* #294: while the drawer is open the rest of the page is `inert`, so
          focus and the accessibility tree stay in the dialog. */}
      <header
        ref={headerRef}
        inert={navDrawerOpen || undefined}
        className={`bookmarkit-header fixed top-0 inset-x-0 z-10 transition-transform duration-300 ${isHeaderVisible ? "translate-y-0" : "-translate-y-full"}`}
        role="banner"
      >
        <div className="bg-[var(--ui-surface-container-lowest)] shadow-sm border-b border-[var(--ui-outline-variant)]">
          {/* Full width on purpose: capped at the reading measure, the action
              strip (Add New through the view selector) overflowed and clipped
              its last buttons at the window edge. Each row centers its own
              content, so the search row keeps its old centered look. */}
          <div className="px-4 py-4 flex flex-col gap-2">
            <h1 className="sr-only">{t("app.brandTitle")}</h1>
            {/* #294: the top bar is the header's first row — menu, the view on
                screen and its count, Add. From `lg` the sidebar carries all
                three, so it is not rendered there. */}
            {!isSidebarViewport && (
              <MobileTopBar
                title={shellTitle}
                savedCount={displayedBookmarks.length}
                navOpen={navDrawerOpen}
                onOpenNav={() => setIsNavDrawerOpen(true)}
                onAdd={handleAddNewBookmark}
                effectsEnabled={effects}
              />
            )}
            <div className="flex justify-center items-center gap-3">
              {/* #283: from `lg` the brand lives in the navigation sidebar. */}
              <div className="w-full max-w-md">
                <InputField
                  id="search-input"
                  type="text"
                  icon={<SearchIcon />}
                  placeholder={
                    isAgentConfigured
                      ? t("app.searchPlaceholderAgent")
                      : t("app.searchPlaceholderSetup")
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchInputKeyDown}
                  disabled={!isAgentConfigured || isProcessing}
                  aria-label={t("app.searchAria")}
                  trailing={
                    isProcessing ? (
                      <span className="ui-spinner" aria-hidden="true" />
                    ) : isAgentConfigured ? (
                      // The mockup's AI Ready reading: the provider badge rides the
                      // trailing slot without taking pointer events (the search
                      // itself does the AI ask).
                      <span className="ui-ai-badge" aria-hidden="true">
                        <SparkIcon />
                        {t("app.aiReady")}
                      </span>
                    ) : undefined
                  }
                />
              </div>
            </div>
            {/* #299: the compact filter row — the shell owns rating and sort
                below `lg`, and the select mode is the touch path into the
                selection the bottom bar acts on. */}
            {!isSidebarViewport && (
              <MobileFilterRow
                filters={manualFilters}
                onChange={setManualFilters}
                selectMode={selectMode}
                selectedCount={multiSelectedBookmarkIds.length}
                onToggleSelectMode={() => setSelectMode((on) => !on)}
              />
            )}
            {/* One horizontally scrollable strip: at phone widths the buttons
                used to wrap into five rows and eat the viewport. #294: the
                entries that used to sit here only below `lg` — Add New, the
                folder toggle, Digest and Help — are in the navigation drawer
                now, so the strip is the same at every width. */}
            <div className="bookmarkit-header-actions flex items-center gap-2">
              <Button intent="outlined" onClick={handleImportExportOpen} leadingIcon={<SwapIcon />}>
                {t("app.importExport")}
              </Button>
              <Button
                intent="outlined"
                onClick={handleRemoveDuplicates}
                loading={isAskingAboutDuplicates}
                leadingIcon={<CopiesIcon />}
              >
                {isAskingAboutDuplicates ? t("app.comparing") : t("app.removeDuplicates")}
              </Button>
              <Button
                intent="outlined"
                onClick={sweep.running ? sweep.stop : sweep.start}
                leadingIcon={<HealthIcon />}
              >
                {sweep.running ? t("app.stopCheck") : t("app.checkLinks")}
              </Button>
              {deadLinksInReach > 0 && (
                <Button
                  intent="outlined"
                  onClick={archive.running ? archive.stop : handleRecoverDeadLinks}
                  title={t("app.archiveTooltip")}
                  // Without this the pointer-down clears the selection the button
                  // is about, and the lookup silently widens to the whole view.
                  {...keepsSelectionProps}
                >
                  {archive.running
                    ? t("app.archiveStop", { done: archive.done, total: archive.total })
                    : t("app.findArchived", { count: deadLinksInReach })}
                </Button>
              )}
              {lastAction && (
                <Button intent="outlined" onClick={resetSearch}>
                  {t("app.clearSearch")}
                </Button>
              )}
              {/* #198: pick the list's layout; the choice persists like the
                  other display toggles. */}
              <ViewSelector
                value={viewMode}
                onChange={(mode) => {
                  setListViewMode(mode);
                  setViewMode(mode);
                }}
              />
              <IconButton label={t("app.options")} onClick={() => setIsOptionsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </div>
            {/* One sentence with the two key caps inside it: the template is
                the catalogue's and the caps are the slots' values (t.rich). */}
            <div className="bookmarkit-hint text-center text-xs text-[var(--ui-on-surface-variant)]">
              {t.rich("app.clickHint", {
                shift: <Kbd>Shift</Kbd>,
                e: <Kbd>E</Kbd>,
              })}
            </div>
          </div>
        </div>
      </header>

      <main
        inert={navDrawerOpen || undefined}
        className={`bookmarkit-main flex-1 overflow-hidden flex flex-col transition-all duration-300 ${isHeaderVisible ? "bookmarkit-main--header-visible" : "bookmarkit-main--header-hidden"}`}
        role="main"
      >
        {/* #193: the shelf may run past the old reading-measure caps so the
            list's fit-based columns have room; past 2752px of viewport it
            centers at its 2720px ceiling rather than stretching five cards
            across a 4K screen. The folder pane narrows the list and the list
            itself decides whether that still earns another column. */}
        <div className="relative flex-1 min-h-0 w-full mx-auto px-4 flex gap-4 max-w-none min-[2752px]:max-w-[2720px]">
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            {/* #296: from `lg` the digest is a workspace view beside the
                sidebar, not a modal over the list — the weekly-digest
                mockup's main. The list column (plan bar, sweep bar, bulk
                edit, shelf) is the collection's view and yields the page
                while the week is on screen; leaving is navigation, the way
                it is between any two views. Below `lg` the digest stays the
                sheet, and the list column stays mounted behind it. */}
            {/* #295: the link-health view is the same kind of page — the
                Broken Links row's destination from `lg`, where the mockup
                puts it. Below `lg` the row keeps the filtered list, whose
                dedicated mobile reading is #303's. */}
            {digest && isSidebarViewport ? (
              <WeeklyDigestView
                digest={digest}
                remoteFavicons={remoteFavicons}
                onOpen={openBookmark}
                onShowNeverOpened={showNeverOpened}
                onTriage={triageUntagged}
              />
            ) : linkHealthOpen && isSidebarViewport ? (
              <LinkHealthView
                checkedTotal={sweep.checkedTotal}
                unreachableCount={brokenCount}
                broken={recoverableBroken}
                proposalUrls={proposalUrls}
                needsLookup={lookupOwed}
                sweepRunning={sweep.running}
                sweepChecked={sweep.checked}
                sweepTotal={sweep.total}
                archiveRunning={archive.running}
                archiveDone={archive.done}
                archiveTotal={archive.total}
                applying={isApplyingChanges}
                lastSweepAt={sweep.lastSweepAt}
                onRecheck={sweep.start}
                onStopSweep={sweep.stop}
                onFindSnapshots={handleLinkHealthLookup}
                onStopArchive={archive.stop}
                onApply={handleApplyLinkHealth}
                onEdit={editFromLinkHealth}
                onWayback={handleRowLookup}
                rejectedIds={rejectedRecovery}
                onToggleRejected={toggleRejectedRecovery}
              />
            ) : (
              <>
                {/* Agent plan display */}
                {lastAction && (
                  <div className="mb-4">
                    <AgentPlan steps={lastAction} error={lastAction.action === "error"} />
                  </div>
                )}

                <LinkSweepBar
                  running={sweep.running}
                  checked={sweep.checked}
                  total={sweep.total}
                  brokenCount={brokenCount}
                  brokenOnly={manualFilters.brokenOnly}
                  onStop={sweep.stop}
                  onShowBroken={showBrokenOnly}
                />

                {organizer.running && (
                  <div
                    className="mb-4 p-3 rounded-lg border border-border bg-primary-bg flex items-center gap-3"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="text-sm text-primary-text">
                      {t("app.organizerProgress", { done: organizer.done, total: organizer.total })}
                    </span>
                    <Button type="button" intent="secondary" onClick={organizer.stop}>
                      {t("common.stop")}
                    </Button>
                  </div>
                )}

                {/* #54: Only for a real multi-selection — a single click is served
                by the form. #299: below `lg` the selection's home is the bar
                at the bottom, and "Bulk Edit" opens this editor as the sheet
                (#301); the bar itself becomes that sheet below `lg`. */}
                {multiSelectedBookmarkIds.length > 0 && (isSidebarViewport || bulkEditorOpen) && (
                  <BulkEditBar
                    selected={selectedBookmarks}
                    allBookmarks={bookmarks}
                    onApply={handleBulkEdit}
                    onClearSelection={clearSelectedBookmarks}
                    onDelete={confirmDeleteSelection}
                    onClose={() => setBulkEditorOpen(false)}
                    canAutoTag={canAutoTag}
                    provider={runtimeProvider}
                    providerOptions={providerOptions}
                  />
                )}

                {/* ARCH-10: Empty state + PERF-06: virtualized list — flex-1 fills remaining viewport height */}
                <div className="flex-1 min-h-0 pb-4">
                  <BookmarkList
                    bookmarks={displayedBookmarks}
                    selectedBookmarkId={selectedBookmarkId}
                    multiSelectedBookmarkIds={multiSelectedBookmarkIds}
                    bookmarksToDelete={bookmarksToDelete}
                    onBookmarkClick={handleBookmarkClick}
                    onBookmarkDoubleClick={handleBookmarkDoubleClick}
                    onBookmarkKeyDown={handleBookmarkKeyDown}
                    onBookmarkDragStart={
                      // #55: dragging onto a folder needs the tree on screen — the
                      // rail from `lg`, the drawer below it while it is open.
                      navDrawerOpen || isSidebarViewport ? handleBookmarkDragStart : undefined
                    }
                    isLoading={isLoading}
                    bookmarksTotal={bookmarks.length}
                    searchActive={!!debouncedSearchQuery || hasActiveFilters(effectiveFilters)}
                    lastAction={lastAction}
                    searchQuery={debouncedSearchQuery || debouncedFilterText}
                    onClearSearch={clearAllFilters}
                    onAddNew={handleAddNewBookmark}
                    onImport={handleImportExportOpen}
                    remoteFavicons={remoteFavicons}
                    effectsEnabled={effects}
                    viewMode={viewMode}
                    filters={manualFilters}
                    showSortControls={isSidebarViewport}
                    tagFacets={tagFacets}
                    onFilterChange={setManualFilters}
                    onCycleTag={handleCycleTag}
                    onClearFilters={clearManualFilters}
                    filterSummary={(() => {
                      const shown =
                        displayedBookmarks.length === bookmarks.length
                          ? t("app.summaryTotal", { count: bookmarks.length })
                          : t("app.summaryShown", {
                              shown: displayedBookmarks.length,
                              total: bookmarks.length,
                            });
                      if (multiSelectedBookmarkIds.length > 0)
                        return t("app.summarySelected", {
                          count: multiSelectedBookmarkIds.length,
                          summary: shown,
                        });
                      if (selectedBookmarkId)
                        return t("app.summarySelected", { count: 1, summary: shown });
                      return shown;
                    })()}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* #299: the selection's bar, pinned where a thumb reaches. It sits at
          the root with the header, so no ancestor's transform can re-anchor
          its fixed position, and it takes the drawer's inert like every other
          surface behind the dialog. The ref lands on the band itself — a
          fixed element gives a wrapper no height to measure. */}
      {selectionBarShown && (
        <SelectionBar
          ref={selectionBarRef}
          inert={navDrawerOpen || undefined}
          count={multiSelectedBookmarkIds.length}
          onClear={clearSelectedBookmarks}
          onBulkEdit={() => setBulkEditorOpen(true)}
        />
      )}

      {/* ─── Modals ─── */}
      <ErrorBoundary fallbackMessage={t("app.modalFallbackMessage")}>
        {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} />}
        {isOptionsOpen && (
          <OptionsModal
            provider={runtimeProvider}
            providerOptions={providerOptions}
            onChange={setRuntimeProvider}
            onChangeOptions={updateProviderOptions}
            encryption={encryption}
            onEnableEncryption={enableEncryption}
            onDisableEncryption={disableEncryption}
            onUnlock={unlock}
            currentTheme={currentTheme}
            themes={themes}
            onThemeChange={selectTheme}
            onThemeUpload={(file) => uploadTheme(file, showCustomMessage)}
            remoteFavicons={remoteFavicons}
            onRemoteFaviconsChange={(enabled) => {
              setRemoteFaviconsEnabled(enabled);
              setRemoteFavicons(enabled);
            }}
            effects={effects}
            onEffectsChange={(enabled) => {
              setEffectsEnabled(enabled);
              setEffects(enabled);
            }}
            webMcpEnabled={webMcpEnabled}
            webMcpAvailable={webMcpAvailable}
            onWebMcpEnabledChange={setWebMcpEnabled}
            onClose={() => setIsOptionsOpen(false)}
          />
        )}
        {isMessageModalOpen && (
          <MessageModal
            message={messageModalContent.message}
            type={messageModalContent.type}
            onClose={() => setIsMessageModalOpen(false)}
          />
        )}
        {isModalOpen && (
          <BookmarkForm
            bookmark={editingBookmark}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveBookmark}
            onDelete={handleDeleteBookmark}
            fetchUrlStatus={fetchUrlStatus}
            folders={knownFolders}
            provider={runtimeProvider}
            providerOptions={providerOptions}
          />
        )}
        {isImportExportModalOpen && (
          <ImportExportContent
            bookmarks={bookmarks}
            onClose={handleImportExportClose}
            onImportJson={handleImportJson}
            onImportHtml={handleImportHtml}
            showMessage={showCustomMessage}
          />
        )}
        {isDeleteConfirmModalOpen && (
          <DeleteConfirmModal
            message={t("app.deleteConfirmQuestion", { count: bookmarksToDelete.length })}
            reasons={duplicateReasons}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
            isLoading={isDeleting}
          />
        )}
        {/* #296/#302: below `lg` the digest is the mobile mockup's full-page
            sheet, an overlay over the list exactly as before. From `lg` the
            digest is the workspace view in `main` and mounts there instead. */}
        {digest && !isSidebarViewport && (
          <WeeklyDigestView
            digest={digest}
            onOpen={openBookmark}
            onShowNeverOpened={showNeverOpened}
            onTriage={triageUntagged}
            onEdit={editFromDigest}
            onClose={() => setDigest(null)}
          />
        )}
        {/* #303: below `lg` link health is the mobile mockup's full-page
            sheet, in the digest's arrangement — one flag, one composition per
            viewport. It renders over the list, which stays mounted behind it
            the way the digest's does. */}
        {linkHealthOpen && !isSidebarViewport && (
          <LinkHealthView
            checkedTotal={sweep.checkedTotal}
            unreachableCount={brokenCount}
            broken={recoverableBroken}
            proposalUrls={proposalUrls}
            needsLookup={lookupOwed}
            sweepRunning={sweep.running}
            sweepChecked={sweep.checked}
            sweepTotal={sweep.total}
            archiveRunning={archive.running}
            archiveDone={archive.done}
            archiveTotal={archive.total}
            applying={isApplyingChanges}
            lastSweepAt={sweep.lastSweepAt}
            onRecheck={sweep.start}
            onStopSweep={sweep.stop}
            onFindSnapshots={handleLinkHealthLookup}
            onStopArchive={archive.stop}
            onApply={handleApplyLinkHealth}
            onEdit={editFromLinkHealth}
            onWayback={handleRowLookup}
            rejectedIds={rejectedRecovery}
            onToggleRejected={toggleRejectedRecovery}
            onClose={() => setLinkHealthOpen(false)}
          />
        )}
        {review && (
          <ChangeReviewModal
            rows={review.rows}
            title={review.title}
            onApply={handleApplyReviewed}
            onCancel={() => setReview(null)}
            isApplying={isApplyingChanges}
          />
        )}
      </ErrorBoundary>
    </div>
  );
};

export default BookmarkApp;
