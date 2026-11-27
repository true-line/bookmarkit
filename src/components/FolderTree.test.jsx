import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FolderTree, { DRAG_BOOKMARKS, DRAG_FOLDER } from "./FolderTree.jsx";
import { UNFILED } from "../utils/folderTree.js";

const at = (id, folderId) => ({ id, title: `Bookmark ${id}`, url: `https://${id}.test`, folderId });

const bookmarks = [at("1", "Work"), at("2", "Work/Project A"), at("3", "Personal"), at("4", "")];

const setup = (props = {}) => {
  const handlers = {
    onSelect: vi.fn(),
    onMoveBookmarks: vi.fn(),
    onMoveFolder: vi.fn(),
    onRenameFolder: vi.fn(),
    onDeleteFolder: vi.fn(),
  };
  render(<FolderTree bookmarks={bookmarks} {...handlers} {...props} />);
  return handlers;
};

/** A drop carrying one kind of payload, since jsdom has no real DataTransfer. */
const carrying = (type, value) => ({
  dataTransfer: { getData: (asked) => (asked === type ? value : "") },
});

describe("FolderTree (#55)", () => {
  it("shows the folders the bookmarks imply, nested", () => {
    setup();

    expect(screen.getByRole("button", { name: "Work" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Personal" })).toBeInTheDocument();
  });

  it("counts what is under a folder, not only what is directly in it", () => {
    setup();

    // Work holds one bookmark and one in a subfolder.
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument(); // all bookmarks
  });

  it("offers the bookmarks in no folder as somewhere to stand", () => {
    const { onSelect } = setup();

    fireEvent.click(screen.getByRole("button", { name: "No folder" }));

    expect(onSelect).toHaveBeenCalledWith(UNFILED);
  });

  it("filters by a folder, and clicking the active one clears it", () => {
    const { onSelect } = setup({ activeFolder: "Work" });

    fireEvent.click(screen.getByRole("button", { name: "Work" }));

    expect(onSelect).toHaveBeenCalledWith("");
  });

  it("collapses a folder without hiding itself", () => {
    setup();

    fireEvent.click(screen.getByRole("button", { name: "Collapse Work" }));

    expect(screen.queryByRole("button", { name: "Project A" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Work" })).toBeInTheDocument();
  });

  it("moves dropped bookmarks into the folder they landed on", () => {
    const { onMoveBookmarks } = setup();

    fireEvent.drop(
      screen.getByRole("button", { name: "Personal" }).parentElement,
      carrying(DRAG_BOOKMARKS, JSON.stringify(["1", "2"]))
    );

    expect(onMoveBookmarks).toHaveBeenCalledWith(["1", "2"], "Personal");
  });

  it("moves bookmarks out of every folder when dropped on all bookmarks", () => {
    const { onMoveBookmarks } = setup();

    fireEvent.drop(
      screen.getByRole("button", { name: "All bookmarks" }).parentElement,
      carrying(DRAG_BOOKMARKS, JSON.stringify(["1"]))
    );

    expect(onMoveBookmarks).toHaveBeenCalledWith(["1"], UNFILED);
  });

  it("renests a dropped folder under the one it landed on", () => {
    const { onMoveFolder } = setup();

    fireEvent.drop(
      screen.getByRole("button", { name: "Personal" }).parentElement,
      carrying(DRAG_FOLDER, "Work")
    );

    expect(onMoveFolder).toHaveBeenCalledWith("Work", "Personal/Work");
  });

  it("ignores a drop carrying something it does not understand", () => {
    const { onMoveBookmarks, onMoveFolder } = setup();

    fireEvent.drop(
      screen.getByRole("button", { name: "Personal" }).parentElement,
      carrying("text/plain", "hello")
    );

    expect(onMoveBookmarks).not.toHaveBeenCalled();
    expect(onMoveFolder).not.toHaveBeenCalled();
  });

  it("renames in place, reporting the whole path", () => {
    const { onRenameFolder } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Rename Work/Project A" }));
    const field = screen.getByLabelText("Rename Work/Project A");
    fireEvent.change(field, { target: { value: "Project B" } });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(onRenameFolder).toHaveBeenCalledWith("Work/Project A", "Work/Project B");
  });

  it("abandons a rename on Escape", () => {
    const { onRenameFolder } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Rename Personal" }));
    const field = screen.getByLabelText("Rename Personal");
    fireEvent.change(field, { target: { value: "Home" } });
    fireEvent.keyDown(field, { key: "Escape" });

    expect(onRenameFolder).not.toHaveBeenCalled();
  });

  it("says where the bookmarks go before removing a folder", () => {
    const { onDeleteFolder } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Remove folder Work/Project A" }));
    expect(screen.getByText(/Move 1 bookmark to Work/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onDeleteFolder).toHaveBeenCalledWith("Work/Project A");
  });

  it("removes nothing when the offer is declined", () => {
    const { onDeleteFolder } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Remove folder Personal" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));

    expect(onDeleteFolder).not.toHaveBeenCalled();
  });
});

describe("FolderTree in the navigation sidebar (#283)", () => {
  const filed = [at("1", "Work"), at("2", "Work/Project A"), at("3", "Personal")];

  it("keeps the pane's behavior when nothing is asked of it", () => {
    setup();

    expect(screen.getByRole("button", { name: "All bookmarks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rename Work" })).toBeInTheDocument();
  });

  it("drops its own root row, which the sidebar's All Bookmarks view stands in for", () => {
    setup({ showRoot: false });

    expect(screen.queryByRole("button", { name: "All bookmarks" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Personal" })).toBeInTheDocument();
  });

  it("keeps No folder as the root's drop target even when everything is filed", () => {
    const { onMoveBookmarks } = setup({
      showRoot: false,
      alwaysShowUnfiled: true,
      bookmarks: filed,
    });

    const unfiled = screen.getByRole("button", { name: "No folder" });
    expect(unfiled.parentElement).toHaveTextContent(/No folder\s*0/);
    fireEvent.drop(unfiled.parentElement, carrying(DRAG_BOOKMARKS, JSON.stringify(["1"])));

    expect(onMoveBookmarks).toHaveBeenCalledWith(["1"], UNFILED);
  });

  it("keeps rename and remove off the rows until they are asked for", () => {
    setup({ manageable: false });

    expect(screen.getByRole("button", { name: "Work" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rename Work" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove folder Work" })).not.toBeInTheDocument();
  });

  it("renders the caller's caption inside the nav, above the list", () => {
    setup({ header: <p>Folders, and how to manage them</p> });

    const nav = screen.getByRole("navigation", { name: "Folders" });
    expect(nav.firstElementChild.textContent).toBe("Folders, and how to manage them");
    expect(nav.firstElementChild.nextElementSibling.tagName).toBe("UL");
  });
});

// #291: the a11y/RTL sweep — the tree is the app's deepest mirroring surface,
// so nothing in it may pin to the physical left: alignment rides text-start
// and the delete confirmation's indent rides ms-*.
describe("FolderTree RTL mirroring (#291)", () => {
  it("leaves nothing pinned to the physical left", () => {
    const { container } = render(<FolderTree bookmarks={bookmarks} onSelect={vi.fn()} />);

    const pinned = [...container.querySelectorAll("*")].filter(
      (el) => typeof el.className === "string" && /\b(ml-6|text-left)\b/.test(el.className)
    );
    expect(pinned).toEqual([]);
    expect(container.querySelector("button.text-start")).not.toBeNull();
  });

  it("indents the delete confirmation with a mirrorable margin", () => {
    const { container } = render(<FolderTree bookmarks={bookmarks} onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove folder Work" }));
    expect(container.querySelector(".ms-6")).not.toBeNull();
  });

  // The keyboard-only pass: every control is a native tabbable element, so
  // traversal is DOM order — each one takes focus, and none needs a tabindex.
  it("takes a keyboard pass through every control in DOM order", () => {
    const { container } = render(<FolderTree bookmarks={bookmarks} onSelect={vi.fn()} />);

    const tabbables = container.querySelectorAll(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]"
    );
    expect(tabbables.length).toBeGreaterThan(0);
    for (const el of tabbables) {
      el.focus();
      expect(document.activeElement).toBe(el);
    }
    const hacks = [...tabbables].filter(
      (el) => el.hasAttribute("tabindex") && el.getAttribute("tabindex") !== "0"
    );
    expect(hacks).toEqual([]);
  });
});

// #346: the mini rail's reading of the tree — icon rows, flat, named by
// tooltip, every folder visible (there are no carets to hide anything
// behind), and the drops still landing.
describe("FolderTree folded into the mini rail (#346)", () => {
  it("flattens the tree into named icon rows", () => {
    const { onSelect } = setup({ iconOnly: true });

    // Every folder stands at the rail's edge — the nested Project A is
    // visible without a press, and the carets are gone with the indents.
    const work = screen.getByRole("button", { name: "Work" });
    expect(work).toHaveAttribute("title", "Work");
    expect(screen.getByRole("button", { name: "Project A" })).toBeInTheDocument();
    expect(work).not.toHaveTextContent("Work");
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Collapse Work" })).not.toBeInTheDocument();

    fireEvent.click(work);
    expect(onSelect).toHaveBeenCalledWith("Work");
  });

  it("keeps the row a live drop target while folded", () => {
    const { onMoveBookmarks } = setup({ iconOnly: true });

    fireEvent.drop(
      screen.getByRole("button", { name: "Personal" }).parentElement,
      carrying(DRAG_BOOKMARKS, JSON.stringify(["1"]))
    );

    expect(onMoveBookmarks).toHaveBeenCalledWith(["1"], "Personal");
  });

  it("keeps the root row as the folded rail's way home", () => {
    const { onSelect } = setup({ iconOnly: true });

    fireEvent.click(screen.getByRole("button", { name: "All bookmarks" }));
    expect(onSelect).toHaveBeenCalledWith("");
    fireEvent.click(screen.getByRole("button", { name: "No folder" }));
    expect(onSelect).toHaveBeenLastCalledWith(UNFILED);
  });

  it("manages nothing from the rail — the caller folds the switch with the caption", () => {
    setup({ iconOnly: true, manageable: false });

    expect(screen.queryByRole("button", { name: "Rename Work" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove folder Work" })).not.toBeInTheDocument();
  });
});
