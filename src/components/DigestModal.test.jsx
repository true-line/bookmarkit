import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import DigestModal from "./DigestModal.jsx";

// #248: the digest modal runs on the unified design system — the
// modal-standard shell, one ui-Card per digest section with the mockup's
// headline-sm title over a label-sm count, and item rows in the mockup's
// label-lg title over mono-sm URL composition. Tertiary is the model-powered
// triage action per the AI-assist accent rule. The sections stay the pure
// rendering contract of #50: the modal renders what it is given and decides
// nothing, so a themeless added set shows its card header alone. The dialog
// contract itself (focus trap, Escape, exit animation) is the design-system
// Modal's and is covered there.

const bookmark = (id, title, url = `https://example.com/${id}`) => ({ id, title, url });

// #302 branches on the sidebar-viewport hook, which reads matchMedia. jsdom
// has none — the hook would default to the sheet — so every suite pins the
// composition it means to exercise. Only the breakpoint is answered true or
// false: the modal also asks prefers-reduced-motion here, and a stub that
// agreed with everything would skip its exit animation.
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

describe("DigestModal on the unified design system", () => {
  beforeEach(() => installViewport(true));

  const renderDigest = (digest = DIGEST, overrides = {}) => {
    const props = {
      digest,
      onOpen: vi.fn(),
      onShowNeverOpened: vi.fn(),
      onTriage: vi.fn(),
      onEdit: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    };
    render(<DigestModal {...props} />);
    return props;
  };

  it("opens the modal-standard shell with the mockup's header copy", () => {
    renderDigest();
    const panel = screen.getByRole("dialog");
    expect(panel).toHaveClass("ui-modal-panel");
    expect(document.getElementById(panel.getAttribute("aria-labelledby"))).toHaveTextContent(
      "Weekly Digest"
    );
    expect(screen.getByText("Local summary with optional AI topic grouping.")).toBeInTheDocument();
  });

  it("renders each digest section as a card titled and counted per the mockup", () => {
    renderDigest();
    const cards = document.querySelectorAll(".ui-card");
    expect(cards).toHaveLength(3);
    expect(screen.getByText("Saved this week")).toBeInTheDocument();
    expect(screen.getByText("Never opened")).toBeInTheDocument();
    expect(screen.getByText("Untagged")).toBeInTheDocument();
    expect(screen.getByText("2 bookmarks")).toBeInTheDocument();
    // never-opened and untagged both hold one bookmark
    expect(screen.getAllByText("1 bookmark")).toHaveLength(2);
  });

  it("renders the week's additions under their themes, and only those", () => {
    renderDigest();
    expect(screen.getByText("Agents")).toBeInTheDocument();
    expect(screen.getByText("Model tooling.")).toBeInTheDocument();
    expect(screen.getByText("Grouped by theme.")).toBeInTheDocument();
    // themeItems resolves the theme's ids against the added set...
    expect(screen.getByText("Agent reads")).toBeInTheDocument();
    // ...and an addition no theme claimed is not shown here — grouping is
    // withRemainder's job upstream, not a decision the modal makes.
    expect(screen.queryByText("Shell reads")).toBeNull();
  });

  it("shows each item in the mockup's title-over-URL composition", () => {
    renderDigest();
    const row = screen.getByText("Dusty link").closest("button");
    expect(row).toHaveTextContent("https://example.com/3");
    expect(row.querySelector(".ui-type-mono-sm")).toHaveTextContent("https://example.com/3");
  });

  it("opens a bookmark from its item row", () => {
    const props = renderDigest();
    fireEvent.click(screen.getByText("Dusty link"));
    expect(props.onOpen).toHaveBeenCalledWith(DIGEST.neverOpened[0]);
  });

  it("hands the untagged set to the organizer from the tertiary action", () => {
    const props = renderDigest();
    fireEvent.click(screen.getByRole("button", { name: "Triage untagged" }));
    expect(props.onTriage).toHaveBeenCalledWith(DIGEST.untagged);
  });

  it("filters to the never-opened set from the secondary action", () => {
    const props = renderDigest();
    fireEvent.click(screen.getByRole("button", { name: "Show never opened" }));
    expect(props.onShowNeverOpened).toHaveBeenCalledTimes(1);
  });

  it("closes from the primary Done action", () => {
    const props = renderDigest();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  // The digest has no guard condition, so dismissal must NOT pass the
  // onScrimClick route: Escape, the close icon, and the scrim all ride the
  // unified modal's deferred 150ms exit and call onClose once after it.
  it("closes on Escape after the 150ms exit animation", () => {
    vi.useFakeTimers();
    const props = renderDigest();
    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    expect(props.onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("omits the footer actions for sections the digest lacks", () => {
    renderDigest({ added: DIGEST.added, neverOpened: [], untagged: [], themes: [] });
    expect(screen.queryByRole("button", { name: "Show never opened" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Triage untagged" })).toBeNull();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(document.querySelectorAll(".ui-card")).toHaveLength(1);
    // a themeless added set decides nothing: header and count only
    expect(screen.queryByText("Agent reads")).toBeNull();
    expect(screen.queryByText("Grouped by theme.")).toBeNull();
  });
});

// #302: below `lg` the digest wears the weekly-digest mockup's full-page
// sheet — the summary's three counts, the Auto-Tag strip, and the Needs
// Review queue with Open and Tag & File on every card. Same data, same
// actions; the suites above pin the modal at `lg`.
describe("DigestModal's sheet below `lg` (#302)", () => {
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
    render(<DigestModal {...props} />);
    return props;
  };

  it("swaps the modal for the full-page sheet, still a dialog", () => {
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

  it("backs out through Escape and the back button", () => {
    const props = renderSheet();

    fireEvent.keyDown(document.querySelector(".ui-sheet"), { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Back to bookmarks" }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });
});
