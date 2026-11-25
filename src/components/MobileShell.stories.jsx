import React, { useState } from "react";
import MobileTopBar from "./MobileTopBar.jsx";
import MobileFilterRow from "./MobileFilterRow.jsx";
import NavDrawer from "./NavDrawer.jsx";
import { EMPTY_FILTERS } from "../utils/manualFilters.js";

// #294: the shell below `lg`, on its own so it can be looked at by itself. The
// stories are meant for a phone-width viewport: the top bar ends at `lg`, and
// the drawer is what the top bar's menu button opens. #299 adds the compact
// filter row that sits under the search bar in the same shell.

const noop = () => undefined;
const DAY = 24 * 60 * 60 * 1000;
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
    id: "subgrid",
    title: "CSS Grid Subgrid Layout Patterns",
    url: "https://csspatterns.dev/subgrid-cards",
    tags: [],
    createdAt: daysAgo(40),
  },
];

const themed = (_Story, context) => (
  <div
    className="ui-root h-screen flex flex-col bg-[var(--ui-surface)]"
    data-ui-theme={context.globals.uiTheme || "light"}
    dir={context.globals.direction || "ltr"}
  >
    {_Story()}
  </div>
);

const meta = {
  title: "BookmarkIt/Application/Mobile shell",
  decorators: [themed],
  parameters: { layout: "fullscreen" },
};

export default meta;

export const TopBar = {
  render: () => (
    <header className="border-b border-[var(--ui-outline-variant)] p-4">
      <MobileTopBar title="All Bookmarks" savedCount={2089} onOpenNav={noop} onAdd={noop} />
    </header>
  ),
};

// Local state so the quick sort and the select mode can be pressed in place.
function FilterRowDemo() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectMode, setSelectMode] = useState(false);
  return (
    <MobileFilterRow
      filters={filters}
      onChange={setFilters}
      selectMode={selectMode}
      selectedCount={selectMode ? 2 : 0}
      onToggleSelectMode={() => setSelectMode((on) => !on)}
    />
  );
}

export const FilterRow = {
  render: () => (
    <header className="border-b border-[var(--ui-outline-variant)] p-4">
      <FilterRowDemo />
    </header>
  ),
};

export const Drawer = {
  render: () => (
    <>
      <header className="border-b border-[var(--ui-outline-variant)] p-4">
        <MobileTopBar title="All Bookmarks" savedCount={2089} onOpenNav={noop} onAdd={noop} />
      </header>
      <NavDrawer
        onClose={noop}
        onHelp={noop}
        onAddBookmark={noop}
        onSmartView={noop}
        onApplyView={noop}
        onSaveView={noop}
        onForgetView={noop}
        onSelectFolder={noop}
        onMoveBookmarks={noop}
        onMoveFolder={noop}
        onRenameFolder={noop}
        onDeleteFolder={noop}
        bookmarks={bookmarks}
        currentView="all"
        brokenCount={7}
        activeFolder=""
      />
    </>
  ),
};
