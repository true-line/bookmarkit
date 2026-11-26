// English messages for the app shell and the system modals (#284): the change
// review, delete confirmation, message, error boundary, the agent-plan and
// star-rating components, the BookmarkApp bar and the navigation sidebar
// (#283), and the messages raised by the app's logic (#307). Merged into the
// catalogue by en.js.

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
    fieldStatusReason: "Last failure",
    fieldTags: "Tags",
    selectAll: "Select all",
    selectionCount: "{accepted} of {total} selected",
    setFlag: "set",
    wasIdle: "not checked",
    wasInvalid: "broken",
    wasValid: "reachable",
  },

  // DeleteConfirmModal
  deleteConfirm: {
    deleting: "Deleting…",
    title: "Confirm Deletion",
  },

  // DuplicateReviewModal — a rule row's headline is a token resolved through
  // HEADLINE_KEYS; an AI row's headline is the model's own phrase. `reason`
  // in keepBadge is the catalogue words for the survivor's metadata, joined.
  duplicateReview: {
    closeWithoutRemoving: "Close without removing",
    description: {
      one: "Both copies of every pair are shown. Untick a pair to keep both; {count} bookmark would be removed.",
      other:
        "Both copies of every pair are shown. Untick a pair to keep both; {count} bookmarks would be removed.",
    },
    deselectAll: "Deselect all pairs",
    exactUrlMatch: "Exact URL match (normalized)",
    keepBadge: "Keep ({reason})",
    keepEarliest: "saved first",
    keepNotes: "has notes",
    keepRating: "has a rating",
    keepTags: "has tags",
    removeBadge: "Remove duplicate",
    removing: "Removing…",
    removeSelected: "Remove selected ({count})",
    rowToggle: "Remove {remove}, keep {keep}",
    sameTitle: "Same title",
    selectAll: "Select all pairs",
    selectionCount: "{selected} of {total} pairs selected",
    sourceAi: "AI proposed",
    sourceRule: "Rule-based",
    title: "Review duplicates",
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
    // The mockup's static radiogroup name; the readout below is the live
    // announcer, and the read-only img label keeps the value in its name.
    groupName: "Bookmark rating",
    readout: "{rating} / 5",
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
    findArchived: "Find Archived Copies ({count})",
    folderChangeFailed: "Failed to move the bookmark(s). Please try again.",
    folders: "Folders",
    // `shift` and `e` are the two key caps (t.rich)
    clickHint: "Click to select, {shift}+click to open, double-click or {e} to edit.",
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
    checkLinks: "Check Links",
    digest: "Weekly Digest",
    edit: "Edit",
    folders: "Folders",
    help: "Help and keyboard shortcuts",
    importExport: "Import / Export",
    manageFolders: "Manage folders",
    navLabel: "BookmarkIt navigation",
    neverOpened: "Never Opened",
    options: "Options",
    removeDuplicates: "Remove Duplicates",
    stopCheck: "Stop Check",
    untagged: "Untagged",
    views: "Views",
    viewsLabel: "Smart views",
  },

  // MobileTopBar, NavDrawer, MobileFilterRow and SelectionBar — the shell
  // below `lg` (#294, #299). The title is the sidebar's own view label
  // (sidebar.*); only the shell's own controls are here. The selection bar's
  // count reuses bulkEdit.selectedCount, whose wording it shares.
  shell: {
    add: "Add",
    bulkEdit: "Bulk Edit",
    clear: "Clear",
    closeNav: "Close navigation menu",
    // The date quick sort's two readings and what each press promises. The
    // label shows the state while the date sort is on; off, the press is a
    // switch to it, so the promise is the sentence.
    newest: "Newest",
    newestAria: "Sorted newest first. Activate to reverse.",
    oldest: "Oldest",
    oldestAria: "Sorted oldest first. Activate to reverse.",
    openNav: "Open navigation menu",
    saved: "{count} saved",
    selectMode: "Select",
    selectModeAria: "Selection mode. Activate to select bookmarks by tapping them.",
    selectionActions: "Selection actions",
    switchToDateAria: "Sort by date, newest first.",
  },

  // #307: messages raised by logic rather than rendered by a component. They
  // reach the page as toasts, banners and form errors, and are read with
  // getMessages() when raised — see src/i18n/index.js.

  // src/llm/errors.js — one per classification rule; the category is the
  // rule's and stays in code, only the sentence is here.
  llmError: {
    apiKey:
      'API key is missing or invalid. Open Options (type "options" in the search bar) to enter your API key.',
    generic: "Could not process your request. Check your LLM provider settings and try again.",
    lmStudioRefused:
      'LM Studio refused the request (HTTP {status}). If you set an API key in Options, check it; otherwise no key is needed — make sure its local server is running with "Enable CORS" turned on in its Developer settings.',
    lmStudioUnreachable:
      "Could not reach LM Studio. Make sure its local server is running and that the server address in Options matches it.",
    network:
      "Could not reach the LLM provider. Check your internet connection and provider settings.",
    noModel:
      'No model is selected. Open Options (type "options" in the search bar) and choose one from the list, or type its id.',
    ollamaRefused:
      "Ollama refused the request (HTTP {status}). If you set an API key in Options, check it; otherwise no key is needed — make sure Ollama is running and that it allows this app's origin: set OLLAMA_ORIGINS (e.g. chrome-extension://*) and restart Ollama.",
    ollamaUnreachable:
      "Could not reach Ollama. Make sure it is running locally and that the server address in Options matches it.",
    parse: "The AI returned an unexpected response. Try rephrasing your query.",
    rateLimit: "Rate limit reached. Please wait a moment before trying again.",
  },

  // useLLMSettings, useAgentEngine, useOrganizer
  llmSettings: {
    encryptFailed: "Couldn't encrypt the API key. Encryption not enabled.",
    encryptSaveFailed: "Couldn't save the encrypted key. Encryption not enabled.",
    encrypted: "API key encrypted. You'll enter this passphrase once per session.",
    // The same sentence for the agent and the organizer: both cannot run until
    // the key is unlocked, and the user should not have to learn two wordings.
    keyLocked:
      "Your API key is encrypted. Open Options and enter your passphrase to unlock it for this session.",
    organizeNeedsProvider: "Organizing needs an LLM provider. Open Options to configure one.",
  },

  // useArchiveRecovery
  archiveRecovery: {
    noDeadLinks: "No dead links here to look up. Try Check Links first.",
    noneFound: "No archived copies found.",
    stoppedEarly: "The archive lookup stopped early. Please try again.",
  },

  // useTheme.uploadTheme. Key names are shown as they are, joined with ", ".
  themeUpload: {
    failed: "Failed to upload theme. Please ensure the file is valid JSON or YAML.",
    invalidColors:
      "Theme contains invalid color values. Use valid CSS colors (e.g., #rrggbb, rgb(), hsl(), named colors).",
    invalidFormat: "Invalid theme format. Expected a JSON object with color properties.",
    missingProperties: "Theme is missing required properties: {properties}",
    tooLarge: "Theme file is too large. Maximum allowed size is 100 KB.",
    unknownProperties:
      "Theme contains unknown properties: {properties}. Only the 7 color properties are allowed.",
    uploaded: 'Theme "{name}" uploaded successfully.',
  },

  // useBookmarkStore
  store: {
    // Two whole sentences rather than one with an optional tail: a detail is
    // either there to show or it is not.
    couldNotOpen: "Could not open your bookmarks. {detail}",
    imported: "Imported {count} bookmarks successfully.",
    notInitialized: "Error: Bookmark store is not initialized. Please reload.",
    staleCopy: "Could not refresh bookmarks, so this is the last loaded copy.",
    staleCopyDetail: "Could not refresh bookmarks, so this is the last loaded copy. {detail}",
  },

  // utils/bookmarkUndo.js — the label of each undo entry, as the toast offers it
  undo: {
    add: "Undo add",
    bulkEdit: "Undo bulk edit ({count})",
    delete: "Undo delete ({count})",
    edit: "Undo edit",
    // useUndoHistory, when an entry's inverse throws
    failed: "{label} failed. Nothing was changed.",
    import: "Undo import ({count})",
    replaceAll: {
      one: "Undo replace all ({count} bookmark)",
      other: "Undo replace all ({count} bookmarks)",
    },
    sort: "Undo sort",
  },
};
