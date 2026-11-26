import FolderTree from "./FolderTree.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// The folder tree is migrated to the unified design system (#249), so its
// stories render under the same [data-ui-theme] scope root the app gets from
// the theme bridge. Flip the UI theme and Direction toolbars for the light,
// dark and RTL checks — the tree is the app's deepest RTL surface (indent,
// counts and the delete confirmation all mirror). The stories pin the pane's
// reading, the sidebar's no-root reading, and the read-only tree.

const noop = () => undefined;

const bookmarks = [
  {
    id: "rust-book",
    title: "The Rust Programming Language",
    url: "https://doc.rust-lang.org/book/",
    folderId: "Programming/Rust",
    tags: ["rust", "docs"],
    rating: 5,
  },
  {
    id: "clippy",
    title: "Clippy Documentation",
    url: "https://doc.rust-lang.org/clippy/",
    folderId: "Programming/Rust",
    tags: ["rust"],
  },
  {
    id: "ts-handbook",
    title: "TypeScript Handbook",
    url: "https://www.typescriptlang.org/docs/handbook/",
    folderId: "Programming/TypeScript",
    tags: ["docs"],
    rating: 4,
  },
  {
    id: "starter",
    title: "Sourdough starter guide",
    url: "https://example.com/starter",
    folderId: "Cooking",
    tags: ["cooking"],
  },
  {
    id: "unfiled",
    title: "Reading list — to file",
    url: "https://example.com/later",
    folderId: "",
    tags: [],
  },
];

const meta = {
  title: "BookmarkIt/Application/Folder tree",
  component: FolderTree,
  decorators: [UiScope],
  parameters: { layout: "fullscreen" },
  args: {
    bookmarks,
    activeFolder: "",
    onSelect: noop,
    onMoveBookmarks: noop,
    onMoveFolder: noop,
    onRenameFolder: noop,
    onDeleteFolder: noop,
  },
};

export default meta;

export const InThePane = {
  args: { className: "ui-sidebar-folders" },
};

export const InTheSidebar = {
  // The sidebar's reading (#283): no "All bookmarks" root row, the "No
  // folder" row kept as the root's drop target.
  args: { className: "ui-sidebar-folders", showRoot: false, alwaysShowUnfiled: true },
};

export const ReadOnly = {
  args: { className: "ui-sidebar-folders", manageable: false, activeFolder: "Programming/Rust" },
};
