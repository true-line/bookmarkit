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

  // LinkSweepBar — `chip` is the count in its ui-tag chip (t.rich)
  linkSweep: {
    brokenLinks: {
      one: "{chip} link could not be reached.",
      other: "{chip} links could not be reached.",
    },
    checking: "Checking links…",
    progress: "{checked} of {total}",
    showBroken: "Show them",
  },

  // BulkEditBar
  bulkEdit: {
    addTagsAria: "Tags to add, comma separated",
    addTagsPlaceholder: "Add tags…",
    allMatch: "Nothing to change — all {count} already match.",
    alreadyMatch: "({count} already match)",
    apply: "Apply",
    applyTo: "Apply to {count}?",
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
    folderAria: "Folder to move the selection into",
    folderPathPlaceholder: "Folder path…",
    groupAria: {
      one: "Bulk edit {count} selected bookmark",
      other: "Bulk edit {count} selected bookmarks",
    },
    hint: "Tags are added and removed, not replaced.",
    keepFolders: "Keep folders",
    keepRatings: "Keep ratings",
    newFolder: "New folder…",
    newFolderAria: "New folder path",
    noFolder: "No folder",
    ratingAria: "Rating to set",
    removeTagsAria: "Tags to remove, comma separated",
    removeTagsPlaceholder: "Remove tags…",
    selectedCount: "{count} selected",
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
