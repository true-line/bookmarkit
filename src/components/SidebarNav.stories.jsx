import React from "react";
import SidebarNav from "./SidebarNav.jsx";

const noop = () => undefined;
const DAY = 24 * 60 * 60 * 1000;
// Dates hang off the real clock: the rail counts the week's arrivals as it renders.
const daysAgo = (days) => new Date(Date.now() - days * DAY).toISOString();
const OPENED = "2026-01-01T00:00:00.000Z";

const bookmarks = [
  {
    id: "context7",
    title: "Context7 — Up-to-date documentation for LLMs",
    url: "https://context7.com/",
    tags: ["llm", "docs"],
    rating: 5,
    folderId: "AI & Agents",
    createdAt: daysAgo(2),
    lastOpenedAt: OPENED,
  },
  {
    id: "kitty",
    title: "Frequently Asked Questions — kitty",
    url: "https://sw.kovidgoyal.net/kitty/faq/",
    tags: ["terminal"],
    rating: 4,
    folderId: "Terminal & CLI",
    createdAt: daysAgo(30),
  },
  {
    id: "ghostty",
    title: "macOS Login Shells — Ghostty Help",
    url: "https://ghostty.org/docs/help/macos-login-shells",
    tags: [],
    folderId: "Terminal & CLI",
    createdAt: daysAgo(12),
    lastOpenedAt: OPENED,
  },
  {
    id: "subgrid",
    title: "CSS Grid Subgrid Layout Patterns",
    url: "https://csspatterns.dev/subgrid-cards",
    tags: [],
    createdAt: daysAgo(40),
  },
];

const meta = {
  title: "BookmarkIt/Application/Navigation sidebar",
  component: SidebarNav,
  parameters: { layout: "fullscreen" },
  // Under the theme root the app's `useTheme` stamps, with the rail beside a
  // stand-in workspace the way the shell places it.
  decorators: [
    (_Story, context) => (
      <div
        className="ui-root flex h-screen gap-4 p-4"
        data-ui-theme={context.globals.uiTheme || "light"}
        dir={context.globals.direction || "ltr"}
      >
        <_Story />
        <div className="flex flex-1 items-center justify-center text-[var(--ui-on-surface-variant)]">
          Workspace
        </div>
      </div>
    ),
  ],
};

export default meta;

const baseArgs = {
  className: "ui-sidebar--standalone",
  bookmarks,
  brokenCount: 2,
  currentView: "all",
  activeFolder: "",
  views: [{ id: "v1", name: "Five-star reference", plan: [], filters: { minRating: 5 } }],
  activeSavedViewId: null,
  canSaveView: false,
  onHelp: noop,
  onAddBookmark: noop,
  onSmartView: noop,
  onApplyView: noop,
  onSaveView: noop,
  onForgetView: noop,
  onSelectFolder: noop,
  onMoveBookmarks: noop,
  onMoveFolder: noop,
  onRenameFolder: noop,
  onDeleteFolder: noop,
  // #297: the maintenance footer, wired to no-ops like the rest of the rail.
  onCheckLinks: noop,
  onRemoveDuplicates: noop,
  onImportExport: noop,
  onOptions: noop,
};

export const Default = {
  args: baseArgs,
};

export const OnASmartView = {
  args: { ...baseArgs, currentView: "brokenLinks" },
};

export const InAFolder = {
  args: { ...baseArgs, activeFolder: "Terminal & CLI" },
};

export const SavingAView = {
  args: { ...baseArgs, canSaveView: true, activeSavedViewId: "v1" },
};
