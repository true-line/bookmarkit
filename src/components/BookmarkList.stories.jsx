import BookmarkList from "./BookmarkList.jsx";

const noop = () => undefined;

const bookmarks = [
  {
    id: "github",
    title: "GitHub",
    url: "https://github.com",
    description: "Where the world builds software.",
    rating: 5,
    tags: ["dev", "git", "reference"],
  },
  {
    id: "docs",
    title: "BookmarkIt Design System",
    url: "https://example.com/design-system",
    description: "Components, tokens, and interaction states.",
    rating: 4,
    tags: ["docs", "reference"],
  },
  {
    id: "research",
    title: "Interaction design notes",
    url: "https://example.com/research",
    description: "Notes on compact, keyboard-first bookmark management.",
    rating: 3,
    tags: ["research", "ux"],
  },
];

const meta = {
  title: "BookmarkIt/Application/Bookmark list",
  component: BookmarkList,
  parameters: { layout: "fullscreen" },
  decorators: [
    (_Story) => (
      <div className="mx-auto h-[34rem] max-w-4xl px-4">
        <_Story />
      </div>
    ),
  ],
};

export default meta;

const baseArgs = {
  bookmarks,
  selectedBookmarkId: null,
  multiSelectedBookmarkIds: [],
  bookmarksToDelete: [],
  onBookmarkClick: noop,
  onBookmarkDoubleClick: noop,
  onBookmarkKeyDown: noop,
  isLoading: false,
  bookmarksTotal: bookmarks.length,
  searchActive: false,
  lastAction: null,
  searchQuery: "",
  onClearSearch: noop,
  onAddNew: noop,
  onImport: noop,
  filters: { text: "", minRating: 0, sortBy: "", order: "asc", tags: {} },
  tagFacets: [
    { tag: "dev", count: 2 },
    { tag: "docs", count: 2 },
    { tag: "reference", count: 2 },
    { tag: "research", count: 1 },
  ],
  onFilterChange: noop,
  onCycleTag: noop,
  onClearFilters: noop,
  filterSummary: "3 total bookmarks",
};

export const WithFilters = {
  args: baseArgs,
};

// #198: The other two views at the same width — single keeps one full-width
// row, grid lays the same cards out denser than the flow default.
export const SingleColumn = {
  args: { ...baseArgs, viewMode: "single" },
};

export const GridView = {
  args: { ...baseArgs, viewMode: "grid" },
};

// #288: the card's per-bookmark Edit pencil, and below `lg` the mobile
// mockup's anatomy — the folder chip, # tags, and Unrated where a count
// would sit.
export const CardActions = {
  args: { ...baseArgs, onBookmarkEdit: noop },
};

export const MobileCardAnatomy = {
  args: {
    ...baseArgs,
    onBookmarkEdit: noop,
    isMobileViewport: true,
    bookmarks: [
      { ...bookmarks[0], folderId: "Dev/Tools" },
      { ...bookmarks[1], folderId: "Design systems" },
      { ...bookmarks[2], folderId: "Notes", rating: 0, tags: [] },
    ],
  },
};
