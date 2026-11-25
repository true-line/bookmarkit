// English messages for the bookmark list and its controls (#284): shared
// words, the filter bar, the view selectors, the folder tree, cards, the link
// sweep, bulk edit and the empty shelf. Merged into the catalogue by en.js —
// the surfaces here are the ones the list view renders directly.

export const listMessages = {
  common: {
    addNew: "Add New",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    dismiss: "Dismiss",
    import: "Import",
    noFolder: "no folder",
    none: "none",
    save: "Save",
    stop: "Stop",
    undo: "Undo",
  },

  // FilterBar
  filter: {
    anyRating: "Any rating",
    asc: "Asc",
    barLabel: "Filter bookmarks",
    brokenOnly: "Broken only",
    clear: "Clear filters",
    clearText: "Clear text filter",
    desc: "Desc",
    minRating: "Minimum rating",
    moreTags: "+{count} more",
    neverOpened: "Never opened",
    showFewer: "Show fewer",
    sortBy: "Sort by",
    // the Sort by select's options (utils/manualFilters.js SORT_FIELDS)
    sortDateAdded: "Date added",
    sortDateModified: "Date modified",
    sortDefault: "Default order",
    sortDirectionAsc: "Sort direction: ascending. Activate to reverse.",
    sortDirectionDesc: "Sort direction: descending. Activate to reverse.",
    sortFolder: "Folder",
    sortLastOpened: "Last opened",
    sortRating: "Rating",
    sortTitle: "Title",
    sortUrl: "URL",
    tagChip: {
      one: "Tag {tag}, {count} bookmark, {hint}. Activate to cycle include, exclude, off.",
      other: "Tag {tag}, {count} bookmarks, {hint}. Activate to cycle include, exclude, off.",
    },
    tagHint: {
      exclude: "excluding",
      include: "including",
      off: "not filtered",
    },
    textAria: "Filter bookmarks by text",
    textPlaceholder: "Filter instantly (no AI)…",
    untagged: "Untagged",
  },

  // ViewSelector
  viewSelector: {
    flow: "Flow columns",
    grid: "Grid",
    groupLabel: "Bookmark list view",
    modeAria: "{label} view",
    single: "Single column",
  },

  // SmartViewBar
  smartView: {
    deleteView: "Delete view {name}",
    groupLabel: "Saved views",
    nameAria: "Name for the saved view",
    namePlaceholder: "Name this view…",
    saveCurrent: "Save current view",
    savedViewsCaption: "Saved views",
  },

  // FolderTree
  folderTree: {
    allBookmarks: "All bookmarks",
    collapse: "Collapse {name}",
    countTitle: "{count} directly in this folder",
    deleteConfirm: {
      one: "Move {count} bookmark to {folder} and remove this folder?",
      other: "Move {count} bookmarks to {folder} and remove this folder?",
    },
    expand: "Expand {name}",
    keep: "Keep",
    noFolder: "No folder",
    remove: "Remove",
    removeFolder: "Remove folder {path}",
    rename: "Rename {path}",
    treeLabel: "Folders",
  },

  // BookmarkCard
  bookmarkCard: {
    rating: "Rated {rating} out of 5 stars",
    unreachable: "URL could not be reached",
  },

  // BookmarkList
  bookmarkList: {
    listLabel: "Bookmarks",
  },

  // LinkSweepBar — `chip` is the count in its ui-tag chip (t.rich) — and the
  // sweep itself (useLinkSweep, #307)
  linkSweep: {
    allCheckedRecently: "Every link has been checked recently.",
    brokenLinks: {
      one: "{chip} link could not be reached.",
      other: "{chip} links could not be reached.",
    },
    checking: "Checking links…",
    progress: "{checked} of {total}",
    showBroken: "Show them",
    stoppedEarly: "The link check stopped early. Please try again.",
  },

  // BulkEditBar
  bulkEdit: {
    addTagsLabel: "Add tags",
    addTagsPlaceholder: "Add tags…",
    allMatch: "Nothing to change — all {count} already match.",
    alreadyMatch: "({count} already match)",
    apply: "Apply",
    applyChanges: "Apply Changes",
    applyTo: "Apply to {count}?",
    autoTag: "Auto-Tag",
    autoTagAria: "Suggest tags for the selection using AI",
    autoTagFailed: "Could not suggest tags. Check your LLM settings.",
    backAria: "Back to bookmarks",
    clearRating: "Clear rating",
    clearSelection: "Clear selection",
    // describeBulkEdit's sentence: one phrase per change, then the summary
    describe: {
      addTags: "add {tags}",
      clearRating: "clear rating",
      moveTo: "move to {folder}",
      moveToNoFolder: "move to no folder",
      removeTags: "remove {tags}",
      rate: "rate {rating}",
      summary: {
        one: "{changes} — {count} bookmark",
        other: "{changes} — {count} bookmarks",
      },
    },
    dangerNote: {
      one: "Permanently delete 1 selected bookmark from this browser.",
      other: "Permanently delete all {count} selected bookmarks from this browser.",
    },
    dangerTitle: "Danger Zone",
    deleteBookmarks: {
      one: "Delete 1 Bookmark",
      other: "Delete {count} Bookmarks",
    },
    deleteCount: "Delete {count}",
    folderLabel: "Move to folder",
    folderPathPlaceholder: "Folder path…",
    folderSectionTitle: "Folder",
    groupAria: {
      one: "Bulk edit {count} selected bookmark",
      other: "Bulk edit {count} selected bookmarks",
    },
    hint: "Tags are added and removed, not replaced.",
    keepFolders: "Keep folders",
    keepRatings: "Keep ratings",
    newFolder: "New folder…",
    newFolderLabel: "New folder path",
    noFolder: "No folder",
    previewMore: "+{count} more",
    previewOf: "{selected} of {total}",
    previewTitle: "Selected items",
    ratingLabel: "Set rating",
    removeTagsLabel: "Remove tags",
    removeTagsPlaceholder: "Remove tags…",
    selectedCount: "{count} selected",
    stars: {
      one: "{count} star",
      other: "{count} stars",
    },
    tagsSectionTitle: "Tags",
    undoNote: "Reverts in one undo.",
  },

  // EmptyShelf
  emptyShelf: {
    clearSearch: "Clear search",
    emptyDescription: "Add your first bookmark, or import a browser export.",
    emptyTitle: "Your shelf is empty.",
    noMatchQuery: 'No bookmarks match "{query}".',
    noMatchRequest: "No bookmarks match your request.",
    noMatchSearch: "No bookmarks match your search.",
  },
};
