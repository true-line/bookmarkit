import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { keepsSelectionProps, useBookmarkSelection } from "./useBookmarkSelection.js";

const BOOKMARKS = [
  { id: "a", url: "https://a.example" },
  { id: "b", url: "https://b.example" },
  { id: "c", url: "https://c.example" },
];

let selection;

// Cards stop propagation on mousedown, which is how a click on one avoids the
// click-outside handler that clears the selection. The harness has to do the same
// or every click would immediately deselect.
const Probe = ({ onOpen = () => {}, onEdit = () => {} }) => {
  selection = useBookmarkSelection(onOpen, onEdit);
  return (
    <div>
      <span data-testid="focused">{selection.selectedId || "none"}</span>
      <span data-testid="checked">{selection.multiSelectedIds.join(",") || "none"}</span>
      <span data-testid="acting-on">{selection.selectedIds.join(",") || "none"}</span>
      {BOOKMARKS.map((bookmark) => (
        <button
          key={bookmark.id}
          type="button"
          aria-label={bookmark.id}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => selection.onBookmarkClick(bookmark, e)}
          onDoubleClick={(e) => selection.onBookmarkDoubleClick(bookmark, e)}
          onKeyDown={(e) => selection.onBookmarkKeyDown(e, bookmark)}
        />
      ))}
      <div aria-label="empty space" />
      {/* Stands in for the bulk edit bar: a control that acts on the selection. */}
      <div {...keepsSelectionProps}>
        <button type="button" aria-label="bulk control" />
      </div>
    </div>
  );
};

const card = (id) => screen.getByLabelText(id);

beforeEach(() => {
  selection = undefined;
});

describe("useBookmarkSelection (#26)", () => {
  it("focuses one bookmark on a plain click", () => {
    render(<Probe />);

    fireEvent.click(card("a"));

    expect(screen.getByTestId("focused")).toHaveTextContent("a");
    expect(screen.getByTestId("acting-on")).toHaveTextContent("a");
  });

  it("moves the focus rather than adding to it", () => {
    render(<Probe />);

    fireEvent.click(card("a"));
    fireEvent.click(card("b"));

    expect(screen.getByTestId("focused")).toHaveTextContent("b");
    expect(screen.getByTestId("acting-on")).toHaveTextContent("b");
  });

  // The two selections must never disagree about what "the selection" is, so
  // building a set takes the focused bookmark with it as its first member.
  it("carries the focused bookmark into the set on the first Ctrl+click", () => {
    render(<Probe />);

    fireEvent.click(card("a"));
    fireEvent.click(card("b"), { ctrlKey: true });

    expect(screen.getByTestId("focused")).toHaveTextContent("none");
    expect(screen.getByTestId("checked")).toHaveTextContent("a,b");
    expect(screen.getByTestId("acting-on")).toHaveTextContent("a,b");
  });

  it("removes a bookmark from the set when Ctrl+clicked again", () => {
    render(<Probe />);

    fireEvent.click(card("a"), { ctrlKey: true });
    fireEvent.click(card("b"), { ctrlKey: true });
    fireEvent.click(card("a"), { ctrlKey: true });

    expect(screen.getByTestId("checked")).toHaveTextContent("b");
  });

  it("treats Cmd+click the same as Ctrl+click", () => {
    render(<Probe />);

    fireEvent.click(card("a"), { metaKey: true });
    fireEvent.click(card("b"), { metaKey: true });

    expect(screen.getByTestId("checked")).toHaveTextContent("a,b");
  });

  it("drops the set when a plain click follows it", () => {
    render(<Probe />);

    fireEvent.click(card("a"), { ctrlKey: true });
    fireEvent.click(card("b"), { ctrlKey: true });
    fireEvent.click(card("c"));

    expect(screen.getByTestId("checked")).toHaveTextContent("none");
    expect(screen.getByTestId("acting-on")).toHaveTextContent("c");
  });

  // #190: activation is two-stage. Clicking the selected bookmark acts on it —
  // it opens — and the selection clears, since the user has moved on.
  it("opens on a click of the selected bookmark and clears the selection", () => {
    const onOpen = vi.fn();
    render(<Probe onOpen={onOpen} />);

    fireEvent.click(card("a"));
    fireEvent.click(card("a"));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(BOOKMARKS[0]);
    expect(screen.getByTestId("acting-on")).toHaveTextContent("none");
  });

  it("opens on Enter once the bookmark is selected", () => {
    const onOpen = vi.fn();
    render(<Probe onOpen={onOpen} />);

    fireEvent.keyDown(card("a"), { key: "Enter" });
    expect(screen.getByTestId("focused")).toHaveTextContent("a");
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.keyDown(card("a"), { key: "Enter" });
    expect(onOpen).toHaveBeenCalledWith(BOOKMARKS[0]);
    expect(screen.getByTestId("focused")).toHaveTextContent("none");
  });

  it("opens the editor on Shift+Enter instead of the bookmark", () => {
    const onOpen = vi.fn();
    const onEdit = vi.fn();
    render(<Probe onOpen={onOpen} onEdit={onEdit} />);

    fireEvent.click(card("a"));
    fireEvent.keyDown(card("a"), { key: "Enter", shiftKey: true });

    expect(onEdit).toHaveBeenCalledWith(BOOKMARKS[0]);
    expect(onOpen).not.toHaveBeenCalled();
  });

  // The second click of a double-click stays out of the way so the dblclick
  // event can speak for the whole sequence.
  it("opens an unselected bookmark on a double-click, exactly once", () => {
    const onOpen = vi.fn();
    render(<Probe onOpen={onOpen} />);

    fireEvent.click(card("a"));
    fireEvent.click(card("a"), { detail: 2 });
    fireEvent.doubleClick(card("a"));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(BOOKMARKS[0]);
  });

  // The selected bookmark's first click already opened it; the trailing dblclick
  // must not open a second tab.
  it("opens a selected bookmark once across its double-click", () => {
    const onOpen = vi.fn();
    render(<Probe onOpen={onOpen} />);

    fireEvent.click(card("a"));
    fireEvent.click(card("a"));
    fireEvent.click(card("a"), { detail: 2 });
    fireEvent.doubleClick(card("a"));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("opens the editor on Shift+double-click without opening the bookmark", () => {
    const onOpen = vi.fn();
    const onEdit = vi.fn();
    render(<Probe onOpen={onOpen} onEdit={onEdit} />);

    fireEvent.click(card("a"));
    fireEvent.click(card("a"), { detail: 2, shiftKey: true });
    fireEvent.doubleClick(card("a"), { shiftKey: true });

    expect(onEdit).toHaveBeenCalledWith(BOOKMARKS[0]);
    expect(onOpen).not.toHaveBeenCalled();
  });

  // Shift belongs to the double-click it may be starting: opening the editor on
  // Shift+click would close it again when the next click hit the modal's scrim.
  it("leaves a lone Shift+click alone", () => {
    const onOpen = vi.fn();
    const onEdit = vi.fn();
    render(<Probe onOpen={onOpen} onEdit={onEdit} />);

    fireEvent.click(card("a"), { shiftKey: true });

    expect(screen.getByTestId("focused")).toHaveTextContent("none");
    expect(onOpen).not.toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
  });

  // Space on a card would otherwise scroll the list under the user.
  it("prevents the browser's default for the keys it handles", () => {
    render(<Probe />);

    const handled = fireEvent.keyDown(card("a"), { key: " " });
    const ignored = fireEvent.keyDown(card("a"), { key: "x" });

    expect(handled).toBe(false); // preventDefault() was called
    expect(ignored).toBe(true);
  });

  it("ignores keys it has no meaning for", () => {
    const onOpen = vi.fn();
    render(<Probe onOpen={onOpen} />);

    fireEvent.keyDown(card("a"), { key: "Tab" });

    expect(screen.getByTestId("focused")).toHaveTextContent("none");
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("clears the selection on a mousedown anywhere that is not a bookmark", () => {
    render(<Probe />);
    fireEvent.click(card("a"), { ctrlKey: true });
    fireEvent.click(card("b"), { ctrlKey: true });

    fireEvent.mouseDown(screen.getByLabelText("empty space"));

    expect(screen.getByTestId("checked")).toHaveTextContent("none");
    expect(screen.getByTestId("acting-on")).toHaveTextContent("none");
  });

  // #54: the bulk bar operates on the selection, so clicking it must not dismiss
  // the selection first — which would unmount the bar mid-interaction.
  it("keeps the selection when a control that acts on it is clicked", () => {
    render(<Probe />);

    fireEvent.click(card("a"), { ctrlKey: true });
    fireEvent.click(card("b"), { ctrlKey: true });
    fireEvent.mouseDown(screen.getByLabelText("bulk control"));

    expect(screen.getByTestId("checked")).toHaveTextContent("a,b");
  });

  it("stops listening for outside clicks once unmounted", () => {
    const { unmount } = render(<Probe />);
    const removed = vi.spyOn(document, "removeEventListener");

    unmount();

    expect(removed).toHaveBeenCalledWith("mousedown", expect.any(Function));
    removed.mockRestore();
  });
});
