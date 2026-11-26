import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BookmarkCard from "./BookmarkCard.jsx";
import { FAVICON_PLACEHOLDER } from "../utils/favicon.js";

// #251: the card renders the design system's card-interactive recipe. The
// manager's two-stage selection lives in the handlers the app passes, so the
// card's own contract is the recipe (roles, pressed state, recipe classes),
// the states the shelf drives (selected, pending delete, unreachable), and
// the body composition (favicon roundel, mono URL, tag chips, the mockup's
// star-plus-count rating with #24's clamp).

const BOOKMARK = {
  id: "b1",
  title: "Ghostty docs",
  url: "https://ghostty.org/docs",
  description: "Terminal documentation",
  tags: ["terminal", "reference"],
  rating: 4,
};

function setup(overrides = {}) {
  // onDragStart stays unset (the no-drop-target default), so the draggable
  // contract can be pinned both ways.
  const handlers = {
    onClick: vi.fn(),
    onDoubleClick: vi.fn(),
    onKeyDown: vi.fn(),
    onDragStart: undefined,
  };
  render(
    <BookmarkCard
      bookmark={BOOKMARK}
      isSelected={false}
      isMultiSelected={false}
      isPendingDelete={false}
      remoteFavicons={false}
      {...handlers}
      {...overrides}
    />
  );
  return handlers;
}

beforeEach(() => {
  // jsdom has no favicon cache, and remote fetching stays off in these tests,
  // so the roundel always shows the inline placeholder.
  globalThis.chrome = undefined;
});

describe("BookmarkCard recipe (#251)", () => {
  it("renders the interactive card recipe with button semantics", () => {
    setup();
    const card = screen.getByRole("button");
    expect(card).toHaveClass("ui-card", "ui-card--interactive");
    expect(card).toHaveAttribute("aria-pressed", "false");
    expect(card).toHaveAttribute("tabindex", "0");
  });

  it("presses the card when the shelf selects it", () => {
    setup({ isSelected: true });
    const card = screen.getByRole("button");
    expect(card).toHaveClass("ui-card--selected");
    expect(card).toHaveAttribute("aria-pressed", "true");
  });

  it("presses the card on multi-select too", () => {
    setup({ isMultiSelected: true });
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("marks pending deletion on the card", () => {
    setup({ isPendingDelete: true });
    expect(screen.getByRole("button")).toHaveClass("ui-bookmark-card--pending");
  });

  it("announces an unreachable URL with a status dot", () => {
    setup({ bookmark: { ...BOOKMARK, urlStatus: "invalid" } });
    expect(screen.getByRole("img", { name: "URL could not be reached" })).toBeInTheDocument();
  });

  it("renders the title on label-lg and the URL on the mono line", () => {
    setup();
    const title = screen.getByRole("heading", { name: BOOKMARK.title });
    expect(title).toHaveClass("ui-type-label-lg");
    expect(title).toHaveAttribute("dir", "auto");
    const url = screen.getByText(BOOKMARK.url);
    expect(url).toHaveClass("ui-url");
    expect(url).toHaveAttribute("dir", "ltr");
  });

  it("renders tags as ui-tag chips", () => {
    setup();
    for (const tag of BOOKMARK.tags) {
      expect(screen.getByText(tag)).toHaveClass("ui-tag");
    }
  });

  it("renders the rating as the mockup's star plus count", () => {
    setup();
    const rating = screen.getByRole("img", { name: "Rated 4 out of 5 stars" });
    expect(rating).toHaveClass("ui-bookmark-rating");
    expect(rating).toHaveTextContent("4");
  });

  it("clamps stored ratings into 0–5 (#24)", () => {
    setup({ bookmark: { ...BOOKMARK, rating: 9 } });
    expect(screen.getByRole("img", { name: "Rated 5 out of 5 stars" })).toHaveTextContent("5");
    setup({ bookmark: { ...BOOKMARK, rating: "2" } });
    expect(screen.getByRole("img", { name: "Rated 2 out of 5 stars" })).toHaveTextContent("2");
  });

  it("renders no rating and no tags row without data", () => {
    setup({ bookmark: { id: "b2", title: "T", url: "https://t.example/" } });
    expect(screen.queryByText(/Rated/)).not.toBeInTheDocument();
    expect(document.querySelector(".ui-bookmark-meta")).toBeNull();
  });

  it("falls back to the inline placeholder when the favicon fails", () => {
    setup();
    const img = screen.getByRole("button").querySelector(".ui-bookmark-favicon img");
    expect(img).toHaveAttribute("width", "20");
    fireEvent.error(img);
    expect(img).toHaveAttribute("src", FAVICON_PLACEHOLDER);
  });

  it("fires the selection handlers for the card itself", () => {
    const handlers = setup();
    const card = screen.getByRole("button");
    fireEvent.mouseDown(card, { bubbles: false });
    fireEvent.click(card, { detail: 1 });
    expect(handlers.onClick).toHaveBeenCalledTimes(1);
    expect(handlers.onClick.mock.calls[0][0].detail).toBe(1);
  });

  it("leaves a nested control's events to that control (#239)", () => {
    const handlers = setup();
    const card = screen.getByRole("button");
    const nested = document.createElement("button");
    nested.textContent = "card action";
    card.querySelector(".ui-bookmark-body").appendChild(nested);
    fireEvent.click(nested);
    expect(handlers.onClick).not.toHaveBeenCalled();
    expect(handlers.onKeyDown).not.toHaveBeenCalled();
  });

  it("is draggable only where there is somewhere to drop it (#55)", () => {
    setup();
    expect(screen.getByRole("button")).toHaveAttribute("draggable", "false");
  });

  it("turns draggable once the folder pane gives a drop target", () => {
    setup({ onDragStart: vi.fn() });
    expect(screen.getByRole("button")).toHaveAttribute("draggable", "true");
  });
});

// #288: the mockups' card anatomy — the per-bookmark Edit control named after
// its bookmark, and below `lg` the mobile meta footer (folder chip, # tags,
// Unrated where a count would sit) against the desktop card's plainer row.
describe("BookmarkCard anatomy and selection parity (#288)", () => {
  it("names the Edit control after the bookmark and keeps it the card's own", () => {
    const onEdit = vi.fn();
    const handlers = setup({ onEdit });
    const button = screen.getByRole("button", { name: "Edit Ghostty docs bookmark" });

    // The nested-control rule (#239): the button's click is the edit, and the
    // guarded card handlers it bubbles into never also fire.
    fireEvent.click(button);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(BOOKMARK);
    expect(handlers.onClick).not.toHaveBeenCalled();
  });

  it("keeps the Edit control's keyboard out of the card's activation", () => {
    const onEdit = vi.fn();
    const handlers = setup({ onEdit });
    const button = screen.getByRole("button", { name: "Edit Ghostty docs bookmark" });

    button.focus();
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.click(button);
    expect(handlers.onKeyDown).not.toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("names the Edit control after the URL when the title is empty", () => {
    const onEdit = vi.fn();
    setup({ onEdit, bookmark: { id: "b3", url: "https://untitled.example/" } });
    expect(screen.getByRole("button", { name: "Edit https://untitled.example/ bookmark" }));
  });

  it("renders no Edit control when the shelf gives no handler", () => {
    setup();
    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
  });

  it("reads the mobile meta: folder chip, # tags, Unrated", () => {
    setup({
      bookmark: { ...BOOKMARK, folderId: "Work/Docs", rating: 0, tags: ["terminal"] },
      isMobileViewport: true,
    });

    expect(screen.getByText("Work/Docs")).toBeInTheDocument();
    expect(screen.getByText("#terminal")).toHaveClass("ui-tag");
    expect(screen.getByText("Unrated")).toBeInTheDocument();
    expect(screen.queryByText(/Rated/)).not.toBeInTheDocument();
  });

  it("keeps the desktop card's plain chips and hides folder and Unrated", () => {
    setup({ bookmark: { ...BOOKMARK, folderId: "Work/Docs", rating: 0 } });

    expect(screen.getByText("terminal")).toHaveClass("ui-tag");
    expect(screen.queryByText("Work/Docs")).toBeNull();
    expect(screen.queryByText("Unrated")).toBeNull();
    expect(screen.queryByText("#terminal")).toBeNull();
  });

  it("keeps the mobile meta row even when only Unrated fills it", () => {
    setup({
      bookmark: { id: "b2", title: "T", url: "https://t.example/" },
      isMobileViewport: true,
    });

    expect(document.querySelector(".ui-bookmark-meta")).not.toBeNull();
    expect(screen.getByText("Unrated")).toBeInTheDocument();
  });
});
