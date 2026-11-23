import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import HelpModal from "./HelpModal.jsx";
import MessageModal from "./MessageModal.jsx";
import DeleteConfirmModal from "./DeleteConfirmModal.jsx";

// The dialogs' shared Escape contract (#23), re-homed when the legacy
// DesignSystem.jsx library retired (#255). The wrapper's own keyboard
// contract — focus trap, Tab wrap, the scrim guard — is pinned in
// src/design-system/Modal.test.jsx.
// The migrated dialogs (#243) close through the unified Modal: without a
// scrim guard the exit animation defers onClose by its 150ms duration, so
// these tests advance past it. The delete confirmation refuses through its
// own guard instead, which answers synchronously like it always has.
afterEach(() => {
  vi.useRealTimers();
});

// Every dialog gets the same keyboard contract from the wrapper, including the
// three that used to hand-roll it and the ones that had no way out at all.
describe("every dialog closes on Escape (#23)", () => {
  it("help", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<HelpModal onClose={onClose} />);

    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    // The migrated help modal (#244) closes through the design-system Modal's
    // 150ms exit animation instead of inline.
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("message", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<MessageModal message="Saved" type="success" onClose={onClose} />);

    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("delete confirmation, unless a deletion is in flight", () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <DeleteConfirmModal message="Delete 2 bookmarks?" onCancel={onCancel} onConfirm={vi.fn()} />
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(
      <DeleteConfirmModal
        message="Delete 2 bookmarks?"
        onCancel={onCancel}
        onConfirm={vi.fn()}
        isLoading
      />
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
