import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ViewSelector from "./ViewSelector.jsx";

function setup(overrides = {}) {
  const onChange = vi.fn();
  render(<ViewSelector value="flow" onChange={onChange} {...overrides} />);
  return { onChange };
}

describe("ViewSelector (#198)", () => {
  it("offers exactly the three views", () => {
    setup();
    expect(screen.getByRole("button", { name: "Single column view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Flow columns view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grid view" })).toBeInTheDocument();
  });

  it("marks only the active view as pressed", () => {
    setup();
    expect(screen.getByRole("button", { name: "Single column view" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "Flow columns view" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Grid view" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("reports the chosen view", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Grid view" }));
    expect(onChange).toHaveBeenCalledWith("grid");
  });

  it("moves the pressed state when the value follows the choice", () => {
    const { rerender } = render(<ViewSelector value="flow" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Single column view" }));
    rerender(<ViewSelector value="single" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Single column view" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Flow columns view" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("names itself for screen readers", () => {
    setup();
    expect(screen.getByRole("group", { name: "Bookmark list view" })).toBeInTheDocument();
  });
});
