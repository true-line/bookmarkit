// The comparator behind every store's persistSortedOrder, written once so the
// same collection under the same sort cannot answer differently per backend
// (#359). Each store used to carry its own copy, and the Firebase one had
// drifted: it read the raw `folder` key — the agent plan's name for it, never
// a stored field — so a folder sort there compared undefined with undefined
// and left the order alone, and it compared the two timestamps by their
// spelling, so a differently formatted date sorted by how it was written
// rather than when it happened.

/**
 * Order bookmarks by `sortBy` ("asc" or "desc"), leaving the caller's array
 * alone. The key mapping and the per-field handling are the local stores'
 * long-standing semantics, which the sort menu (utils/manualFilters.js
 * SORT_FIELDS) and the agent plan (llm/normalize.js SORT_BY_VALUES) both
 * feed into.
 * @template T
 * @param {T[]} bookmarks
 * @param {object} options
 * @param {string} [options.sortBy] A SORT_FIELDS value, plus "folder".
 * @param {string} [options.order] "asc" or "desc".
 * @returns {T[]} A new array, ordered.
 */
export function sortBookmarksByField(bookmarks, { sortBy = "title", order = "asc" } = {}) {
  // The plan schema says "folder"; the field every store keeps is "folderId".
  const key = sortBy === "folder" ? "folderId" : sortBy;
  return [...bookmarks].sort((a, b) => {
    let valA = a[key] ?? "";
    let valB = b[key] ?? "";
    if (key === "rating") {
      valA = a.rating || 0;
      valB = b.rating || 0;
    } else if (key === "createdAt" || key === "updatedAt") {
      // Timestamps arrive as strings in every store (Firestore keeps ISO
      // strings; the local stores keep whatever the meta write put there),
      // and a string comparison ranks them by formatting, not by instant.
      valA = a[key] ? new Date(a[key]).getTime() : 0;
      valB = b[key] ? new Date(b[key]).getTime() : 0;
    } else {
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
    }
    if (order === "asc") return valA < valB ? -1 : valA > valB ? 1 : 0;
    return valA > valB ? -1 : valA < valB ? 1 : 0;
  });
}
