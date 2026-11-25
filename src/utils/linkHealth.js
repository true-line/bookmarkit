// #47: Link rot, as data. Everything here is pure: which bookmarks are worth
// checking, what a check result means for the one that was checked, and how the
// record of past checks survives a reload. The fetching itself is urlStatus.js,
// and the pacing is useLinkSweep.js.

import { isPublicHttpUrl } from "./url.js";
import { normalizeStatusReason } from "./urlStatus.js";

/** A bookmark the last check could not reach. */
export const BROKEN = "invalid";

/** The user said this one is fine as it is — never check it, never call it broken. */
export const IGNORED = "ignored";

/** How many links one pass of the sweep checks before pausing. */
export const BATCH_SIZE = 5;

/** A link checked this recently is not worth checking again. */
export const RECHECK_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export const isBroken = (bookmark) =>
  bookmark?.urlStatus === BROKEN || bookmark?.unreachable === true;

/** The filter primitive behind both the manual toggle and the agent action. */
export const findBrokenLinks = (list = []) => list.filter(isBroken);

/**
 * A bookmark is checkable when there is a public http(s) URL to check and the
 * user has not opted it out. `isPublicHttpUrl` is the same gate the privileged
 * worker enforces (#10), applied here as well so the sweep never even asks about
 * an internal host.
 */
export const isCheckable = (bookmark) =>
  bookmark?.urlStatus !== IGNORED && isPublicHttpUrl(bookmark?.url);

/**
 * The next few bookmarks to check: never-checked ones first, then the ones
 * checked longest ago, so a sweep interrupted halfway resumes where it stopped
 * rather than starting over.
 *
 * @param {object[]} bookmarks
 * @param {Record<string, number>} checkedAt When each id was last checked, epoch ms.
 * @param {{now?: number, size?: number, recheckAfterMs?: number}} [options]
 */
export function nextSweepBatch(bookmarks = [], checkedAt = {}, options = {}) {
  const { now = Date.now(), size = BATCH_SIZE, recheckAfterMs = RECHECK_AFTER_MS } = options;
  return bookmarks
    .filter(isCheckable)
    .filter((b) => now - (checkedAt[b.id] ?? 0) >= recheckAfterMs)
    .sort((a, b) => (checkedAt[a.id] ?? 0) - (checkedAt[b.id] ?? 0))
    .slice(0, Math.max(0, size));
}

/** How many of these still want checking — the denominator of the progress line. */
export const countDue = (bookmarks = [], checkedAt = {}, options = {}) => {
  const { now = Date.now(), recheckAfterMs = RECHECK_AFTER_MS } = options;
  return bookmarks.filter((b) => isCheckable(b) && now - (checkedAt[b.id] ?? 0) >= recheckAfterMs)
    .length;
};

/**
 * What a check result should write, or null when it agrees with what is stored.
 *
 * Only `urlStatus` — and, alongside it, #295's `urlStatusReason`, the detail the
 * check learned about a failure: "http:404", "timeout", "unreachable". A valid
 * answer clears the reason, and an invalid one that fails *differently* than
 * last time is a change worth writing even though the verdict did not move.
 *
 * Only `urlStatus` is ever decided here. A redirect target is deliberately not
 * followed home: the privileged worker answers with `redirectUrl: null` by
 * design (#10), because a 30x Location can point at an internal host, and a
 * sweep that re-pointed bookmarks at whatever a redirect claimed would hand
 * that decision to the remote server.
 */
export function sweepPatch(bookmark, result) {
  if (!bookmark?.id) return null;
  const status = result?.status === "valid" ? "valid" : BROKEN;
  const reason = status === BROKEN ? normalizeStatusReason(result?.reason) : null;
  if (bookmark.urlStatus === status && (bookmark.urlStatusReason ?? null) === reason) return null;
  return { id: bookmark.id, urlStatus: status, urlStatusReason: reason };
}

/**
 * A stored reason as the words for it, via the catalogue: "HTTP 404", the
 * mockup's "DNS Unreachable" for the one kind a refused connection and a dead
 * name are indistinguishable as, "Timeout". ChangeReviewModal renders the same
 * helper in its diff, so a review and the row it came from say it one way.
 *
 * @param {unknown} reason
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 * @returns {string}
 */
export const statusReasonLabel = (reason, t) => {
  const normalized = normalizeStatusReason(reason);
  if (normalized === "timeout") return t("linkHealth.reasonTimeout");
  if (normalized === "unreachable") return t("linkHealth.reasonDns");
  if (normalized) return t("linkHealth.reasonHttp", { code: normalized.slice(5) });
  return t("linkHealth.reasonGeneric");
};

/**
 * When the sweep last ran, read back defensively — the same reason
 * `readCheckedAt` reads the way it does (#303's "Last scan 2h ago" line).
 * Absent or implausible means the sweep has never run where anyone can see.
 *
 * @param {unknown} raw
 * @returns {number|null} Epoch ms, or null.
 */
export function readLastSweepAt(raw) {
  const time = Number(raw);
  return Number.isFinite(time) && time > 0 ? time : null;
}

/**
 * How stale the sweep's verdicts are, as the relative-time arguments the i18n
 * formatter takes — a negative value is time past. "now" covers the first
 * minute, where "0 minutes ago" reads worse than the truth; null covers no
 * sweep at all, which callers hide rather than print.
 *
 * @param {number|null} lastSweepAt
 * @param {number} [now]
 * @returns {"now"|{value: number, unit: "minute"|"hour"|"day"}|null}
 */
export function scanAge(lastSweepAt, now = Date.now()) {
  const at = Number(lastSweepAt);
  if (!Number.isFinite(at) || at <= 0) return null;
  const elapsed = Math.max(0, now - at);
  if (elapsed < 60_000) return "now";
  if (elapsed < 3_600_000) return { value: -Math.floor(elapsed / 60_000), unit: "minute" };
  if (elapsed < 86_400_000) return { value: -Math.floor(elapsed / 3_600_000), unit: "hour" };
  return { value: -Math.floor(elapsed / 86_400_000), unit: "day" };
}

/**
 * The freshness line's words: when the sweep last ran, and how long ago that
 * was — "Last scan 2 hours ago". The age buckets are `scanAge`'s; the age
 * itself is the locale formatter's (`t.relative`), so a locale renders its
 * own units and order. No sweep, no line.
 *
 * @param {number|null} lastSweepAt
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 * @returns {string|null}
 */
export const lastScanLabel = (lastSweepAt, t) => {
  const age = scanAge(lastSweepAt);
  if (!age) return null;
  if (age === "now") return t("linkHealth.lastScanJustNow");
  return t("linkHealth.lastScanAgo", { age: t.relative(age.value, age.unit) });
};

/**
 * The stored record of past checks, read back defensively: storage is editable
 * by hand and survives across versions, so anything that is not an id mapped to
 * a plausible timestamp is dropped rather than trusted.
 */
export function readCheckedAt(raw) {
  const parsed = typeof raw === "string" ? tryParse(raw) : raw;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const clean = {};
  for (const [id, at] of Object.entries(parsed)) {
    const time = Number(at);
    if (id && Number.isFinite(time) && time > 0) clean[id] = time;
  }
  return clean;
}

function tryParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Note that these ids were just checked, forgetting bookmarks that are gone. */
export function recordChecked(checkedAt, ids = [], now = Date.now(), liveIds) {
  const next = { ...checkedAt };
  for (const id of ids) next[id] = now;
  if (!liveIds) return next;
  return Object.fromEntries(Object.entries(next).filter(([id]) => liveIds.has(id)));
}
