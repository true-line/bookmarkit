import BulkEditBar from "./BulkEditBar.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// The bulk-edit bar is migrated to the unified design system (#250), so its
// stories render under the same [data-ui-theme] scope root the app gets from
// the theme bridge. Flip the UI theme and Direction toolbars for the light,
// dark and RTL checks. On a desktop canvas the bar renders inline (below `lg`
// it renders the full-page sheet instead, BulkEditSheet). One story arms
// Auto-Tag (#301) with a keyless local provider — the story never calls it.

const noop = () => undefined;

const selected = [
  {
    id: "rust-book",
    title: "The Rust Programming Language",
    url: "https://doc.rust-lang.org/book/",
    tags: ["rust", "docs"],
    rating: 5,
    folderId: "Programming/Rust",
  },
  {
    id: "clippy",
    title: "Clippy Documentation",
    url: "https://doc.rust-lang.org/clippy/",
    tags: ["rust"],
    rating: 4,
    folderId: "Programming/Rust",
  },
  {
    id: "ts-handbook",
    title: "TypeScript Handbook",
    url: "https://www.typescriptlang.org/docs/handbook/",
    tags: ["docs"],
    rating: 4,
    folderId: "Programming/TypeScript",
  },
];

const meta = {
  title: "BookmarkIt/Application/Bulk edit",
  component: BulkEditBar,
  decorators: [UiScope],
  parameters: { layout: "fullscreen" },
  args: {
    selected,
    allBookmarks: selected,
    onApply: noop,
    onClearSelection: noop,
    onDelete: noop,
  },
};

export default meta;

export const WithSelection = {};

export const AutoTagArmed = {
  args: { canAutoTag: true, provider: "ollama", providerOptions: { apiKey: "" } },
};
