import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EmptyShelfStates from "./EmptyShelf.jsx";

// #254: the empty shelf speaks the design system — headline scale for the
// titles, body-md copy, the canonical button intents. The variant logic is
// the ARCH-10 contract: loading says nothing, an emptied collection offers
// Add and Import, a finished action or an active search offers to clear.

const base = {
  isLoading: false,
  bookmarksTotal: 10,
  searchActive: false,
  lastAction: null,
  searchQuery: "",
  onClear: vi.fn(),
  onAddNew: vi.fn(),
  onImport: vi.fn(),
};

const setup = (overrides = {}) => {
  const handlers = {
    onClear: vi.fn(),
    onAddNew: vi.fn(),
    onImport: vi.fn(),
  };
  render(<EmptyShelfStates {...base} {...handlers} {...overrides} />);
  return handlers;
};

describe("EmptyShelfStates recipes (#254)", () => {
  it("stays out of the way while the shelf loads", () => {
    setup({ isLoading: true });
    expect(document.querySelector(".ui-empty")).toBeNull();
  });

  it("renders nothing when there is nothing to report", () => {
    setup();
    expect(document.querySelector(".ui-empty")).toBeNull();
  });

  it("offers Add New on primary and Import on secondary for an empty shelf", () => {
    setup({ bookmarksTotal: 0 });
    expect(screen.getByRole("heading", { name: "Your shelf is empty." })).toHaveClass(
      "ui-type-headline-lg",
      "ui-empty-title"
    );
    expect(screen.getByText("Add your first bookmark, or import a browser export.")).toHaveClass(
      "ui-type-body-md"
    );
    expect(screen.getByRole("button", { name: /Add New/ })).toHaveClass("ui-button--primary");
    expect(screen.getByRole("button", { name: /Import/ })).toHaveClass("ui-button--secondary");
  });

  it("wires the empty shelf's calls to the shelf's owners", async () => {
    const { onAddNew, onImport } = setup({ bookmarksTotal: 0 });
    fireEvent.click(screen.getByRole("button", { name: /Add New/ }));
    fireEvent.click(screen.getByRole("button", { name: /Import/ }));
    expect(onAddNew).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it("offers to clear after an agent action matched nothing", () => {
    const { onClear } = setup({ lastAction: { summary: "tagged" } });
    expect(screen.getByRole("heading", { name: "No bookmarks match your request." })).toHaveClass(
      "ui-type-headline-md"
    );
    expect(screen.getByRole("button", { name: "Clear search" })).toHaveClass(
      "ui-button--secondary"
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("names the query a search matched nothing for", () => {
    setup({ searchActive: true, searchQuery: "velcro" });
    expect(screen.getByRole("heading", { name: 'No bookmarks match "velcro".' })).toHaveClass(
      "ui-type-headline-md"
    );
    expect(document.querySelector(".ui-empty--compact")).not.toBeNull();
  });

  it("says the search matched nothing without naming an empty query", () => {
    setup({ searchActive: true });
    expect(
      screen.getByRole("heading", { name: "No bookmarks match your search." })
    ).toBeInTheDocument();
  });
});
