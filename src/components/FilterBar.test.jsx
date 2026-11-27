import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FilterBar from "./FilterBar.jsx";
import { EMPTY_FILTERS, cycleTag } from "../utils/manualFilters.js";

const tagFacets = [
  { tag: "docs", count: 2 },
  { tag: "react", count: 1 },
];

function setup(overrides = {}) {
  const onChange = vi.fn();
  const onCycleTag = vi.fn();
  const onClear = vi.fn();
  const props = {
    filters: EMPTY_FILTERS,
    tagFacets,
    onChange,
    onCycleTag,
    onClear,
    ...overrides,
  };
  render(<FilterBar {...props} />);
  return { onChange, onCycleTag, onClear };
}

describe("FilterBar (#53)", () => {
  it("reports text changes without waiting for a submit", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText("Filter bookmarks by text"), {
      target: { value: "react" },
    });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, text: "react" });
  });

  it("renders a chip per tag with its count", () => {
    setup();
    expect(screen.getByRole("button", { name: /Tag docs, 2 bookmarks/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tag react, 1 bookmark,/ })).toBeInTheDocument();
  });

  it("cycles a tag when its chip is clicked", () => {
    const { onCycleTag } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Tag docs/ }));
    expect(onCycleTag).toHaveBeenCalledWith("docs");
  });

  it("announces the include/exclude state of a chip to screen readers", () => {
    const included = cycleTag(EMPTY_FILTERS, "docs");
    const { unmount } = render(
      <FilterBar
        filters={included}
        tagFacets={tagFacets}
        onChange={() => {}}
        onCycleTag={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /Tag docs.*including/ })).toBeInTheDocument();
    unmount();

    const excluded = cycleTag(included, "docs");
    render(
      <FilterBar
        filters={excluded}
        tagFacets={tagFacets}
        onChange={() => {}}
        onCycleTag={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /Tag docs.*excluding/ })).toBeInTheDocument();
  });

  it("changes rating and sort", () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText("Minimum rating"), { target: { value: "3" } });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, unratedOnly: false, minRating: 3 });

    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "title" } });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, sortBy: "title" });
  });

  // #286: the mockup's Unrated pick is its own flag — the bookmarks with no
  // rating — and it shows back as the select's selection.
  it("picks Unrated as its own flag", () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByLabelText("Minimum rating"), { target: { value: "unrated" } });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, unratedOnly: true, minRating: 0 });
  });

  it("shows the Unrated pick selected, and a star rung turns it off", () => {
    const { onChange } = setup({ filters: { ...EMPTY_FILTERS, unratedOnly: true } });

    expect(screen.getByLabelText("Minimum rating")).toHaveValue("unrated");
    fireEvent.change(screen.getByLabelText("Minimum rating"), { target: { value: "4" } });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, unratedOnly: false, minRating: 4 });
  });

  // #286: the mockup's live count — the summary announces itself and its
  // digits wear the tabular reading.
  it("announces the summary as a polite live region in the numeric style", () => {
    setup({ summary: "3 of 42 bookmarks match" });

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveClass("ui-numeric");
    expect(status).toHaveTextContent("3 of 42 bookmarks match");
  });

  it("names the sort options from the catalogue, in SORT_FIELDS' order", () => {
    // #284: the field list stays with the filter semantics; its words do not.
    setup();

    const options = screen.getByLabelText("Sort by").querySelectorAll("option");
    expect([...options].map((option) => [option.value, option.textContent])).toEqual([
      ["", "Default order"],
      ["title", "Title (A–Z)"],
      ["url", "URL"],
      ["rating", "Rating"],
      ["folderId", "Folder"],
      ["createdAt", "Recently added"],
      ["lastOpenedAt", "Last opened"],
      ["updatedAt", "Date modified"],
    ]);
  });

  // #47: the sweep writes urlStatus; this is how the result is looked at without
  // asking an LLM anything.
  it("toggles the broken-only filter and reports its state", () => {
    const { onChange } = setup();
    const toggle = screen.getByRole("button", { name: "Broken only" });

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, brokenOnly: true });
  });

  it("shows the broken-only filter as pressed while it is on", () => {
    setup({ filters: { ...EMPTY_FILTERS, brokenOnly: true } });

    expect(screen.getByRole("button", { name: "Broken only" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  // #283: the same flag the navigation sidebar's Untagged view sets.
  it("toggles the untagged filter and reports its state", () => {
    const { onChange } = setup();
    const toggle = screen.getByRole("button", { name: "Untagged" });

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, untagged: true });
  });

  it("shows the untagged filter as pressed while it is on", () => {
    setup({ filters: { ...EMPTY_FILTERS, untagged: true } });

    expect(screen.getByRole("button", { name: "Untagged" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("disables the direction toggle until a sort field is chosen", () => {
    setup();
    expect(screen.getByRole("button", { name: /Sort direction/ })).toBeDisabled();
  });

  it("flips sort direction once a field is chosen", () => {
    const { onChange } = setup({ filters: { ...EMPTY_FILTERS, sortBy: "title" } });
    fireEvent.click(screen.getByRole("button", { name: /Sort direction/ }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, sortBy: "title", order: "desc" });
  });

  it("only offers Clear filters when something is active", () => {
    const { unmount } = render(
      <FilterBar
        filters={EMPTY_FILTERS}
        tagFacets={tagFacets}
        onChange={() => {}}
        onCycleTag={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    unmount();

    const onClear = vi.fn();
    render(
      <FilterBar
        filters={{ ...EMPTY_FILTERS, minRating: 2 }}
        tagFacets={tagFacets}
        onChange={() => {}}
        onCycleTag={() => {}}
        onClear={onClear}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("collapses a long tag list behind a 'more' toggle", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ tag: `t${i}`, count: 1 }));
    setup({ tagFacets: many });
    // 12 visible + the "+8 more" button
    expect(screen.getByRole("button", { name: "+8 more" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tag t15/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+8 more" }));
    expect(screen.getByRole("button", { name: /Tag t15/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show fewer" })).toBeInTheDocument();
  });

  it("renders no chip row when nothing is tagged", () => {
    setup({ tagFacets: [] });
    expect(screen.queryByRole("button", { name: /^Tag / })).not.toBeInTheDocument();
  });
});

describe("FilterBar narrow-viewport structure (#151)", () => {
  it("groups the text filter apart from the discrete controls", () => {
    setup();

    const text = document.querySelector(".ui-filter-text");
    const controls = document.querySelector(".ui-filter-controls");
    expect(text).not.toBeNull();
    expect(controls).not.toBeNull();

    // The responsive rules in index.css turn these two classes into a
    // full-width text row and one scrollable control strip below 40rem, so
    // the grouping is the contract this test protects.
    expect(text.querySelector("#filter-text")).not.toBeNull();
    expect(controls.contains(screen.getByLabelText("Minimum rating"))).toBe(true);
    expect(controls.contains(screen.getByLabelText("Sort by"))).toBe(true);
  });

  // #284: the widths are floors declared in index.css; these classes are what
  // carry them, so a longer translated label grows the select.
  it("gives each select the class that holds its width floor", () => {
    setup();

    expect(screen.getByLabelText("Minimum rating")).toHaveClass("ui-filter-select--rating");
    expect(screen.getByLabelText("Sort by")).toHaveClass("ui-filter-select--sort");
  });

  it("keeps the clear-filters action inside the scrollable control strip", () => {
    const { onClear } = setup({
      filters: { ...EMPTY_FILTERS, minRating: 3 },
    });

    const controls = document.querySelector(".ui-filter-controls");
    const clear = screen.getByRole("button", { name: /clear filters/i });
    expect(controls.contains(clear)).toBe(true);

    fireEvent.click(clear);
    expect(onClear).toHaveBeenCalled();
  });
});

// #299: below `lg` the shell's compact row owns rating and sort, so the bar
// hides its own rather than offering the same control twice on screen.
describe("FilterBar with sort controls in the shell's row", () => {
  it("hides the rating filter, the sort select and the direction button", () => {
    setup({ showSortControls: false, filters: { ...EMPTY_FILTERS, sortBy: "title" } });

    expect(screen.queryByLabelText("Minimum rating")).toBeNull();
    expect(screen.queryByLabelText("Sort by")).toBeNull();
    expect(screen.queryByRole("button", { name: /Sort direction/ })).toBeNull();
  });

  it("keeps the observed-state toggles and the clear action", () => {
    const { onClear } = setup({
      showSortControls: false,
      filters: { ...EMPTY_FILTERS, brokenOnly: true },
    });

    expect(screen.getByRole("button", { name: "Broken only" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Never opened" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Untagged" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(onClear).toHaveBeenCalled();
  });
});

// #291: the keyboard-only pass — every control is a native tabbable element,
// so traversal is DOM order; walk the order and assert focus lands on each,
// with no tabindex steering.
describe("FilterBar keyboard pass (#291)", () => {
  it("reaches every control in DOM order without tabindex steering", () => {
    const { container } = render(
      <FilterBar
        filters={{ ...EMPTY_FILTERS, text: "react" }}
        tagFacets={tagFacets}
        onChange={vi.fn()}
        onCycleTag={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const tabbables = container.querySelectorAll(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]"
    );
    expect(tabbables.length).toBeGreaterThan(0);
    for (const el of tabbables) {
      el.focus();
      expect(document.activeElement).toBe(el);
    }
    const hacks = [...tabbables].filter(
      (el) => el.hasAttribute("tabindex") && el.getAttribute("tabindex") !== "0"
    );
    expect(hacks).toEqual([]);
  });
});
