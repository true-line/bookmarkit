import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import WeeklyDigestView from "./WeeklyDigestView.jsx";

// #296: the weekly digest as a workspace view — the weekly-digest mockup's
// main beside the sidebar, replacing the desktop modal. The view renders
// what it is given and decides nothing, the rendering contract the modal
// never broke: a themeless added set shows no clusters of its own, and the
// strip reports the uncapped totals the digest carries. Below `lg` the
// digest stays #302's full-page sheet, and those suites pin that the sheet
// survives its new host unchanged.

const bookmark = (id, title, url = `https://example.com/${id}`) => ({ id, title, url });

// The component branches on the sidebar-viewport hook, which reads
// matchMedia. jsdom has none — the hook would default to the sheet — so
// every suite pins the composition it means to exercise. Only the
// breakpoint is answered true or false: the sheet also asks
// prefers-reduced-motion here, and a stub that agreed with everything would
// skip its exit animation.
const installViewport = (isWide) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    query,
    matches: query.includes("1024px") ? isWide : false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
};
const clearViewport = () => {
  delete window.matchMedia;
};

const DIGEST = {
  added: [bookmark("1", "Agent reads"), bookmark("2", "Shell reads")],
  neverOpened: [bookmark("3", "Dusty link")],
  untagged: [bookmark("4", "Untagged link")],
  themes: [{ title: "Agents", summary: "Model tooling.", ids: ["1"] }],
};

afterEach(() => {
  clearViewport();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("WeeklyDigestView beside the sidebar (#296)", () => {
  beforeEach(() => installViewport(true));

  const renderView = (digest = DIGEST, overrides = {}) => {
    const props = {
      digest,
      onOpen: vi.fn(),
      onShowNeverOpened: vi.fn(),
      onTriage: vi.fn(),
      onEdit: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    };
    render(<WeeklyDigestView {...props} />);
    return props;
  };

  // The modal is gone: what the sidebar's Weekly Digest row opens is a view
  // in the page, not a dialog over it — no ui-sheet chrome, no trap.
  it("renders the mockup's view header, and no dialog chrome", () => {
    renderView();
    expect(document.querySelector(".ui-sheet")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("heading", { name: "Weekly Digest" })).toHaveFocus();
    expect(
      screen.getByText(/· Local summary with optional AI topic grouping\./)
    ).toBeInTheDocument();
  });

  it("shows the week as the mockup's three metric cards", () => {
    renderView({ ...DIGEST, totals: { added: 14, neverOpened: 6, untagged: 4 } });

    const summary = screen.getByRole("region", { name: "Digest summary" });
    expect(within(summary).getByText("Arrived this week")).toBeInTheDocument();
    expect(within(summary).getByText("Settled & never opened")).toBeInTheDocument();
    expect(within(summary).getByText("Needs tags")).toBeInTheDocument();
    // The strip reports the uncapped totals, not the reading cap, and the
    // figures wear the mockup's display type with tabular figures.
    const figures = within(summary).getAllByText(/^\d+$/);
    expect(figures.map((figure) => figure.textContent)).toEqual(["14", "6", "4"]);
    for (const figure of figures) {
      expect(figure).toHaveClass("ui-type-display-lg-mobile", "ui-numeric");
    }
  });

  it("reads each card's side note from the digest's own facts", () => {
    renderView();
    const summary = screen.getByRole("region", { name: "Digest summary" });
    expect(within(summary).getByText("1 topic group")).toBeInTheDocument();
    expect(within(summary).getByText("Older than 7 days")).toBeInTheDocument();
    expect(within(summary).getByText("Ready for triage")).toBeInTheDocument();
  });

  it("renders the week's additions under their themes, and only those", () => {
    renderView();
    expect(screen.getByText("Agents")).toBeInTheDocument();
    expect(screen.getByText("Model tooling.")).toBeInTheDocument();
    const cluster = screen.getByText("Agents").closest("section");
    expect(within(cluster).getByText("1 bookmark")).toBeInTheDocument();
    // themeItems resolves the theme's ids against the added set...
    expect(within(cluster).getByText("Agent reads")).toBeInTheDocument();
    // ...and an addition no theme claimed is not shown here — grouping is
    // withRemainder's job upstream, not a decision the view makes.
    expect(screen.queryByText("Shell reads")).toBeNull();
  });

  it("shows each cluster row with the mockup's roundel, title and mono URL", () => {
    renderView();
    const row = screen.getByText("Agent reads").closest("button");
    expect(row.querySelector(".ui-digest-roundel img")).toBeInTheDocument();
    expect(row.querySelector(".ui-type-mono-sm")).toHaveTextContent("https://example.com/1");
  });

  it("opens a bookmark from its cluster row", () => {
    const props = renderView();
    fireEvent.click(screen.getByText("Agent reads"));
    expect(props.onOpen).toHaveBeenCalledWith(DIGEST.added[0]);
  });

  it("hands the untagged set to the organizer from the tertiary action", () => {
    const props = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Triage untagged" }));
    expect(props.onTriage).toHaveBeenCalledWith(DIGEST.untagged);
  });

  it("filters to the never-opened set from the secondary action", () => {
    const props = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Show never opened" }));
    expect(props.onShowNeverOpened).toHaveBeenCalledTimes(1);
  });

  it("omits the header actions for sections the digest lacks", () => {
    renderView({ added: DIGEST.added, neverOpened: [], untagged: [], themes: [] });
    expect(screen.queryByRole("button", { name: "Show never opened" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Triage untagged" })).toBeNull();
  });

  it("says so when nothing arrived but the week still has news", () => {
    renderView({
      added: [],
      neverOpened: DIGEST.neverOpened,
      untagged: [],
      themes: [],
      totals: { added: 0, neverOpened: 1, untagged: 0 },
    });
    expect(
      screen.getByText("Nothing arrived this week — the summary is still the week.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Agents")).toBeNull();
  });
});

// #302: below `lg` the digest wears the weekly-digest mockup's full-page
// sheet — the summary's three counts, the Auto-Tag strip, and the Needs
// Review queue with Open and Tag & File on every card. Same data, same
// actions; the suites above pin the view at `lg`. The sheet itself is
// unchanged by #296 — these suites are its rendering contract, now against
// its new host.
describe("WeeklyDigestView's sheet below `lg` (#302)", () => {
  beforeEach(() => installViewport(false));

  const DAY = 24 * 60 * 60 * 1000;
  const saved = (daysAgo, id, url = `https://example.com/${id}`) => ({
    id,
    title: id,
    url,
    createdAt: new Date(Date.now() - daysAgo * DAY).toISOString(),
  });

  // One card sits in both sections, so the queue also pins the dedupe.
  const SHEET_DIGEST = {
    added: [saved(1, "Fresh one")],
    neverOpened: [saved(9, "Dusty link"), saved(12, "Old thing")],
    untagged: [saved(9, "Dusty link"), saved(10, "Untagged link")],
    themes: [],
  };

  const renderSheet = (digest = SHEET_DIGEST, overrides = {}) => {
    const props = {
      digest,
      onOpen: vi.fn(),
      onShowNeverOpened: vi.fn(),
      onTriage: vi.fn(),
      onEdit: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    };
    render(<WeeklyDigestView {...props} />);
    return props;
  };

  it("swaps the view for the full-page sheet, still a dialog", () => {
    const props = renderSheet();

    expect(document.querySelector(".ui-modal-panel")).toBeNull();
    const sheet = document.querySelector(".ui-sheet");
    expect(sheet).not.toBeNull();
    expect(screen.getByRole("dialog", { name: "Weekly Digest" })).toBe(sheet);
    expect(screen.getByRole("button", { name: "Back to bookmarks" })).not.toBeNull();
    // An overlay surface is never a click-elsewhere signal: a press inside
    // must not dismiss a selection behind it.
    expect(sheet).toHaveAttribute("data-keeps-selection");
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("shows the week as the summary's three counts, the range beside the title", () => {
    renderSheet();

    const summary = screen.getByRole("region", { name: "Digest summary" });
    expect(within(summary).getByText("Saved")).toBeInTheDocument();
    expect(within(summary).getByText("Unopened")).toBeInTheDocument();
    expect(within(summary).getByText("Untagged")).toBeInTheDocument();
    expect(within(summary).getByText("1")).toBeInTheDocument();
    expect(within(summary).getAllByText("2")).toHaveLength(2);
    expect(screen.getByText(/· 1 saved/)).toBeInTheDocument();
  });

  it("queues the two sections as one deduplicated list, reasons on the card", () => {
    renderSheet();

    expect(screen.getByText("Needs Review")).toBeInTheDocument();
    expect(screen.getByText("3 items")).toBeInTheDocument();
    // newest save first
    const titles = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(titles).toEqual(["Dusty link", "Untagged link", "Old thing"]);
    // the card in both sections carries both reasons
    expect(screen.getByText("Saved 9 days ago · Untagged · Never opened")).toBeInTheDocument();
    expect(screen.getByText("Saved 10 days ago · Untagged")).toBeInTheDocument();
    expect(screen.getByText("Saved 12 days ago · Never opened")).toBeInTheDocument();
  });

  it("opens the page from the card's Open action", () => {
    const props = renderSheet();
    const card = screen.getByText("Untagged link").closest("article");

    fireEvent.click(within(card).getByRole("button", { name: "Open" }));

    expect(props.onOpen).toHaveBeenCalledWith(SHEET_DIGEST.untagged[1]);
  });

  it("hands the untagged set to the organizer from Auto-Tag", () => {
    const props = renderSheet();

    fireEvent.click(screen.getByRole("button", { name: /Suggest tags/ }));

    expect(props.onTriage).toHaveBeenCalledWith(SHEET_DIGEST.untagged);
  });

  it("opens the ordinary edit form from Tag & File", () => {
    const props = renderSheet();
    const card = screen.getByText("Old thing").closest("article");

    fireEvent.click(within(card).getByRole("button", { name: "Tag & File" }));

    expect(props.onEdit).toHaveBeenCalledWith(SHEET_DIGEST.neverOpened[1]);
  });

  it("offers Auto-Tag and the queue only when the untagged set is not empty", () => {
    renderSheet({ added: SHEET_DIGEST.added, neverOpened: [], untagged: [], themes: [] });

    expect(screen.queryByRole("button", { name: /Suggest tags/ })).toBeNull();
    expect(screen.queryByText("Needs Review")).toBeNull();
    // the summary alone still reads
    expect(screen.getByRole("region", { name: "Digest summary" })).toBeInTheDocument();
  });

  it("reports the uncapped totals the digest carries, not the reading cap", () => {
    renderSheet({
      ...SHEET_DIGEST,
      totals: { added: 14, neverOpened: 6, untagged: 4 },
    });

    const summary = screen.getByRole("region", { name: "Digest summary" });
    expect(within(summary).getByText("14")).toBeInTheDocument();
    expect(within(summary).getByText("6")).toBeInTheDocument();
    expect(within(summary).getByText("4")).toBeInTheDocument();
    expect(screen.getByText(/· 14 saved/)).toBeInTheDocument();
    // the queue still reads the capped sets
    expect(screen.getByText("3 items")).toBeInTheDocument();
  });

  it("drops the age a bookmark without a saved date cannot have", () => {
    renderSheet({
      ...SHEET_DIGEST,
      untagged: [
        ...SHEET_DIGEST.untagged,
        { id: "no-date", title: "No date", url: "https://example.com/no-date" },
      ],
    });

    const card = screen.getByText("No date").closest("article");
    expect(within(card).getByText("Untagged")).toBeInTheDocument();
    expect(within(card).queryByText(/Saved \d+ days ago/)).toBeNull();
  });

  it("backs out through Escape and the back button", () => {
    const props = renderSheet();

    fireEvent.keyDown(document.querySelector(".ui-sheet"), { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Back to bookmarks" }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });
});
