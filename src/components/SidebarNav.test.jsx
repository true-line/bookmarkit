import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SidebarNav from "./SidebarNav.jsx";
import { viewCounts } from "../utils/smartViewCounts.js";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-11-23T12:00:00.000Z");
const OPENED = "2026-01-01T00:00:00.000Z";
const daysBefore = (now, days) => new Date(now - days * DAY).toISOString();
const at = (now, days, extra = {}) => ({
  title: "A bookmark",
  url: "https://example.test/",
  createdAt: daysBefore(now, days),
  ...extra,
});

// Dates hang off the real clock: the rail counts the week's arrivals as it
// renders.
const bookmarks = [
  at(Date.now(), 2, { id: "new", tags: ["x"], lastOpenedAt: OPENED }),
  at(Date.now(), 1, { id: "fresh", tags: [] }),
  at(Date.now(), 60, { id: "stale", tags: ["y"] }),
  at(Date.now(), 30, { id: "filed", tags: [], lastOpenedAt: OPENED, folderId: "Work" }),
];

const setup = (props = {}) => {
  const handlers = {
    onHelp: vi.fn(),
    onAddBookmark: vi.fn(),
    onSmartView: vi.fn(),
    onApplyView: vi.fn(),
    onSaveView: vi.fn().mockReturnValue(true),
    onForgetView: vi.fn(),
    onSelectFolder: vi.fn(),
    onMoveBookmarks: vi.fn(),
    onMoveFolder: vi.fn(),
    onRenameFolder: vi.fn(),
    onDeleteFolder: vi.fn(),
  };
  render(<SidebarNav bookmarks={bookmarks} brokenCount={3} {...handlers} {...props} />);
  return handlers;
};

const smartViews = () => within(screen.getByRole("navigation", { name: "Smart views" }));

describe("viewCounts (#283)", () => {
  it("counts each view over the whole collection", () => {
    const list = [
      at(NOW, 1, { tags: ["x"], lastOpenedAt: OPENED }),
      at(NOW, 2, { tags: [] }),
      at(NOW, 40, { tags: ["y"] }),
      at(NOW, 40, { tags: [], lastOpenedAt: OPENED }),
    ];

    expect(viewCounts(list, 3, NOW)).toEqual({
      all: 4,
      digest: 2,
      neverOpened: 2,
      untagged: 2,
      brokenLinks: 3,
    });
  });
});

describe("SidebarNav (#283)", () => {
  it("is a named landmark holding the brand, help and the primary action", () => {
    const { onHelp, onAddBookmark } = setup();
    const rail = screen.getByRole("complementary", { name: "BookmarkIt navigation" });

    expect(within(rail).getByText("BookmarkIt")).toBeInTheDocument();
    expect(within(rail).getByText("Local-first")).toBeInTheDocument();

    fireEvent.click(within(rail).getByRole("button", { name: "Help and keyboard shortcuts" }));
    expect(onHelp).toHaveBeenCalledOnce();
    fireEvent.click(within(rail).getByRole("button", { name: "Add Bookmark" }));
    expect(onAddBookmark).toHaveBeenCalledOnce();
  });

  it("lists every smart view as a row with its count", () => {
    setup();
    const views = smartViews();

    expect(views.getByRole("button", { name: /^All Bookmarks/ })).toHaveTextContent(
      /All Bookmarks\s*4/
    );
    expect(views.getByRole("button", { name: /^Weekly Digest/ })).toHaveTextContent(
      /Weekly Digest\s*2/
    );
    expect(views.getByRole("button", { name: /^Never Opened/ })).toHaveTextContent(
      /Never Opened\s*2/
    );
    expect(views.getByRole("button", { name: /^Untagged/ })).toHaveTextContent(/Untagged\s*2/);
    expect(views.getByRole("button", { name: /^Broken Links/ })).toHaveTextContent(
      /Broken Links\s*3/
    );
  });

  it("keeps every row a plain button, so the rail is one tab stop per row", () => {
    setup();

    expect(smartViews().getAllByRole("button")).toHaveLength(5);
    for (const row of smartViews().getAllByRole("button")) {
      expect(row).toHaveAttribute("type", "button");
    }
  });

  it("marks the view on screen with aria-current and nothing else", () => {
    setup({ currentView: "untagged" });
    const views = smartViews();

    expect(views.getByRole("button", { name: /^Untagged/ })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(views.getAllByRole("button").filter((row) => row.hasAttribute("aria-current"))).toEqual([
      views.getByRole("button", { name: /^Untagged/ }),
    ]);
  });

  it("carries no current row when no view is on screen", () => {
    setup();

    expect(smartViews().queryByRole("button", { current: "page" })).not.toBeInTheDocument();
  });

  it("chooses a view when its row is activated", () => {
    const { onSmartView } = setup();
    const views = smartViews();

    fireEvent.click(views.getByRole("button", { name: /^Never Opened/ }));
    expect(onSmartView).toHaveBeenLastCalledWith("neverOpened");
    fireEvent.click(views.getByRole("button", { name: /^Broken Links/ }));
    expect(onSmartView).toHaveBeenLastCalledWith("brokenLinks");
    fireEvent.click(views.getByRole("button", { name: /^Weekly Digest/ }));
    expect(onSmartView).toHaveBeenLastCalledWith("digest");
    expect(onSmartView).toHaveBeenCalledTimes(3);
  });

  it("tells assistive technology the digest is still building", () => {
    setup({ digestBusy: true });

    expect(smartViews().getByRole("button", { name: /^Weekly Digest/ })).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });

  it("stacks the saved views under the smart views", () => {
    const views = [{ id: "v1", name: "Reading list", plan: [], filters: {} }];
    const { onApplyView } = setup({ views, canSaveView: true });
    const saved = within(screen.getByRole("group", { name: "Saved views" }));

    expect(saved.getByText("Saved views")).toBeInTheDocument();
    expect(saved.getByRole("button", { name: "Save current view" })).toBeInTheDocument();
    fireEvent.click(saved.getByRole("button", { name: "Reading list" }));
    expect(onApplyView).toHaveBeenCalledWith(views[0]);
  });

  it("forgets a saved view from its delete button", () => {
    // The bar calls its own prop, onForget; the rail's handler goes in under
    // that name or the button throws on a missing function.
    const views = [{ id: "v1", name: "Reading list", plan: [], filters: {} }];
    const { onForgetView } = setup({ views, canSaveView: true });

    fireEvent.click(screen.getByRole("button", { name: "Delete view Reading list" }));
    expect(onForgetView).toHaveBeenCalledWith("v1");
  });

  it("shows no saved-views section while there is nothing saved or to save", () => {
    setup();

    expect(screen.queryByRole("group", { name: "Saved views" })).not.toBeInTheDocument();
  });

  it("shows the folders without the tree's own root row", () => {
    setup();
    const folders = screen.getByRole("navigation", { name: "Folders" });

    expect(within(folders).getByRole("button", { name: "Work" })).toBeInTheDocument();
    // The All Bookmarks view above the tree is its root here.
    expect(screen.queryByRole("button", { name: "All bookmarks" })).not.toBeInTheDocument();
  });

  it("keeps No folder as the root's drop target even when everything is filed", () => {
    setup({ bookmarks: [bookmarks[3], { ...bookmarks[0], folderId: "Work" }] });

    const folders = screen.getByRole("navigation", { name: "Folders" });
    const unfiled = within(folders).getByRole("button", { name: "No folder" });
    // The count is the row's, beside the button.
    expect(unfiled.parentElement).toHaveTextContent(/No folder\s*0/);
  });

  it("keeps the folder rows bare until Manage folders is switched on", () => {
    setup();
    const manage = screen.getByRole("button", { name: "Manage folders" });

    expect(manage).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "Rename Work" })).not.toBeInTheDocument();

    fireEvent.click(manage);
    expect(manage).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Rename Work" }));
    expect(screen.getByRole("textbox", { name: "Rename Work" })).toBeInTheDocument();

    fireEvent.click(manage);
    expect(manage).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "Rename Work" })).not.toBeInTheDocument();
  });

  it("files the collection from the folder rows", () => {
    const { onSelectFolder } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Work" }));
    expect(onSelectFolder).toHaveBeenCalledWith("Work");
  });
});
