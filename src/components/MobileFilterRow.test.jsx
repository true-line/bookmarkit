import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MobileFilterRow from "./MobileFilterRow.jsx";
import { EMPTY_FILTERS } from "../utils/manualFilters.js";

// #299: the shell's compact filter row — the rating filter, the date quick
// sort, and the select-mode toggle the touch path uses.

function setup({ filters = EMPTY_FILTERS, selectMode = false, selectedCount = 0 } = {}) {
  const onChange = vi.fn();
  const onToggleSelectMode = vi.fn();
  render(
    <MobileFilterRow
      filters={filters}
      onChange={onChange}
      selectMode={selectMode}
      selectedCount={selectedCount}
      onToggleSelectMode={onToggleSelectMode}
    />
  );
  return { onChange, onToggleSelectMode };
}

describe("MobileFilterRow (#299)", () => {
  it("raises the rating filter as the list's own select does", () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByLabelText("Minimum rating"), { target: { value: "4" } });

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, unratedOnly: false, minRating: 4 });
  });

  // #286: the compact row renders the same ladder as the list's filter bar —
  // Unrated included, as its own flag.
  it("picks Unrated as its own flag, from the same ladder", () => {
    const { onChange } = setup();

    const options = [...screen.getByLabelText("Minimum rating").options].map((o) => o.textContent);
    expect(options).toContain("Unrated");
    fireEvent.change(screen.getByLabelText("Minimum rating"), { target: { value: "unrated" } });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, unratedOnly: true, minRating: 0 });
  });

  it("offers the date sort, newest first, while none is on", () => {
    const { onChange } = setup();

    expect(screen.getByRole("button", { name: "Sort by date, newest first." })).toHaveTextContent(
      "Newest"
    );

    fireEvent.click(screen.getByRole("button", { name: "Sort by date, newest first." }));

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, sortBy: "createdAt", order: "desc" });
  });

  it("reads the date sort's state and reverses it in place", () => {
    const { onChange } = setup({
      filters: { ...EMPTY_FILTERS, sortBy: "createdAt", order: "desc" },
    });

    expect(
      screen.getByRole("button", { name: "Sorted newest first. Activate to reverse." })
    ).toHaveTextContent("Newest");

    fireEvent.click(
      screen.getByRole("button", { name: "Sorted newest first. Activate to reverse." })
    );

    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_FILTERS,
      sortBy: "createdAt",
      order: "asc",
    });
  });

  it("reads Oldest while the date sort runs ascending", () => {
    setup({ filters: { ...EMPTY_FILTERS, sortBy: "createdAt", order: "asc" } });

    expect(
      screen.getByRole("button", { name: "Sorted oldest first. Activate to reverse." })
    ).toHaveTextContent("Oldest");
  });

  it("leaves a non-date sort alone until pressed", () => {
    setup({ filters: { ...EMPTY_FILTERS, sortBy: "title", order: "asc" } });

    expect(screen.getByRole("button", { name: "Sort by date, newest first." })).toBeInTheDocument();
  });

  it("offers Select, then counts the set it built", () => {
    const { onToggleSelectMode } = setup();

    const toggle = screen.getByRole("button", {
      name: "Selection mode. Activate to select bookmarks by tapping them.",
    });
    expect(toggle).toHaveTextContent("Select");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);
    expect(onToggleSelectMode).toHaveBeenCalledTimes(1);
  });

  it("carries the pressed state and the tabular count while the mode is on", () => {
    setup({ selectMode: true, selectedCount: 12 });

    const toggle = screen.getByRole("button", {
      name: "Selection mode. Activate to select bookmarks by tapping them.",
    });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveTextContent("12");
  });

  // Clicking the toggle must not dismiss the selection its count is about —
  // the same contract the bulk edit bar holds to.
  it("keeps the selection when clicked", () => {
    setup({ selectMode: true, selectedCount: 3 });

    expect(
      screen
        .getByRole("button", {
          name: "Selection mode. Activate to select bookmarks by tapping them.",
        })
        .closest("[data-keeps-selection]")
    ).not.toBeNull();
  });
});
