// #26: Which bookmarks are selected, and the gestures that change that.
//
// There are two selections rather than one, and it is not redundancy: a single
// click focuses one bookmark, which is also what the URL check and the edit
// shortcut act on, while Ctrl/Cmd+click builds a set. Making a set clears the
// focused one and vice versa, so the two can never disagree about what "the
// selection" means — `selectedIds` is that answer.
//
// #190: activation is two-stage. The first gesture on an unselected bookmark
// selects it; the same gesture on the selected bookmark acts — a click, Enter,
// Space, or double-click opens it in a new tab, while the Shift variants
// (Shift+click, Shift+Enter) open the editor instead.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// The attribute a region sets to say "clicking me is part of acting on the
// selection", and the props that set it. Exported together so the marker and the
// rule that reads it cannot drift apart.
const KEEPS_SELECTION = "data-keeps-selection";
export const keepsSelectionProps = Object.freeze({ [KEEPS_SELECTION]: "" });

/**
 * @param {(bookmark: object) => void} onOpen Opens a bookmark in a new tab.
 *   Opening is not this hook's concern, so it is handed out — but the selection
 *   clears either way, since the user has moved on.
 * @param {(bookmark: object) => void} [onEdit] Opens the editing modal for a
 *   bookmark — where the Shift gestures land.
 * @param {boolean} [selectMode] #299: the mobile shell's select mode. A touch
 *   has no modifier keys to hold, so the mode turns the plain gesture into
 *   the set toggle that Ctrl/Cmd+click is on the desktop. Shift keeps its
 *   edit meaning in both modes.
 */
export function useBookmarkSelection(onOpen, onEdit, selectMode = false) {
  const [selectedId, setSelectedId] = useState(null);
  const [multiSelectedIds, setMultiSelectedIds] = useState([]);
  // The bookmark the most recent activation opened, if any. A double-click's
  // second click is what opens an unselected bookmark, so the trailing dblclick
  // event must not open the same one again — #190.
  const openedIdRef = useRef(null);

  const clear = useCallback(() => {
    setSelectedId(null);
    setMultiSelectedIds([]);
  }, []);

  // A mousedown anywhere that is not a bookmark card (cards stop propagation)
  // clears the selection: header, buttons, dialogs, empty space, everything.
  //
  // Except the controls that act *on* the selection, which would otherwise
  // dismiss the thing they operate on the moment they were clicked. Those mark
  // themselves with `data-keeps-selection`, which survives a control being
  // rearranged or wrapped in a way that stopping propagation by hand does not.
  useEffect(() => {
    const onMouseDown = (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(`[${KEEPS_SELECTION}]`)) return;
      clear();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [clear]);

  const open = useCallback(
    (bookmark) => {
      openedIdRef.current = bookmark.id;
      onOpen(bookmark);
      clear();
    },
    [onOpen, clear]
  );

  const edit = useCallback(
    (bookmark) => {
      onEdit?.(bookmark);
    },
    [onEdit]
  );

  // The set toggle behind Ctrl/Cmd+click and, since #299, the select mode's
  // plain gesture. One body, so the two paths cannot disagree about carrying
  // the focused bookmark in or about dropping the focus.
  const toggleMulti = useCallback(
    (bookmark) => {
      setMultiSelectedIds((prev) => {
        // A single click before the first Ctrl+click set `selectedId`; carry it
        // in, so extending starts from what the user can see is selected.
        const seeded = selectedId && !prev.includes(selectedId) ? [...prev, selectedId] : [...prev];
        return seeded.includes(bookmark.id)
          ? seeded.filter((id) => id !== bookmark.id)
          : [...seeded, bookmark.id];
      });
      setSelectedId(null);
      openedIdRef.current = null;
    },
    [selectedId]
  );

  const onBookmarkClick = useCallback(
    (bookmark, event) => {
      // The second click of a double-click: the dblclick handler below decides
      // what the whole sequence meant, so this click stays out of its way.
      if (event?.detail > 1) return;
      // Shift+click edits, mirroring Shift+Enter. A Shift+double-click still
      // ends in the editor: the first click's modal takes the second click on
      // its scrim, and the trailing dblclick re-opens it.
      if (event?.shiftKey) {
        edit(bookmark);
        return;
      }
      if (event?.metaKey || event?.ctrlKey || selectMode) {
        toggleMulti(bookmark);
        return;
      }
      // The gesture acts on the selected bookmark and selects an unselected one.
      if (selectedId === bookmark.id) {
        open(bookmark);
        return;
      }
      setSelectedId(bookmark.id);
      setMultiSelectedIds([]);
      openedIdRef.current = null;
    },
    [selectedId, open, edit, selectMode, toggleMulti]
  );

  const onBookmarkDoubleClick = useCallback(
    (bookmark, event) => {
      if (event?.shiftKey) {
        edit(bookmark);
        return;
      }
      // Multi-select stays a per-click gesture; the sequence's clicks did it.
      if (event?.metaKey || event?.ctrlKey) return;
      // #299: in the select mode the sequence's clicks already spoke — the
      // first toggled the set and the second was its trailing click — so a
      // plain double-tap stays a toggle and must not open or clear.
      if (selectMode) return;
      // Click 1 of this sequence already opened a selected bookmark. Only a
      // sequence that merely selected — click 1 on an unselected bookmark —
      // opens here, so a double-click always opens exactly one tab.
      if (openedIdRef.current === bookmark.id) return;
      open(bookmark);
    },
    [edit, open, selectMode]
  );

  const onBookmarkKeyDown = useCallback(
    (event, bookmark) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      // Holding either key auto-repeats into "second" keydowns that would open
      // a bookmark the user was only holding down on. One press is one gesture.
      if (event.repeat) return;
      // The edit gesture is Shift+Enter specifically; Shift+Space stays with
      // Space's normal two-stage path.
      if (event.shiftKey && event.key === "Enter") {
        edit(bookmark);
        return;
      }
      // Mirrors the click: in the select mode the activation toggles the set,
      // otherwise activation selects, and repeats on the selected bookmark
      // open it.
      if (selectMode) {
        toggleMulti(bookmark);
        return;
      }
      if (selectedId === bookmark.id) {
        open(bookmark);
        return;
      }
      setSelectedId(bookmark.id);
      setMultiSelectedIds([]);
      openedIdRef.current = null;
    },
    [selectedId, open, edit, selectMode, toggleMulti]
  );

  /** Whichever selection the user made: the focused bookmark, or the checked set. */
  const selectedIds = useMemo(() => {
    if (selectedId) return [selectedId];
    return multiSelectedIds.length ? [...multiSelectedIds] : [];
  }, [selectedId, multiSelectedIds]);

  return {
    selectedId,
    multiSelectedIds,
    selectedIds,
    /** #22: the visible (filtered) bookmarks, not everything in the store. */
    selectAll: setMultiSelectedIds,
    clear,
    onBookmarkClick,
    onBookmarkDoubleClick,
    onBookmarkKeyDown,
  };
}
