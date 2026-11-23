// #283: How many bookmarks each navigation smart view would show, over the whole
// collection. Pure, and kept beside the filters it counts for rather than in the
// rail: a row wears the number, but it is the view's size, not the rail's.
//
// The link sweep's verdict outlives a render, so that count is the caller's to
// pass in; the rest follow from the bookmarks. The digest's is what arrived this
// week — the first of its three sections, by the digest's own rule.

import { WEEK_MS } from "./digest.js";
import { isUntagged } from "./manualFilters.js";
import { addedAt, isNeverOpened } from "./openHistory.js";

/**
 * @param {object[]} bookmarks
 * @param {number} brokenCount How many bookmarks the last link sweep found broken.
 * @param {number} [now]
 * @returns {{all: number, digest: number, neverOpened: number, untagged: number, brokenLinks: number}}
 */
export const viewCounts = (bookmarks, brokenCount, now = Date.now()) => {
  const cutoff = now - WEEK_MS;
  return {
    all: bookmarks.length,
    digest: bookmarks.filter((bookmark) => addedAt(bookmark) >= cutoff).length,
    neverOpened: bookmarks.filter(isNeverOpened).length,
    untagged: bookmarks.filter(isUntagged).length,
    brokenLinks: brokenCount,
  };
};
