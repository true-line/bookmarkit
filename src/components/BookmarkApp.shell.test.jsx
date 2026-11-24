import React from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import BookmarkApp from "./BookmarkApp.jsx";
import { installFakeChromeBookmarks } from "../test/fakeChromeBookmarks.js";

// #294: the shell below `lg`, wired into the app. The pieces are tested beside
// their components (MobileTopBar, NavDrawer); this is the app's wiring of them:
// which chrome exists below the breakpoint, and what opening the drawer does to
// the rest of the page. The store is the in-memory fake Chrome bookmarks API.

// jsdom has no matchMedia. This stands for the viewport, which a test can move
// across `lg` after the first render the way resizing a window would.
const installViewport = () => {
  const state = { matches: false };
  const listeners = new Set();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      query,
      get matches() {
        return state.matches;
      },
      addEventListener: (type, listener) => listeners.add(listener),
      removeEventListener: (type, listener) => listeners.delete(listener),
    })),
  });
  return {
    resizeTo(matches) {
      state.matches = matches;
      listeners.forEach((listener) => listener({ matches }));
    },
  };
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

const openDrawer = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
  return screen.findByRole("dialog", { name: "BookmarkIt navigation" });
};

describe("BookmarkApp's shell below `lg` (#294)", () => {
  it("carries the top bar, and none of the chrome the drawer replaced", async () => {
    installViewport();

    const bar = within(await renderShell());

    expect(bar.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
    expect(bar.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(bar.getByText("All Bookmarks")).toBeInTheDocument();
    expect(bar.queryByRole("button", { name: "Add New" })).toBeNull();
    expect(bar.queryByRole("button", { name: /Folders/ })).toBeNull();
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("has neither the top bar nor a menu button from `lg`, where the rail is", async () => {
    const viewport = installViewport();
    viewport.resizeTo(true);

    const bar = within(await renderShell());

    expect(bar.queryByRole("button", { name: "Open navigation menu" })).toBeNull();
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  it("opens the navigation drawer and makes the rest of the page inert", async () => {
    installViewport();
    await renderShell();

    const drawer = await openDrawer();
    expect(within(drawer).getByRole("navigation", { name: "Smart views" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveAttribute("inert");
    expect(screen.getByRole("main")).toHaveAttribute("inert");

    fireEvent.keyDown(drawer, { key: "Escape" });

    // Escape runs the drawer's exit animation first, like every dialog's.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("banner")).not.toHaveAttribute("inert");
  });

  it("gives the page back when the window grows past `lg` with the drawer open", async () => {
    const viewport = installViewport();
    await renderShell();
    await openDrawer();

    act(() => viewport.resizeTo(true));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("complementary")).toBeInTheDocument();
    expect(screen.getByRole("banner")).not.toHaveAttribute("inert");
    expect(screen.getByRole("main")).not.toHaveAttribute("inert");

    // The drawer does not come back when the window narrows again.
    act(() => viewport.resizeTo(false));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("banner")).not.toHaveAttribute("inert");
  });
});
