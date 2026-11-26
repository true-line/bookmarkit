import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import DuplicateReviewModal from "./DuplicateReviewModal.jsx";

// #285: one rule pair and one AI pair, the mockup's two rows. The rule pair's
// survivor carries tags and a rating, so its badge names both.
const richKeep = {
  id: "rich",
  title: "Context7 — Docs for LLMs",
  url: "https://context7.com/",
  tags: ["docs"],
  rating: 5,
};
const bareDrop = { id: "bare", title: "Context7", url: "https://context7.com/?utm_source=hn" };
const canonicalKeep = {
  id: "canon",
  title: "Writing a good CLAUDE.md",
  url: "https://humanlayer.dev/blog/writing-a-good-claude-md",
  description: "Read twice; notes inside.",
};
const mirrorDrop = {
  id: "mirror",
  title: "HumanLayer: Writing a good CLAUDE.md",
  url: "https://medium.com/@humanlayer/writing-a-good-claude-md",
};

const pairs = [
  { id: "bare", keep: richKeep, drop: bareDrop, source: "rule", headline: "exactUrl" },
  {
    id: "mirror",
    keep: canonicalKeep,
    drop: mirrorDrop,
    source: "ai",
    headline: "canonical and syndicated versions of the same article",
  },
];

const setup = (overrides = {}) => {
  const onRemove = vi.fn();
  const onCancel = vi.fn();
  render(
    <DuplicateReviewModal pairs={pairs} onRemove={onRemove} onCancel={onCancel} {...overrides} />
  );
  return { onRemove, onCancel };
};

const AI_CHECKBOX = "Remove HumanLayer: Writing a good CLAUDE.md, keep Writing a good CLAUDE.md";

describe("DuplicateReviewModal", () => {
  it("renders the review dialog with the destructive footer recipe", () => {
    setup();

    const panel = screen.getByRole("dialog");
    expect(panel).toHaveClass("ui-modal-panel");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("ui-button--secondary");
    expect(screen.getByRole("button", { name: "Remove selected (2)" })).toHaveClass(
      "ui-button--destructive"
    );
    expect(screen.getByText("2 of 2 pairs selected")).toBeInTheDocument();
  });

  it("shows both copies of every pair with the keep and remove badges", () => {
    setup();

    expect(screen.getByText("Exact URL match (normalized)")).toBeInTheDocument();
    expect(screen.getByText("Keep (has tags & has a rating)")).toBeInTheDocument();
    expect(screen.getAllByText("Remove duplicate")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Writing a good CLAUDE.md")[0]).toBeInTheDocument();
    expect(screen.getByText("https://context7.com/?utm_source=hn")).toBeInTheDocument();
  });

  it("marks where each pair came from", () => {
    setup();

    expect(screen.getByText("Rule-based")).toBeInTheDocument();
    expect(screen.getByText("AI proposed")).toBeInTheDocument();
    // The AI row's headline is the model's own reason for the verdict.
    expect(
      screen.getByText("canonical and syndicated versions of the same article")
    ).toBeInTheDocument();
  });

  // The review contract: every pair starts selected, matching the proposal the
  // all-or-nothing staging used to make, and each pair is decidable alone.
  it("removes only the pairs left ticked", () => {
    const { onRemove } = setup();

    fireEvent.click(screen.getByLabelText(AI_CHECKBOX));
    expect(screen.getByText("1 of 2 pairs selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove selected (1)" }));
    expect(onRemove).toHaveBeenCalledWith(["bare"]);
  });

  it("removes every proposed copy when nothing is unticked", () => {
    const { onRemove } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Remove selected (2)" }));
    expect(onRemove).toHaveBeenCalledWith(["bare", "mirror"]);
  });

  it("selects and deselects the whole proposal from the footer", () => {
    setup();

    fireEvent.click(screen.getByRole("button", { name: "Deselect all pairs" }));
    expect(screen.getByText("0 of 2 pairs selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove selected (0)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Select all pairs" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select all pairs" }));
    expect(screen.getByText("2 of 2 pairs selected")).toBeInTheDocument();
  });

  it("cannot be abandoned half way through a removal", () => {
    const { onCancel } = setup({ isRemoving: true });

    expect(screen.getByRole("button", { name: "Removing…" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
