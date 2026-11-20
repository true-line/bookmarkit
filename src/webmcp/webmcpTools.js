// #212: The read-only tools BookmarkIt offers browser agents through WebMCP
// (`document.modelContext`), and the pure functions behind them.
//
// Everything an agent can ask for is a projection of the in-memory list the app
// already holds, built from the same pure functions the manual filters use — so
// an agent's `tags: ["work"]` and the tag chip in the UI agree by construction
// rather than by coordination. Two rules shape every tool here:
//
// - Read-only. A tool call can never reach a store, so there is nothing to
//   confirm, undo, or abuse. Write-shaped agent requests stay a follow-up that
//   would have to arrive as proposals through the review flow.
// - Bounded. An agent's context is a shared, scarce resource, so every response
//   is `items` truncated to `limit` plus the true `total` — the caller can know
//   there is more without being handed more.
//
// Results keep the store's order. Manual sort wins everywhere else in the app;
// an agent tool that could re-sort would be a second opinion about order the
// user never asked it to have.

import { filterByRating, findWithTags, searchBookmarks } from "../utils/bookmarkFilters.js";
import { UNFILED, buildFolderTree, findInFolder } from "../utils/folderTree.js";

export const DEFAULT_RESULT_LIMIT = 20;
export const MAX_RESULT_LIMIT = 100;

/** The folder value the wire schema uses for "bookmarks in no folder at all". */
export const UNFILED_FOLDER_VALUE = "unfiled";

const clampLimit = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_RESULT_LIMIT;
  return Math.min(Math.floor(n), MAX_RESULT_LIMIT);
};

/**
 * A bookmark as an agent should see it: the fields that describe and locate it,
 * and nothing else. Internal bookkeeping (health probes, open counts, stored
 * icon sources) is neither asked for nor leaked.
 */
const toSearchItem = (b) => ({
  id: b.id,
  title: b.title ?? "",
  url: b.url ?? "",
  folder: b.folderId ?? "",
  tags: Array.isArray(b.tags) ? b.tags : [],
  rating: typeof b.rating === "number" ? b.rating : 0,
  description: b.description ?? "",
  createdAt: b.createdAt ?? null,
  updatedAt: b.updatedAt ?? null,
});

const envelope = (items, total, limit) => ({
  items,
  total,
  limit,
  truncated: items.length < total,
});

/**
 * `search_bookmarks`: free text over title/URL/description/tags, narrowed by
 * tag, folder (subfolders included, per `findInFolder`), and minimum rating.
 * Every filter is optional; none means browse, in the user's own order.
 */
export function executeSearchBookmarks(args, list = []) {
  const input = args ?? {};
  const query = typeof input.query === "string" ? input.query : "";
  const tags = Array.isArray(input.tags) ? input.tags : [];
  const folder = typeof input.folder === "string" ? input.folder.trim() : "";
  const minRating = Number.isFinite(input.minRating) ? input.minRating : null;

  let results = searchBookmarks(query, list);
  if (tags.length > 0) results = findWithTags(tags, [], results);
  if (folder) {
    // The sentinel travels as a plain word because the app's own control
    // character would be a strange thing to ask a model to type.
    results = findInFolder(
      folder.toLowerCase() === UNFILED_FOLDER_VALUE ? UNFILED : folder,
      results
    );
  }
  if (minRating !== null) results = filterByRating({ minRating }, results);

  const limit = clampLimit(input.limit);
  return envelope(results.slice(0, limit).map(toSearchItem), results.length, limit);
}

/**
 * `list_folders`: the folder tree the collection implies, flattened. `count` is
 * what sits directly in the folder, `total` what sits anywhere beneath it — the
 * same distinction the folder sheet shows, for the same reason.
 */
export function executeListFolders(args, list = []) {
  const tree = buildFolderTree(list);
  const folders = [];
  const walk = (nodes) => {
    for (const node of nodes) {
      folders.push({ path: node.path, name: node.name, count: node.count, total: node.total });
      walk(node.children);
    }
  };
  walk(tree.folders);

  const limit = clampLimit(args?.limit);
  return {
    ...envelope(folders.slice(0, limit), folders.length, limit),
    unfiled: tree.unfiled,
    bookmarksTotal: tree.total,
  };
}

// ─── Tool definitions ────────────────────────────────────────────────────────
//
// Descriptions are written for a model that has never seen this app: they say
// what matches, what the values mean, and what the tool refuses to do. `execute`
// is bound at registration time, over a getter for the current list, in
// registerWebMcpTools.js.

export const searchBookmarksTool = {
  name: "search_bookmarks",
  description:
    "Search this browser's saved bookmarks. Free text matches the title, URL, " +
    "description, and tags of each bookmark (case-insensitive). Narrow further " +
    'with tags (all must match), folder (subfolders included; "unfiled" means ' +
    "no folder), or minRating (0-5). Omit every filter to browse. Results keep " +
    "the user's own order — this tool cannot sort or change anything — and are " +
    "truncated to limit, with the true match count in total.",
  annotations: { readOnlyHint: true },
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Free-text search terms." },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Tags every result must carry.",
      },
      folder: {
        type: "string",
        description: 'Folder path like "Work/ML", or "unfiled". Subfolders included.',
      },
      minRating: { type: "integer", minimum: 0, maximum: 5 },
      limit: { type: "integer", minimum: 1, maximum: MAX_RESULT_LIMIT },
    },
    additionalProperties: false,
  },
};

export const listFoldersTool = {
  name: "list_folders",
  description:
    'List the folder paths this bookmark collection implies, separated by "/". ' +
    "A folder exists because bookmarks point at it: count is what sits directly " +
    "in it, total what sits anywhere beneath it, and unfiled is how many " +
    "bookmarks have no folder at all. Read-only.",
  annotations: { readOnlyHint: true },
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "integer", minimum: 1, maximum: MAX_RESULT_LIMIT },
    },
    additionalProperties: false,
  },
};

/** The definitions registration binds, in registration order. */
export const WEBMCP_TOOL_DEFINITIONS = [searchBookmarksTool, listFoldersTool];
