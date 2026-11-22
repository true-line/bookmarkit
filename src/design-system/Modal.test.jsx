import React, { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Modal } from "./Modal.jsx";
import { Button } from "./Button.jsx";

// The unified dialog must keep the exact keyboard contract the DesignSystem
// Modal established (#27, #23): focus moves in and is restored, Escape is
// trapped on the panel and never reaches the app behind it, and the scrim
// guard covers both exits. The spec adds a real 150ms exit animation, so
// closing is now deferred unless prefers-reduced-motion is on.

const dialog = () => screen.getByRole("dialog");

function Host({ modalProps, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      {open && (
        <Modal title="Options" onClose={() => setOpen(false)} {...modalProps}>
          {children}
        </Modal>
      )}
    </>
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Modal (unified design system)", () => {
  it("moves focus into the dialog and restores it after the exit animation", () => {
    vi.useFakeTimers();
    render(
      <Host>
        <Button>Inside</Button>
      </Host>
    );
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);
    expect(dialog().contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    // The panel is still on screen while the 150ms exit animation runs.
    expect(screen.queryByRole("dialog")).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes immediately when prefers-reduced-motion is on", () => {
    const original = window.matchMedia;
    window.matchMedia = () => ({ matches: true });
    render(
      <Host>
        <Button>Inside</Button>
      </Host>
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    fireEvent.keyDown(dialog(), { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    window.matchMedia = original;
  });

  it("stops Escape from reaching the app behind an open dialog", () => {
    const appEscape = vi.fn();
    render(
      <div onKeyDown={(event) => event.key === "Escape" && appEscape()}>
        <Modal title="Options" onClose={() => {}}>
          <Button>Inside</Button>
        </Modal>
      </div>
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Inside" }), { key: "Escape" });
    expect(appEscape).not.toHaveBeenCalled();
  });

  it("routes scrim clicks and Escape through the same guard", () => {
    const onScrimClick = vi.fn();
    const { container } = render(
      <Modal title="Options" onClose={() => {}} onScrimClick={onScrimClick}>
        <Button>Inside</Button>
      </Modal>
    );

    // The scrim is the wrapper; a mousedown on the panel itself must not count.
    fireEvent.mouseDown(container.firstChild);
    fireEvent.keyDown(screen.getByRole("button", { name: "Inside" }), { key: "Escape" });

    expect(onScrimClick).toHaveBeenCalledTimes(2);
  });

  it("renders the alert variant as an alertdialog described by its body", () => {
    render(
      <Modal variant="alert" title="Remove bookmark?" onClose={() => {}}>
        <p>This removes the bookmark from your collection.</p>
      </Modal>
    );
    const alert = screen.getByRole("alertdialog");
    expect(alert).toHaveAttribute("aria-modal", "true");
    expect(alert).toHaveClass("ui-modal-panel--alert");
    const describedBy = alert.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy)).toHaveTextContent(
      "This removes the bookmark from your collection."
    );
  });

  it("labels the dialog with the title and describes it with the header description", () => {
    render(
      <Modal
        title="Edit Bookmark"
        description="Update details, organize into folders, or generate AI suggestions."
        onClose={() => {}}
      />
    );
    const dialog = screen.getByRole("dialog");
    expect(document.getElementById(dialog.getAttribute("aria-labelledby"))).toHaveTextContent(
      "Edit Bookmark"
    );
    const describedBy = dialog.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy)).toHaveTextContent(
      "Update details, organize into folders, or generate AI suggestions."
    );
  });

  it("renders the drawer variant as a dialog on the inline-start sheet", () => {
    render(
      <Modal variant="drawer" title="Folders" onClose={() => {}}>
        <div>All bookmarks</div>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toHaveClass("ui-drawer-panel");
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });
});
