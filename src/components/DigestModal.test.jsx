import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

const DIGEST = {
  added: [bookmark("1", "Agent reads"), bookmark("2", "Shell reads")],
  neverOpened: [bookmark("3", "Dusty link")],
  untagged: [bookmark("4", "Untagged link")],
  themes: [{ title: "Agents", summary: "Model tooling.", ids: ["1"] }],
};

describe("DigestModal on the unified design system", () => {
  const renderDigest = (digest = DIGEST, overrides = {}) => {
    const props = {
      digest,
      onOpen: vi.fn(),
      onShowNeverOpened: vi.fn(),
      onTriage: vi.fn(),
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
