import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SelectionBar from "./SelectionBar.jsx";

// #299: the mobile manager's selection bar — the count, Clear and Bulk Edit
// on the inverse band pinned to the bottom. It is the only bulk surface
// below `lg`; the editor it raises is the list's own.

function setup() {
  const onClear = vi.fn();
  const onBulkEdit = vi.fn();
  render(<SelectionBar count={3} onClear={onClear} onBulkEdit={onBulkEdit} />);
  return { onClear, onBulkEdit };
}

describe("SelectionBar (#299)", () => {
  it("announces itself as the selection's region and counts the set", () => {
    setup();

    const bar = screen.getByRole("region", { name: "Selection actions" });
    expect(bar).toHaveTextContent("3 selected");
  });

  it("clears the selection from the band", () => {
    const { onClear } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("hands the set to Bulk Edit", () => {
    const { onBulkEdit } = setup();

    fireEvent.click(screen.getByRole("button", { name: /Bulk Edit/ }));
    expect(onBulkEdit).toHaveBeenCalledTimes(1);
  });

  // Clicking a control that acts on the selection must not first dismiss it —
  // the global mousedown would otherwise unmount the bar mid-interaction.
  it("keeps the selection when its own controls are clicked", () => {
    setup();

    expect(screen.getByRole("region", { name: "Selection actions" })).toHaveAttribute(
      "data-keeps-selection"
    );
  });
});
