import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import HelpModal from "./HelpModal.jsx";

// The help modal runs on the unified design system (#244): the modal-standard
// shell at the help-shortcuts screen's max-w-2xl reading, that screen's
// shortcut rows with ui-kbd keycaps, and example-command chips. The dialog
// contract itself (focus trap, Escape, restoration) is the design-system
// Modal's and is covered there; the Escape case keeps the deferred exit
// covered for this surface too.

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("HelpModal on the unified design system", () => {
  const renderHelp = (onClose = vi.fn()) => render(<HelpModal onClose={onClose} />);

  it("opens the modal-standard shell at the help screen's 2xl reading", () => {
    renderHelp();
    const panel = screen.getByRole("dialog");
    expect(panel).toHaveClass("ui-modal-panel");
    expect(panel).toHaveClass("ui-modal-panel--2xl");
    expect(document.getElementById(panel.getAttribute("aria-labelledby"))).toHaveTextContent(
      "Help & Keyboard Shortcuts"
    );
  });

  it("renders one shortcut row per real binding with ui-kbd keycaps", () => {
    renderHelp();
    const rows = document.querySelectorAll(".ui-shortcut-row");
    expect(rows).toHaveLength(10);
    const undo = screen.getByText("Undo last change").closest(".ui-shortcut-row");
    const caps = [...undo.querySelectorAll(".ui-kbd")].map((cap) => cap.textContent);
    expect(caps).toEqual(["Cmd/Ctrl+Z"]);
  });

  it("documents the shift gestures as edits, matching the app", () => {
    renderHelp();
    const editRow = screen.getByText("Open the editing modal").closest(".ui-shortcut-row");
    const caps = [...editRow.querySelectorAll(".ui-kbd")].map((cap) => cap.textContent);
    expect(caps).toEqual(["Shift+Click", "Shift+Enter"]);
  });

  it("keeps the two-stage selection documented: repeating it opens", () => {
    renderHelp();
    const openRow = screen.getByText("Open the selected bookmark").closest(".ui-shortcut-row");
    const caps = [...openRow.querySelectorAll(".ui-kbd")].map((cap) => cap.textContent);
    expect(caps).toEqual(["Click again", "Enter", "Space"]);
  });

  it("renders the agent's example commands as chips", () => {
    renderHelp();
    const chips = [...document.querySelectorAll(".ui-command-chip")].map(
      (chip) => chip.textContent
    );
    expect(chips).toHaveLength(6);
    expect(chips).toContain('"find github"');
    expect(chips).toContain('"remove duplicates"');
  });

  it("keeps the emphasis on the two tips, each one message from the catalogue", () => {
    // #284: a tip is a single template with its <strong> inside it, not three
    // fragments joined around the element.
    renderHelp();
    const duplicates = screen.getByText("Remove Duplicates");
    const portability = screen.getByText("Import/Export");

    expect(duplicates.tagName).toBe("STRONG");
    expect(portability.tagName).toBe("STRONG");
    expect(duplicates.closest("li")).toHaveTextContent(
      'Use the Remove Duplicates button (or type "remove duplicates" into the search) to review duplicates pair by pair — both copies are shown, and nothing goes until you confirm.'
    );
  });

  it("closes from the footer's Got it button", () => {
    const onClose = vi.fn();
    renderHelp(onClose);
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape after the 150ms exit animation", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    renderHelp(onClose);
    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
