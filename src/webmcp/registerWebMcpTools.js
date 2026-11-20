// #212: Wiring the pure tool definitions onto a live `document.modelContext`.
//
// The one non-trivial property here is *when* the list is read: registration
// happens once, but `execute` must answer with the collection as it is at call
// time — bookmarks change while the tab sits open. So each tool is handed a
// `getList` closure rather than a list, and the hook that calls this keeps that
// closure pointed at fresh state.
//
// Unregistration rides the AbortSignal handed to `registerTool`: aborting it is
// the documented way to withdraw a tool, which is also what makes this safe
// under React's mount/unmount/remount cycle in development.

import {
  WEBMCP_TOOL_DEFINITIONS,
  executeListFolders,
  executeSearchBookmarks,
} from "./webmcpTools.js";

/**
 * Whether this document exposes WebMCP at all. The API is `document`-side (the
 * `navigator.modelContext` name some articles use does not exist), and it is
 * absent entirely in browsers that have not enabled it — in which case the whole
 * feature is dormant, not broken.
 */
export function isWebMcpSupported(doc) {
  const target = doc ?? (typeof document !== "undefined" ? document : null);
  return Boolean(target && "modelContext" in target && target.modelContext);
}

/**
 * Register the read-only tools on `modelContext`.
 *
 * @param {object} params
 * @param {object} params.modelContext A `document.modelContext`.
 * @param {() => object[]} params.getList Returns the bookmark list as it is now.
 * @param {AbortSignal} [params.signal] Aborted to unregister every tool.
 * @throws when `modelContext` cannot register tools — callers decide how loud
 *   that should be; the app warns and carries on.
 */
export async function registerWebMcpTools({ modelContext, getList, signal } = {}) {
  if (!modelContext || typeof modelContext.registerTool !== "function") {
    throw new Error("WebMCP is not available on this document.");
  }
  const executors = { search_bookmarks: executeSearchBookmarks, list_folders: executeListFolders };
  for (const definition of WEBMCP_TOOL_DEFINITIONS) {
    const execute = executors[definition.name];
    await modelContext.registerTool(
      { ...definition, execute: (args = {}) => execute(args, getList() ?? []) },
      { signal }
    );
  }
}
