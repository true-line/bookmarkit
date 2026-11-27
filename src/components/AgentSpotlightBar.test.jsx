import React from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AgentSpotlightBar from "./AgentSpotlightBar.jsx";

// #340: the Spotlight overlay runs the shared dialog contract on the mockup's
// floating bar — role="search" with the mockup's accessible name, the input
// focused on summon (the trap's first focusable), Escape and the scrim closing
// through the deferred exit, focus restored on close — and the gate toast
// answering the shortcut when no provider is configured (role="alert",
// assertive, dismissable).

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// A focusable element behind the overlay, so focus restoration has somewhere
// to go back to.
const Harness = ({ open, noticeOpen, onClose, onDismissNotice, onSubmit }) => (
  <div>
    <button type="button" aria-label="somewhere behind">
      somewhere behind
    </button>
    <AgentSpotlightBar
      open={open}
      noticeOpen={noticeOpen}
      onClose={onClose}
      onDismissNotice={onDismissNotice}
      onSubmit={onSubmit}
    />
  </div>
);

const renderBar = (props = {}) => {
  const merged = {
    open: true,
    noticeOpen: false,
    onClose: vi.fn(),
    onDismissNotice: vi.fn(),
    onSubmit: vi.fn(),
    ...props,
  };
  render(<Harness {...merged} />);
  return merged;
};

describe("AgentSpotlightBar's overlay (#340)", () => {
  it("renders the mockup's search form: named command bar, sr-only label, dir=auto input", () => {
    renderBar();

    const form = screen.getByRole("search", { name: "AI Agent command bar" });
    expect(form).toHaveClass("ui-spotlight-panel");
    const input = screen.getByLabelText("Ask AI agent");
    expect(input).toHaveAttribute("dir", "auto");
    expect(input).toHaveAttribute(
      "placeholder",
      'Ask AI agent (e.g. "docs tagged cli with 4+ stars")...'
    );
    expect(screen.getByText("Ctrl/Cmd+K")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask" })).toBeInTheDocument();
  });

  it("lands focus on the input on summon, and restores it on close", async () => {
    const { onClose } = renderBar();

    const input = screen.getByLabelText("Ask AI agent");
    expect(input).toHaveFocus();

    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    // The deferred exit unmounts the overlay through the caller's flag; here
    // the unmount happens when the harness re-renders, so the trap cleanup
    // restoring focus is covered at the app level (BookmarkApp.shell.test).
  });

  it("asks with the trimmed query, and refuses an empty ask", () => {
    const { onSubmit } = renderBar();

    const input = screen.getByLabelText("Ask AI agent");
    const ask = screen.getByRole("button", { name: "Ask" });

    expect(ask).toBeDisabled();
    fireEvent.change(input, { target: { value: "   " } });
    expect(ask).toBeDisabled();

    fireEvent.change(input, { target: { value: "  find github  " } });
    expect(ask).toBeEnabled();
    fireEvent.submit(screen.getByRole("search", { name: "AI Agent command bar" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("find github");
  });

  it("closes from Escape on the panel, and the shortcuts behind never hear it", async () => {
    const { onClose } = renderBar();
    const heard = vi.fn();
    window.addEventListener("keydown", heard);
    try {
      fireEvent.keyDown(screen.getByLabelText("Ask AI agent"), { key: "Escape" });
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    } finally {
      window.removeEventListener("keydown", heard);
    }
    // The panel stops the event like every dialog's: an app shortcut bound on
    // the window must not fire behind the overlay.
    expect(heard).not.toHaveBeenCalled();
  });

  it("closes from a scrim press, and not from a press on the bar itself", async () => {
    const { onClose } = renderBar();

    fireEvent.mouseDown(screen.getByRole("search", { name: "AI Agent command bar" }));
    expect(onClose).not.toHaveBeenCalled();

    // The scrim is the wrapper: a press on it (not the panel) dismisses.
    const scrim = document.querySelector(".ui-spotlight-scrim");
    fireEvent.mouseDown(scrim);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("defers the exit through the closing state like every dialog", async () => {
    vi.useFakeTimers();
    const { onClose } = renderBar();

    fireEvent.keyDown(screen.getByLabelText("Ask AI agent"), { key: "Escape" });
    // data-closing is up and the caller is still waiting out the 150ms exit.
    expect(document.querySelector(".ui-spotlight-scrim")).toHaveAttribute("data-closing", "true");
    expect(onClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("AgentSpotlightBar's provider gate (#340)", () => {
  it("answers with the mockup's alert toast instead of a field", () => {
    renderBar({ open: false, noticeOpen: true });

    const toast = screen.getByRole("alert");
    expect(toast).toHaveAttribute("aria-live", "assertive");
    expect(toast).toHaveTextContent("Configure an AI provider in Options before using the agent.");
    expect(screen.getByRole("button", { name: "Dismiss notice" })).toBeInTheDocument();
    // No field, no ask, no chip: the gate is a notice, never an input.
    expect(screen.queryByLabelText("Ask AI agent")).toBeNull();
    expect(screen.queryByRole("search")).toBeNull();
  });

  it("dismisses from the toast's button", () => {
    const { onDismissNotice } = renderBar({ open: false, noticeOpen: true });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }));
    expect(onDismissNotice).toHaveBeenCalledTimes(1);
  });

  it("renders nothing while neither surface is summoned", () => {
    render(<Harness open={false} noticeOpen={false} />);
    expect(screen.queryByRole("search")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
