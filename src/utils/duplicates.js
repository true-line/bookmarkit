// ARCH-06: Duplicate detection extracted from BookmarkApp.jsx — pure function, no React deps.

import { normalizeUrl } from "./url.js";

/**
 * #45: Two bookmarks are the same when they point at the same page, regardless
 * of title — the same article saved twice usually differs in title, and the
 * title is the field a user edits. Bookmarks with no URL fall back to their
 * title so they do not all collide on the empty key.
 */
export const getDuplicateKey = (bookmark) => {
  const url = normalizeUrl(bookmark?.url);
  return url || `title:${(bookmark?.title || "").trim().toLowerCase()}`;
};

// #45: How much a copy is worth keeping. Deleting the annotated copy and keeping
// the bare one loses work that cannot be recovered from the other bookmark.
// Exported for #86, which decides the same question about a pair a model called
// the same page: one rule for which copy survives, not two.
export const metadataWeight = (bookmark) =>
  (bookmark?.tags?.length ? 1 : 0) +
  (bookmark?.rating ? 1 : 0) +
  (bookmark?.description?.trim() ? 1 : 0);

/**
 * Why the surviving copy of a pair is the survivor, as display tokens — the
 * metadata that decides it: present on the kept copy but not on the dropped
 * one (#285 codex — metadata both copies share explains nothing). When the
 * copies carry the same work the decision is #45's tie-break, so the token is
 * "earliest". A component resolves the tokens against the message catalogue;
 * nothing here builds a key string.
 * @param {object} keep The surviving copy.
 * @param {object} drop The dropped copy.
 * @returns {string[]}
 */
export const keepReasonTokens = (keep, drop) => {
  const tokens = [];
  if (keep?.tags?.length && !drop?.tags?.length) tokens.push("tags");
  if (keep?.rating && !drop?.rating) tokens.push("rating");
  if (keep?.description?.trim() && !drop?.description?.trim()) tokens.push("notes");
  return tokens.length > 0 ? tokens : ["earliest"];
};

/**
 * The pairs behind the duplicates: both copies, the survivor first, one entry
 * per copy that has to go. The copy carrying the most metadata wins; ties keep
 * the earliest occurrence. #285 reviews these pairs individually, so the
 * review shows both sides of every decision rather than a bare list of ids.
 * @param {Array} list
 * @returns {{keep: object, drop: object}[]}
 */
export const findDuplicatePairs = (list = []) => {
  const groups = new Map();
  for (const bookmark of list) {
    const key = getDuplicateKey(bookmark);
    const group = groups.get(key);
    if (group) group.push(bookmark);
    else groups.set(key, [bookmark]);
  }

  const pairs = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    // #285 codex: every copy pairs with the group's FINAL survivor. A streamed
    // keep would leave an early row pointing at a survivor a later row deletes
    // — unticking "keep A and B" could not save B from B-vs-C's checkbox.
    let keep = group[0];
    for (const bookmark of group) {
      if (metadataWeight(bookmark) > metadataWeight(keep)) keep = bookmark;
    }
    for (const bookmark of group) {
      if (bookmark !== keep) pairs.push({ keep, drop: bookmark });
    }
  }
  return pairs;
};

/**
 * Returns IDs of duplicate bookmarks — every copy except the one worth keeping.
 * The copy carrying the most metadata wins; ties keep the earliest occurrence.
 * @param {Array} list
 * @returns {string[]}
 */
export const findDuplicateIds = (list = []) => findDuplicatePairs(list).map(({ drop }) => drop.id);

/**
 * Filters import candidates using the same duplicate rule as findDuplicateIds:
 * a page already bookmarked is skipped, and among copies of one page inside the
 * batch the richest is imported. An export commonly lists a page twice, once
 * bare and once annotated, so picking the first occurrence would drop the tags.
 * Surviving copies keep the order they first appeared in.
 * @param {Array} incoming
 * @param {Array} existing
 * @returns {{ bookmarks: Array, skippedCount: number }}
 */
export const filterDuplicateImports = (incoming = [], existing = []) => {
  const alreadyHave = new Set(existing.map(getDuplicateKey));
  const chosen = new Map();

  for (const bookmark of incoming) {
    const key = getDuplicateKey(bookmark);
    if (alreadyHave.has(key)) continue;
    const kept = chosen.get(key);
    // Map.set keeps the original position for a key already present, so
    // replacing a copy does not move the import to the end of the batch.
    if (!kept || metadataWeight(bookmark) > metadataWeight(kept)) chosen.set(key, bookmark);
  }

  const bookmarks = [...chosen.values()];
  return {
    bookmarks,
    skippedCount: incoming.length - bookmarks.length,
  };
};
