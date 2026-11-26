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

let fakeStore;
// Every observer the app builds while a test runs, with the element it was
// given: the height plumbing fires them by hand, the way a browser does
// after layout.
let observers;

beforeEach(() => {
  fakeStore = installFakeChromeBookmarks();
  observers = [];
  // The header reports its height through one; jsdom has none to report to.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(cb) {
        this.cb = cb;
        observers.push(this);
      }
      observe(el) {
        this.observed = el;
      }
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

// One card on the shelf, so the selection gestures have something to land on.
// The store reads the collection out of its own `bookmarkit` folder.
const seedBookmark = async () => {
  const folder = await fakeStore.bookmarks.create({ parentId: "1", title: "bookmarkit" });
  return fakeStore.bookmarks.create({
    parentId: folder.id,
    title: "Context7 — Up-to-date documentation for LLMs",
    url: "https://context7.com/",
  });
};

// #288: the card now carries an Edit control whose name is "Edit <title>
// bookmark", so the card's own name (which starts with the title) needs the
// anchor to stay the only match.
const card = () => screen.getByRole("button", { name: /^Context7/ });

// Select mode on, one tap: the shortest path from the shell to a set.
const buildSelectionBelowLg = async () => {
  await seedBookmark();
  await renderShell();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Selection mode. Activate to select bookmarks by tapping them.",
    })
  );
  fireEvent.click(card());
  return screen.findByRole("region", { name: "Selection actions" });
};

describe("BookmarkApp's shell below `lg` (#294)", () => {
  it("carries the top bar, and none of the chrome the drawer replaced", async () => {
    installViewport();

    const bar = within(await renderShell());

    expect(bar.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument();
    expect(bar.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(bar.getByText("All Bookmarks")).toBeInTheDocument();
    expect(bar.queryByRole("button", { name: "Add First Bookmark" })).toBeNull();
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

describe("BookmarkApp's selection surfaces (#299)", () => {
  it("lets select mode build a set by tapping, and pins the bar for it", async () => {
    installViewport();
    const bar = await buildSelectionBelowLg();

    expect(bar).toHaveTextContent("1 selected");

    // Bulk Edit opens the full-page sheet (#301) — the selection stays
    // behind it, the bar hidden under it.
    fireEvent.click(screen.getByRole("button", { name: /Bulk Edit/ }));
    expect(screen.getByRole("dialog", { name: "Bulk Edit" })).toBeInTheDocument();

    // Open, the sheet owns the keyboard: the list's shortcuts are suspended,
    // so `d` cannot stage a deletion behind it (#301).
    fireEvent.keyDown(window, { key: "d" });
    expect(screen.getByRole("dialog", { name: "Bulk Edit" })).toBeInTheDocument();

    // Backing out returns to the bar with the selection intact.
    fireEvent.click(screen.getByRole("button", { name: "Back to bookmarks" }));
    expect(screen.queryByRole("dialog", { name: "Bulk Edit" })).toBeNull();
    expect(screen.getByRole("region", { name: "Selection actions" })).toBeInTheDocument();

    // Clear takes the set, the sheet's door and the bar away together.
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Selection actions" })).toBeNull()
    );
    expect(screen.queryByRole("dialog", { name: "Bulk Edit" })).toBeNull();
  });

  it("keeps the inline editor alone past `lg`, and mounts no bar", async () => {
    const viewport = installViewport();
    viewport.resizeTo(true);
    await seedBookmark();
    await renderShell();

    fireEvent.click(card(), { ctrlKey: true });

    expect(
      screen.getByRole("group", { name: /Bulk edit 1 selected bookmark/ })
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Selection actions" })).toBeNull();
  });

  it("leaves select mode behind past `lg`, with the rest of the shell", async () => {
    const viewport = installViewport();
    await buildSelectionBelowLg();

    act(() => viewport.resizeTo(true));

    // Growing the window does not clear the set — the bar would only hide —
    // but the editor is back on its own and the mode is off.
    expect(
      screen.getByRole("group", { name: /Bulk edit 1 selected bookmark/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Selection mode. Activate to select bookmarks by tapping them.",
      })
    ).toBeNull();
    expect(screen.queryByRole("region", { name: "Selection actions" })).toBeNull();

    // And a plain click is a plain click again: it selects, not toggles.
    fireEvent.click(card());
    expect(screen.queryByRole("group", { name: /Bulk edit/ })).toBeNull();
  });

  it("goes inert behind the drawer with every other surface", async () => {
    installViewport();
    const bar = await buildSelectionBelowLg();
    await openDrawer();

    expect(bar).toHaveAttribute("inert");
  });

  // #311 review: the band is the fixed element, so it is the one to measure —
  // a wrapper around it has no layout height to read, and the padding would
  // stay 0px with the last row still under the band.
  it("measures the fixed band itself into the main area's padding", async () => {
    installViewport();
    const bar = await buildSelectionBelowLg();

    const observer = observers.find((candidate) => candidate.observed === bar);
    expect(observer).toBeDefined();

    Object.defineProperty(bar, "offsetHeight", { configurable: true, value: 68 });
    observer.cb();

    expect(document.documentElement.style.getPropertyValue("--app-selectionbar-height")).toBe(
      "68px"
    );
  });
});

// #296: the digest is a workspace view beside the rail from `lg` up, and
// navigation owns leaving it. The review fix pins the two paths a stuck
// digest would strand: another smart view and a folder — a digest of
// additions alone has neither header exit, so without these the rail's
// Weekly Digest row stays highlighted over a list that moved on.
describe("BookmarkApp's weekly digest view (#296)", () => {
  const seedDigestFixture = async () => {
    // The store adopts a bar folder titled "bookmarkit" as its root (the
    // selection tests' seed relies on the same title match), so a folder
    // inside it is a real tree row for the rail, and the composite store
    // stamps the fresh bookmark's createdAt — arrived this week.
    const root = await fakeStore.bookmarks.create({ parentId: "1", title: "bookmarkit" });
    const folder = await fakeStore.bookmarks.create({ parentId: root.id, title: "Deep reads" });
    await fakeStore.bookmarks.create({
      parentId: folder.id,
      title: "Fresh read",
      url: "https://example.com/fresh",
    });
    return folder;
  };

  const openDigestView = async () => {
    fireEvent.click(screen.getByRole("button", { name: /Weekly Digest/ }));
    return screen.findByRole("heading", { name: "Weekly Digest" });
  };

  it("opens from the rail, and yields when another smart view is chosen", async () => {
    const viewport = installViewport();
    viewport.resizeTo(true);
    await seedDigestFixture();
    await renderShell();

    const heading = await openDigestView();
    expect(heading).toBeInTheDocument();
    // The rail marks the digest as the page while the list column is the view.
    expect(screen.getByRole("button", { name: /Weekly Digest/ })).toHaveAttribute(
      "aria-current",
      "page"
    );

    fireEvent.click(screen.getByRole("button", { name: /All Bookmarks/ }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Weekly Digest" })).toBeNull()
    );
    expect(screen.getByRole("button", { name: /All Bookmarks/ })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("yields when a folder is chosen from the rail's tree", async () => {
    const viewport = installViewport();
    viewport.resizeTo(true);
    const folder = await seedDigestFixture();
    await renderShell();

    await openDigestView();

    fireEvent.click(screen.getByRole("button", { name: new RegExp(folder.title) }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Weekly Digest" })).toBeNull()
    );
  });
});

// #295: link health is a workspace view too, from the same mockup family and
// under the same navigation rules — the Broken Links row opens it at every
// width (#303: as the mobile sheet below `lg`), and navigation owns leaving
// it. The same two paths a stuck view would strand are pinned here, beside
// the sheet's wiring and the per-card actions' handoffs.
describe("BookmarkApp's link health view (#295, sheet #303)", () => {
  const seedFolderFixture = async () => {
    // The composite store adopts a bar folder titled "bookmarkit" as its root,
    // and a tree row only exists for a folder that holds something.
    const root = await fakeStore.bookmarks.create({ parentId: "1", title: "bookmarkit" });
    const folder = await fakeStore.bookmarks.create({ parentId: root.id, title: "Deep reads" });
    await fakeStore.bookmarks.create({
      parentId: folder.id,
      title: "Fresh read",
      url: "https://example.com/fresh",
    });
    return folder;
  };

  // One dead link, marked by the sweep's verdict in its metadata — what the
  // link-health pages read.
  const seedBrokenBookmark = async () => {
    const folder = await fakeStore.bookmarks.create({ parentId: "1", title: "bookmarkit" });
    const node = await fakeStore.bookmarks.create({
      parentId: folder.id,
      title: "A page the sweep lost",
      url: "https://gone.test/page",
    });
    localStorage.setItem(
      `bm_meta:${node.id}`,
      JSON.stringify({ urlStatus: "invalid", urlStatusReason: "http:404" })
    );
    return node;
  };

  const openLinkHealthView = async () => {
    fireEvent.click(screen.getByRole("button", { name: /Broken Links/ }));
    return screen.findByRole("heading", { name: "Link Health & Archive Recovery" });
  };

  const openLinkHealthSheet = async () => {
    const drawer = await openDrawer();
    fireEvent.click(within(drawer).getByRole("button", { name: /Broken Links/ }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "BookmarkIt navigation" })).toBeNull()
    );
    return screen.findByRole("dialog", { name: "Broken Links" });
  };

  it("opens from the rail, and yields when another smart view is chosen", async () => {
    const viewport = installViewport();
    viewport.resizeTo(true);
    await seedFolderFixture();
    await renderShell();

    const heading = await openLinkHealthView();
    expect(heading).toBeInTheDocument();
    // The rail marks broken links as the page while the list column is the view.
    expect(screen.getByRole("button", { name: /Broken Links/ })).toHaveAttribute(
      "aria-current",
      "page"
    );

    fireEvent.click(screen.getByRole("button", { name: /All Bookmarks/ }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Link Health & Archive Recovery" })).toBeNull()
    );
    expect(screen.getByRole("button", { name: /All Bookmarks/ })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("yields when a folder is chosen from the rail's tree", async () => {
    const viewport = installViewport();
    viewport.resizeTo(true);
    const folder = await seedFolderFixture();
    await renderShell();

    await openLinkHealthView();

    fireEvent.click(screen.getByRole("button", { name: new RegExp(folder.title) }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Link Health & Archive Recovery" })).toBeNull()
    );
  });

  it("swaps the workspace for the sheet when the window shrinks below `lg`", async () => {
    const viewport = installViewport();
    viewport.resizeTo(true);
    await seedBrokenBookmark();
    await renderShell();

    await openLinkHealthView();

    act(() => viewport.resizeTo(false));

    // #303: below `lg` the view has its own composition — the mobile
    // mockup's full-page sheet — so shrinking re-homes the same open view
    // instead of handing an unfiltered list back under a rail that still
    // claims it.
    await screen.findByRole("dialog", { name: "Broken Links" });
    expect(screen.queryByRole("heading", { name: "Link Health & Archive Recovery" })).toBeNull();
    // The page's alarm and the card are the sheet's content now.
    expect(screen.getByText("1 bookmark returned HTTP errors or timeouts.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit the URL of/ })).toBeInTheDocument();
  });

  it("opens the sheet below `lg`, and backs out to the list it covered", async () => {
    installViewport();
    await seedFolderFixture();
    await renderShell();

    const sheet = await openLinkHealthSheet();
    expect(within(sheet).getByRole("button", { name: "Back to bookmarks" })).toBeInTheDocument();

    fireEvent.click(within(sheet).getByRole("button", { name: "Back to bookmarks" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Broken Links" })).toBeNull());

    // Backing out is not the filter: no brokenOnly lens is left on, so the
    // drawer no longer marks the row as the screen.
    const reopened = await openDrawer();
    expect(within(reopened).getByRole("button", { name: /Broken Links/ })).not.toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("hands a card's Edit URL to the ordinary edit form, the sheet making way first", async () => {
    installViewport();
    await seedBrokenBookmark();
    await renderShell();

    const sheet = await openLinkHealthSheet();
    fireEvent.click(
      within(sheet).getByRole("button", { name: "Edit the URL of A page the sweep lost" })
    );

    // #302's rule, twice over: the sheets never stack — the form replaces
    // the sheet rather than opening on top of it.
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Broken Links" })).toBeNull());
    expect(screen.getByRole("dialog", { name: "Edit Bookmark" })).toBeInTheDocument();
  });

  // The availability API's answer for the seeded link: one usable snapshot on
  // the archive's own host, the shape `readSnapshot` trusts. Restored by hand:
  // a global unstub in afterEach would also drop the ResizeObserver stub the
  // cleanup unmount's pending effects still reach for (the second CI failure,
  // #303).
  const stubArchiveHit = () => {
    const original = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        archived_snapshots: {
          closest: {
            available: true,
            status: "200",
            url: "https://web.archive.org/web/20240512/https://gone.test/page",
            timestamp: "20240512",
          },
        },
      }),
    }));
    return () => {
      globalThis.fetch = original;
    };
  };

  it("keeps a declined proposal declined when the window crosses `lg`", async () => {
    const viewport = installViewport();
    viewport.resizeTo(true);
    await seedBrokenBookmark();
    await renderShell();

    await openLinkHealthView();

    const restoreFetch = stubArchiveHit();
    try {
      // The archive answers with a copy, staged as the row's proposal.
      fireEvent.click(
        screen.getByRole("button", { name: "Find an archived copy of A page the sweep lost" })
      );
      await screen.findByText("https://web.archive.org/web/20240512/https://gone.test/page");

      // The reader declines it: nothing left to apply.
      fireEvent.click(screen.getByRole("checkbox", { name: "A page the sweep lost" }));
      expect(screen.getByRole("button", { name: "Apply Selected (0)" })).toBeDisabled();

      // ...and the window shrinks: the sheet is a different mount of the view,
      // reading the app's set of rejections, not a component-local one — so
      // crossing the breakpoint cannot quietly re-select what was refused.
      act(() => viewport.resizeTo(false));
      await screen.findByRole("dialog", { name: "Broken Links" });
      expect(screen.getByRole("button", { name: "Apply Selected (0)" })).toBeDisabled();
      expect(screen.getByRole("checkbox", { name: "A page the sweep lost" })).not.toBeChecked();
    } finally {
      restoreFetch();
    }
  });
});
