import React from "react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NavDrawer, { NAV_DRAWER_ID } from "./NavDrawer.jsx";

// #294: the navigation drawer is the design system's drawer dialog holding the
// navigation rail. Its own behavior is the dialog contract; what it holds is
// SidebarNav's, tested beside that component.

const setup = (props = {}) => {
  const onClose = vi.fn();
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
  render(<NavDrawer onClose={onClose} {...handlers} {...props} />);
  return { onClose };
};

const drawer = () => screen.getByRole("dialog", { name: "BookmarkIt navigation" });

describe("NavDrawer (#294)", () => {
  // Reduced motion: the dialog closes at once instead of after its exit
  // animation, so no test waits on a timer.
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true }))
    );
  });

  it("is a modal dialog the menu button can point at", () => {
    setup();

    expect(drawer()).toHaveAttribute("aria-modal", "true");
    expect(drawer()).toHaveAttribute("id", NAV_DRAWER_ID);
  });

  it("holds the navigation rail, not a second navigation", () => {
    setup();

    expect(screen.getByRole("navigation", { name: "Smart views" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Bookmark" })).toBeInTheDocument();
  });

  it("puts focus on its close control when it opens", () => {
    setup();

    expect(screen.getByRole("button", { name: "Close navigation menu" })).toHaveFocus();
  });

  it("closes from the close control", () => {
    const { onClose } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Close navigation menu" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes from Escape inside the drawer", () => {
    const { onClose } = setup();

    fireEvent.keyDown(drawer(), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes from a press on the scrim, and not from one inside the drawer", () => {
    const { onClose } = setup();

    fireEvent.mouseDown(screen.getByRole("button", { name: "Add Bookmark" }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(drawer().parentElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
