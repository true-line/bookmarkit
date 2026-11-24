import React from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import BookmarkApp from "./BookmarkApp.jsx";
import { installFakeChromeBookmarks } from "../test/fakeChromeBookmarks.js";

// #294: the shell below `lg`, wired into the app. The pieces are tested beside
// their components (MobileTopBar, NavDrawer); this is the app's wiring of them:
// which chrome exists below the breakpoint, and what opening the drawer does to
// the rest of the page. The store is the in-memory fake Chrome bookmarks API.

// jsdom has no matchMedia; `matches` stands for the viewport being `lg` up.
const installMatchMedia = (matches) => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query) => ({ query, matches })),
  });
};

beforeEach(() => {
  installFakeChromeBookmarks();
  // The header reports its height through one; jsdom has none to report to.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  delete window.matchMedia;
});

// The store opens asynchronously, so a test waits for the shell to come up.
const renderShell = async () => {
  render(<BookmarkApp />);
  return screen.findByRole("banner");
};

describe("BookmarkApp's shell below `lg` (#294)", () => {
  it("carries the top bar, and none of the chrome the drawer replaced", async () => {
    installMatchMedia(false);

    const bar = within(await renderShell());

    expect(bar.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
    expect(bar.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(bar.getByText("All Bookmarks")).toBeInTheDocument();
    expect(bar.queryByRole("button", { name: "Add New" })).toBeNull();
    expect(bar.queryByRole("button", { name: /Folders/ })).toBeNull();
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("has neither the top bar nor a menu button from `lg`, where the rail is", async () => {
    installMatchMedia(true);

    const bar = within(await renderShell());

    expect(bar.queryByRole("button", { name: "Open navigation menu" })).toBeNull();
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  it("opens the navigation drawer and makes the rest of the page inert", async () => {
    installMatchMedia(false);
    await renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));

    const drawer = screen.getByRole("dialog", { name: "BookmarkIt navigation" });
    expect(within(drawer).getByRole("navigation", { name: "Smart views" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveAttribute("inert");
    expect(screen.getByRole("main")).toHaveAttribute("inert");

    fireEvent.keyDown(drawer, { key: "Escape" });

    // Escape runs the drawer's exit animation first, like every dialog's.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("banner")).not.toHaveAttribute("inert");
  });
});
