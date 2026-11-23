// English messages for the app shell and the system modals (#284): the change
// review, delete confirmation, message, error boundary, the agent-plan and
// star-rating components, the BookmarkApp bar and the navigation sidebar
// (#283). Merged into the catalogue by en.js.

export const dialogMessages = {
  // ChangeReviewModal
  changeReview: {
    apply: {
      one: "Apply {count} change",
      other: "Apply {count} changes",
    },
    applying: "Applying…",
    archivedTitle: "Review the archived copies",
    clearedFlag: "cleared",
    closeWithoutApplying: "Close without applying",
    defaultTitle: "Review the proposed changes",
    deselectAll: "Deselect all",
    description: {
      one: "Untick anything you disagree with. {count} bookmark would change.",
      other: "Untick anything you disagree with. {count} bookmarks would change.",
    },
    fieldAddress: "Address",
    fieldDescription: "Description",
    fieldFolder: "Folder",
    fieldLinkCheck: "Link check",
    fieldOldBrokenFlag: "Old broken flag",
    fieldTags: "Tags",
    selectAll: "Select all",
    selectionCount: "{accepted} of {total} selected",
    setFlag: "set",
    wasIdle: "not checked",
    wasInvalid: "broken",
    wasValid: "reachable",
  },

  // DeleteConfirmModal — `removed` and `kept` are the two titles (t.rich)
  deleteConfirm: {
    deleting: "Deleting…",
    samePageAs: "{removed} — same page as {kept}",
    title: "Confirm Deletion",
  },

  // MessageModal
  messageModal: {
    error: "Error!",
    info: "Information",
    success: "Success!",
  },

  // ErrorBoundary
  errorBoundary: {
    fallbackMessage: "An unexpected error occurred in this section.",
    reload: "Reload",
    title: "Something went wrong.",
  },

  // AgentPlan, StarRating (the Toast and Banner defaults ride the common
  // surface)
  agentPlan: {
    action: "<strong>Agent Action:</strong> {action}",
    plan: "Agent Plan:",
  },
  starRating: {
    groupLabel: "Rating: {rating} of 5",
    star: {
      one: "{star} star",
      other: "{star} stars",
    },
    starSelected: {
      one: "{star} star (selected — activate to clear)",
      other: "{star} stars (selected — activate to clear)",
    },
  },

  // BookmarkApp
  app: {
    aiReady: "AI Ready",
    alreadyOrganized: "Nothing to change — these bookmarks are already organized.",
    applyFailed: "Failed to apply the changes. Please try again.",
    archiveStop: "Stop ({done}/{total})",
    archiveTooltip: "Ask the Internet Archive for a saved copy of each dead link",
    brandTitle: "BookmarkIt",
    bulkEditFailed: "Failed to update the selected bookmarks. Please try again.",
    checkLinks: "Check Links",
    clearSearch: "Clear Search",
    comparing: "Comparing…",
    deleteConfirmQuestion: "Are you sure you want to delete {count} bookmark(s)?",
    deleteFailed: "Failed to delete bookmark(s). Please try again.",
    deletedCount: "Deleted {count} bookmark(s).",
    digest: "Digest",
    findArchived: "Find Archived Copies ({count})",
    folderChangeFailed: "Failed to move the bookmark(s). Please try again.",
    folders: "Folders",
    // `shift` and `e` are the two key caps (t.rich)
    clickHint: "Click to select, {shift}+click to open, double-click or {e} to edit.",
    help: "Help",
    hideFolders: "Hide Folders",
    htmlParseFailed: "Failed to parse HTML bookmarks.",
    importExport: "Import/Export",
    importNone: "No new bookmarks imported.",
    importProgress: "Importing… {done} / {total}",
    importSkipped: "Skipped {count} duplicate(s).",
    importedCount: "Imported {count} bookmark(s).",
    loadErrorBody: "Nothing has been changed. {error}",
    loadErrorTitle: "Your bookmarks could not be opened",
    loading: "Loading bookmarks...",
    modalFallbackMessage: "A modal encountered an error.",
    movedCount: "Moved {count} bookmark(s).",
    noBookmarksInData: "No bookmarks found in the import data.",
    noBookmarksInHtml: "No bookmarks found in the imported HTML.",
    noDuplicates: "No duplicate bookmarks found in the current view.",
    nothingToReport: "Nothing to report yet — save a few bookmarks first.",
    nothingToSave: "There's nothing to save — search or filter something first.",
    options: "Options",
    organizerProgress: "Reading your bookmarks… {done} of {total}",
    persistFailed: "Failed to persist new order.",
    removeDuplicates: "Remove Duplicates",
    removedFolderCount: "Removed {path} and moved {count} bookmark(s) out of it.",
    renamedFolderCount: "{count} bookmark(s) now in {folder}.",
    reorderedAsc: "Reordered ascending by {field} and saved.",
    reorderedDesc: "Reordered descending by {field} and saved.",
    searchAria: "Natural language search",
    searchPlaceholderAgent: "Type natural language queries (e.g., 'find github')",
    searchPlaceholderSetup: "Set up a provider in Options to search",
    selectToDelete: "Please select bookmark(s) to delete.",
    stopCheck: "Stop Check",
    summarySelected: "{count} selected | {summary}",
    summaryShown: "{shown} of {total} bookmarks",
    summaryTotal: "{count} total bookmarks",
    tryAgain: "Try again",
    unsafeUrl: "This bookmark has an unsupported or unsafe URL and was not opened.",
    updatedCount: "Updated {count} bookmark(s).",
    urlCheckUnavailable: "URL check not available in extension context.",
  },

  // SidebarNav
  sidebar: {
    addBookmark: "Add Bookmark",
    allBookmarks: "All Bookmarks",
    brandTagline: "Local-first",
    brandTitle: "BookmarkIt",
    brokenLinks: "Broken Links",
    digest: "Weekly Digest",
    edit: "Edit",
    folders: "Folders",
    help: "Help and keyboard shortcuts",
    manageFolders: "Manage folders",
    navLabel: "BookmarkIt navigation",
    neverOpened: "Never Opened",
    untagged: "Untagged",
    views: "Views",
    viewsLabel: "Smart views",
  },
};
