// #55: The folders, as somewhere to stand.
//
// Until now a folder could only be typed into a text field, so browsing meant
// remembering. This shows the tree the collection already implies (utils/folderTree.js
// derives it), filters by a click, and accepts a drop.
//
// It decides nothing about what a move means. Every gesture here hands paths and
// ids to the caller, which applies them through the same bulk-edit write as the
// bar does — so dragging thirty bookmarks is one undo entry, and this file has no
// idea a store exists.
//
// #283: in the navigation sidebar the tree stands without its root row (the All
// Bookmarks view above it is that row), with "No folder" always present as the
// drop target for the root, a caption of the caller's, and its per-row rename
// and remove actions behind a `manageable` switch — the sidebar's "Manage
// folders". All four default to the pane's behavior, which is unchanged.

import React, { useMemo, useState } from "react";
import { keepsSelectionProps } from "../hooks/useBookmarkSelection.js";
import { UNFILED, buildFolderTree, folderName, parentFolder } from "../utils/folderTree.js";
import { Button, IconButton, InputField } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import { FolderIcon } from "./icons.jsx";

// #250: the folder pane migrates with the chrome region — mockup sidebar rows
// (36px minimum, tonal hover, the active folder on surface-container-highest),
// label-sm tabular counts, design-system buttons and inputs. The row/state
// classes live in index.css beside the app's other chrome compositions.

/** What a drag is carrying. Two kinds, because a folder drop renests and a bookmark drop moves. */
export const DRAG_BOOKMARKS = "application/x-bookmarkit-bookmarks";
export const DRAG_FOLDER = "application/x-bookmarkit-folder";

/** The ids a drag is carrying, or `[]` when it is carrying something else. */
const draggedIds = (event) => {
  try {
    const raw = event.dataTransfer?.getData(DRAG_BOOKMARKS);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
};

// #346: `flat` drops the depth indent — the mini rail's icon rows all stand
// at the rail's edge, the nesting living only in the rows' tooltips.
const Row = ({ depth = 0, active, flat = false, children, ...props }) => (
  <div
    className={`ui-tree-row ${active ? "ui-tree-row--active" : ""}`}
    style={flat ? undefined : { paddingInlineStart: `${depth * 0.75 + 0.25}rem` }}
    {...props}
  >
    {children}
  </div>
);

const Count = ({ node, active }) => {
  const t = useMessages();
  return (
    <span className={`ui-tree-count ${active ? "ui-tree-count--active" : ""}`}>
      {t.count(node.total)}
      {node.total !== node.count && (
        <span title={t("folderTree.countTitle", { count: node.count })}>*</span>
      )}
    </span>
  );
};

/**
 * One folder and everything under it. Renaming is inline: the row becomes the
 * field, so the tree keeps its place instead of a dialog taking over.
 */
function FolderNode({
  node,
  depth,
  activeFolder,
  collapsed,
  onToggle,
  actions,
  manageable,
  iconOnly,
}) {
  const t = useMessages();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(node.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [dropping, setDropping] = useState(false);
  const isCollapsed = collapsed.has(node.path.toLowerCase());
  const active = activeFolder === node.path;

  const rename = () => {
    const name = draft.trim();
    setRenaming(false);
    if (!name || name === node.name) return;
    actions.onRename(node.path, name);
  };

  const drop = (event) => {
    event.preventDefault();
    setDropping(false);
    actions.onDropInto(event, node.path);
  };

  // The mini rail carries no rename field — a 64px input is unreadable, and
  // its caller has already folded the manage switch away with the caption.
  if (renaming && !iconOnly) {
    return (
      <li>
        <Row depth={depth}>
          <InputField
            id={`folder-rename-${node.path}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={rename}
            onKeyDown={(event) => {
              if (event.key === "Enter") rename();
              if (event.key === "Escape") setRenaming(false);
            }}
            aria-label={t("folderTree.rename", { path: node.path })}
            wrapperClassName="flex-1"
            autoFocus
          />
        </Row>
      </li>
    );
  }

  return (
    <li>
      <Row
        depth={depth}
        flat={iconOnly}
        active={active || dropping}
        onDragOver={(event) => {
          event.preventDefault();
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={drop}
      >
        {!iconOnly &&
          (node.children.length > 0 ? (
            <button
              type="button"
              onClick={() => onToggle(node.path)}
              aria-label={t(isCollapsed ? "folderTree.expand" : "folderTree.collapse", {
                name: node.name,
              })}
              aria-expanded={!isCollapsed}
              className="ui-tree-toggle"
            >
              {isCollapsed ? "▸" : "▾"}
            </button>
          ) : (
            <span className="ui-tree-toggle" aria-hidden="true" />
          ))}

        <button
          type="button"
          draggable
          onDragStart={(event) => event.dataTransfer?.setData(DRAG_FOLDER, node.path)}
          onClick={() => actions.onSelect(active ? "" : node.path)}
          aria-pressed={active}
          className={
            iconOnly
              ? "flex flex-1 min-w-0 items-center justify-center truncate"
              : "flex-1 min-w-0 text-start truncate"
          }
          title={node.path}
          aria-label={iconOnly ? node.name : undefined}
        >
          {iconOnly ? <FolderIcon size={18} /> : node.name}
        </button>

        {!iconOnly && <Count node={node} active={active || dropping} />}

        {/* The row's actions wait for "Manage folders" where the caller has one. */}
        {manageable && (
          <>
            <IconButton
              label={t("folderTree.rename", { path: node.path })}
              onClick={() => {
                setDraft(node.name);
                setRenaming(true);
              }}
            >
              ✎
            </IconButton>
            <IconButton
              label={t("folderTree.removeFolder", { path: node.path })}
              onClick={() => setConfirmingDelete(true)}
            >
              ✕
            </IconButton>
          </>
        )}
      </Row>

      {/* Deleting a folder never deletes bookmarks, so the offer has to say where they go. */}
      {confirmingDelete && (
        <div className="ms-6 my-1 text-xs text-[var(--ui-on-surface-variant)]">
          <p className="mb-1">
            {t("folderTree.deleteConfirm", {
              count: node.total,
              folder: parentFolder(node.path) || t("common.noFolder"),
            })}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              intent="destructive"
              onClick={() => {
                setConfirmingDelete(false);
                actions.onDelete(node.path);
              }}
            >
              {t("folderTree.remove")}
            </Button>
            <Button type="button" intent="secondary" onClick={() => setConfirmingDelete(false)}>
              {t("folderTree.keep")}
            </Button>
          </div>
        </div>
      )}

      {/* Folded, the rail shows every folder flat — the collapse carets are
          gone, so the tree cannot hide anything from 64px of icons. */}
      {(iconOnly || !isCollapsed) && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <FolderNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFolder={activeFolder}
              collapsed={collapsed}
              onToggle={onToggle}
              actions={actions}
              manageable={manageable}
              iconOnly={iconOnly}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

const FolderTree = React.memo(function FolderTree({
  bookmarks = [],
  activeFolder = "",
  onSelect,
  onMoveBookmarks,
  onMoveFolder,
  onRenameFolder,
  onDeleteFolder,
  className = "",
  // #283: the sidebar's three differences from the pane, each optional.
  /** Rendered inside the nav, above the list — a caption and its controls. */
  header = null,
  /** Whether the tree's own "All bookmarks" row opens the list. */
  showRoot = true,
  /** Keep the "No folder" row even when nothing is unfiled: it is the root's drop target. */
  alwaysShowUnfiled = false,
  /** Whether each row shows its rename and remove actions. */
  manageable = true,
  /** #346: the mini rail's reading — icon rows, flat, named by tooltip,
      every folder visible (there are no carets to hide behind). */
  iconOnly = false,
}) {
  const t = useMessages();
  const [collapsed, setCollapsed] = useState(() => new Set());
  const { folders, unfiled, total } = useMemo(() => buildFolderTree(bookmarks), [bookmarks]);

  const onToggle = (path) =>
    setCollapsed((current) => {
      const next = new Set(current);
      const key = path.toLowerCase();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // A drop is one of two things, and both are told as full paths — the callers
  // apply patches and never have to know how a path is put together. `into` is
  // the destination folder, `""` being the root.
  const onDropInto = (event, into) => {
    const ids = draggedIds(event);
    if (ids.length > 0) {
      onMoveBookmarks(ids, into === "" ? UNFILED : into);
      return;
    }
    const dragged = event.dataTransfer?.getData(DRAG_FOLDER);
    if (!dragged) return;
    const name = folderName(dragged);
    onMoveFolder(dragged, into ? `${into}/${name}` : name);
  };

  // Renaming keeps a folder where it is, so what the caller gets is the same path
  // with its last segment replaced.
  const actions = {
    onSelect,
    onDropInto,
    onRename: (path, name) => {
      const parent = parentFolder(path);
      onRenameFolder(path, parent ? `${parent}/${name}` : name);
    },
    onDelete: onDeleteFolder,
  };

  const dropOnRoot = (event) => {
    event.preventDefault();
    onDropInto(event, "");
  };

  return (
    // Clicking a folder must not dismiss the selection a drop is about to move.
    <nav
      className={`overflow-y-auto ${className}`}
      aria-label={t("folderTree.treeLabel")}
      {...keepsSelectionProps}
    >
      {header}
      <ul>
        {showRoot && (
          <li onDragOver={(event) => event.preventDefault()} onDrop={dropOnRoot}>
            <Row active={activeFolder === ""} flat={iconOnly}>
              {!iconOnly && <span className="w-4 shrink-0" aria-hidden="true" />}
              <button
                type="button"
                onClick={() => onSelect("")}
                aria-pressed={activeFolder === ""}
                className={
                  iconOnly
                    ? "flex flex-1 min-w-0 items-center justify-center truncate"
                    : "flex-1 min-w-0 text-start truncate"
                }
                aria-label={iconOnly ? t("folderTree.allBookmarks") : undefined}
              >
                {iconOnly ? <FolderIcon size={18} /> : t("folderTree.allBookmarks")}
              </button>
              {!iconOnly && (
                <span
                  className={`ui-tree-count ${activeFolder === "" ? "ui-tree-count--active" : ""}`}
                >
                  {t.count(total)}
                </span>
              )}
            </Row>
          </li>
        )}

        {folders.map((node) => (
          <FolderNode
            key={node.path}
            node={node}
            depth={0}
            activeFolder={activeFolder}
            collapsed={collapsed}
            onToggle={onToggle}
            actions={actions}
            manageable={manageable}
            iconOnly={iconOnly}
          />
        ))}

        {(unfiled > 0 || alwaysShowUnfiled) && (
          <li onDragOver={(event) => event.preventDefault()} onDrop={dropOnRoot}>
            <Row active={activeFolder === UNFILED} flat={iconOnly}>
              {!iconOnly && <span className="w-4 shrink-0" aria-hidden="true" />}
              <button
                type="button"
                onClick={() => onSelect(activeFolder === UNFILED ? "" : UNFILED)}
                aria-pressed={activeFolder === UNFILED}
                className={
                  iconOnly
                    ? "flex flex-1 min-w-0 items-center justify-center truncate"
                    : "flex-1 min-w-0 text-start truncate"
                }
                aria-label={iconOnly ? t("folderTree.noFolder") : undefined}
              >
                {iconOnly ? <FolderIcon size={18} /> : t("folderTree.noFolder")}
              </button>
              {!iconOnly && (
                <span
                  className={`ui-tree-count ${
                    activeFolder === UNFILED ? "ui-tree-count--active" : ""
                  }`}
                >
                  {t.count(unfiled)}
                </span>
              )}
            </Row>
          </li>
        )}
      </ul>
    </nav>
  );
});

export default FolderTree;
