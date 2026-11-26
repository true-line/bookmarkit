import { describe, expect, it } from "vitest";

import {
  BROKEN,
  countDue,
  findBrokenLinks,
  isBroken,
  isCheckable,
  lastScanLabel,
  nextSweepBatch,
  nextScanAgeChange,
  readCheckedAt,
  readLastSweepAt,
  recordChecked,
  scanAge,
  statusReasonLabel,
  sweepPatch,
} from "./linkHealth.js";

const bookmark = (id, extra = {}) => ({
  id,
  title: id,
  url: `https://example.com/${id}`,
  urlStatus: "valid",
  ...extra,
});

const DAY = 24 * 60 * 60 * 1000;

describe("findBrokenLinks", () => {
  it("keeps the ones the last check could not reach", () => {
    const list = [
      bookmark("a"),
      bookmark("b", { urlStatus: BROKEN }),
      bookmark("c", { unreachable: true }),
      bookmark("d", { urlStatus: "ignored" }),
    ];

    expect(findBrokenLinks(list).map((b) => b.id)).toEqual(["b", "c"]);
  });

  it("does not call an ignored link broken", () => {
    expect(isBroken(bookmark("a", { urlStatus: "ignored" }))).toBe(false);
  });
});

describe("isCheckable", () => {
  it("refuses what a click would refuse, and what the user opted out", () => {
    expect(isCheckable(bookmark("a"))).toBe(true);
    expect(isCheckable(bookmark("b", { url: "javascript:alert(1)" }))).toBe(false);
    expect(isCheckable(bookmark("c", { url: "chrome://extensions" }))).toBe(false);
    expect(isCheckable(bookmark("d", { urlStatus: "ignored" }))).toBe(false);
    expect(isCheckable({ id: "e" })).toBe(false);
  });
});

describe("nextSweepBatch", () => {
  const now = 40 * DAY;

  it("takes the never-checked first, then the longest ago", () => {
    const list = [bookmark("recent"), bookmark("old"), bookmark("never")];
    const checkedAt = { recent: now - 8 * DAY, old: now - 30 * DAY };

    const batch = nextSweepBatch(list, checkedAt, { now, size: 3, recheckAfterMs: 7 * DAY });

    expect(batch.map((b) => b.id)).toEqual(["never", "old", "recent"]);
  });

  it("leaves alone what was checked recently enough", () => {
    const list = [bookmark("a"), bookmark("b")];
    const checkedAt = { a: now - 1 * DAY, b: now - 20 * DAY };

    expect(nextSweepBatch(list, checkedAt, { now, recheckAfterMs: 7 * DAY })).toHaveLength(1);
  });

  it("hands back one batch at a time, so a big collection is swept in passes", () => {
    const list = Array.from({ length: 12 }, (_, i) => bookmark(`b${i}`));

    expect(nextSweepBatch(list, {}, { now, size: 5 })).toHaveLength(5);
    expect(countDue(list, {}, { now })).toBe(12);
  });

  it("skips the links it would never fetch", () => {
    const list = [
      bookmark("ok"),
      bookmark("ignored", { urlStatus: "ignored" }),
      bookmark("internal", { url: "http://127.0.0.1:8080/admin" }),
    ];

    expect(nextSweepBatch(list, {}, { now }).map((b) => b.id)).toEqual(["ok"]);
  });
});

describe("sweepPatch", () => {
  it("writes only when the status changed", () => {
    expect(sweepPatch(bookmark("a"), { status: "valid" })).toBeNull();
    expect(sweepPatch(bookmark("a"), { status: "invalid" })).toEqual({
      id: "a",
      urlStatus: BROKEN,
      urlStatusReason: null,
    });
    expect(sweepPatch(bookmark("a", { urlStatus: BROKEN }), { status: "valid" })).toEqual({
      id: "a",
      urlStatus: "valid",
      urlStatusReason: null,
    });
  });

  // #295: the check's failure detail rides with the verdict, and a failure
  // that fails differently than last time is a change worth writing even
  // though the verdict did not move.
  it("keeps what the check learned about a failure", () => {
    expect(
      sweepPatch(bookmark("a", { urlStatus: BROKEN }), { status: "invalid", reason: "http:404" })
    ).toEqual({ id: "a", urlStatus: BROKEN, urlStatusReason: "http:404" });

    // A pass clears the detail; a different failure replaces it.
    expect(
      sweepPatch(bookmark("a", { urlStatus: BROKEN, urlStatusReason: "http:404" }), {
        status: "invalid",
      })
    ).toEqual({ id: "a", urlStatus: BROKEN, urlStatusReason: null });

    expect(
      sweepPatch(bookmark("a", { urlStatus: BROKEN, urlStatusReason: "http:404" }), {
        status: "invalid",
        reason: "timeout",
      })
    ).toEqual({ id: "a", urlStatus: BROKEN, urlStatusReason: "timeout" });

    // Same verdict, same detail: nothing to write.
    expect(
      sweepPatch(bookmark("a", { urlStatus: BROKEN, urlStatusReason: "timeout" }), {
        status: "invalid",
        reason: "timeout",
      })
    ).toBeNull();
  });

  // #10: a redirect target from a privileged fetch is not something to trust,
  // and the worker does not disclose one. A sweep must not re-point a bookmark.
  it("never rewrites the URL, even when a redirect is reported", () => {
    const patch = sweepPatch(bookmark("a", { urlStatus: BROKEN }), {
      status: "valid",
      redirectUrl: "http://169.254.169.254/latest/meta-data",
    });

    expect(patch).toEqual({ id: "a", urlStatus: "valid", urlStatusReason: null });
  });

  it("treats anything that is not a clean pass as broken", () => {
    expect(sweepPatch(bookmark("a"), {})).toEqual({
      id: "a",
      urlStatus: BROKEN,
      urlStatusReason: null,
    });
    expect(sweepPatch(bookmark("a"), { status: "idle" })).toEqual({
      id: "a",
      urlStatus: BROKEN,
      urlStatusReason: null,
    });
  });
});

describe("the record of past checks", () => {
  it("reads back what it wrote", () => {
    const stored = JSON.stringify(recordChecked({}, ["a", "b"], 1234));

    expect(readCheckedAt(stored)).toEqual({ a: 1234, b: 1234 });
  });

  it("drops anything that is not a time", () => {
    expect(readCheckedAt('{"a": "yesterday", "b": -1, "c": 5}')).toEqual({ c: 5 });
    expect(readCheckedAt("not json")).toEqual({});
    expect(readCheckedAt(undefined)).toEqual({});
    expect(readCheckedAt("[1,2]")).toEqual({});
  });

  it("forgets bookmarks that are gone, so it cannot grow without bound", () => {
    const before = { gone: 1, kept: 1 };

    expect(recordChecked(before, ["kept"], 2, new Set(["kept"]))).toEqual({ kept: 2 });
  });
});

// #303: the freshness line's inputs — when the sweep last ran, read back
// from storage; how stale that is, as the relative-time formatter's args;
// and the words the view puts around them.
describe("scanAge and the sweep's freshness (#303)", () => {
  const now = 100 * DAY;

  it("reads back a plausible timestamp, and nothing else", () => {
    expect(readLastSweepAt("1234567890")).toBe(1234567890);
    expect(readLastSweepAt(1234567890)).toBe(1234567890);
    expect(readLastSweepAt("not a time")).toBeNull();
    expect(readLastSweepAt("-5")).toBeNull();
    expect(readLastSweepAt(undefined)).toBeNull();
    expect(readLastSweepAt(null)).toBeNull();
  });

  it("buckets the age the way a person reads it", () => {
    expect(scanAge(now - 30 * 1000, now)).toBe("now");
    expect(scanAge(now - 2 * 60 * 1000, now)).toEqual({ value: -2, unit: "minute" });
    expect(scanAge(now - 2 * 60 * 60 * 1000, now)).toEqual({ value: -2, unit: "hour" });
    expect(scanAge(now - 3 * DAY, now)).toEqual({ value: -3, unit: "day" });
  });

  it("says nothing when no sweep has run, and never points at the future", () => {
    expect(scanAge(null, now)).toBeNull();
    expect(scanAge(undefined, now)).toBeNull();
    expect(scanAge(0, now)).toBeNull();
    // A clock that ran backwards between writes reads as brand new.
    expect(scanAge(now + 5 * DAY, now)).toBe("now");
  });

  it("names the boundary the words are about to cross", () => {
    // Inside the first minute: the turn to "1 minute ago".
    expect(nextScanAgeChange(now - 30 * 1000, now)).toBe(30 * 1000);
    // Inside the minutes: the next minute mark, not the hour's.
    expect(nextScanAgeChange(now - 90 * 1000, now)).toBe(30 * 1000);
    expect(nextScanAgeChange(now - 59 * 60 * 1000, now)).toBe(60 * 1000);
    // Inside the hours: the next hour mark.
    expect(nextScanAgeChange(now - 2 * 60 * 60 * 1000, now)).toBe(60 * 60 * 1000);
    // Inside the days: the next day mark.
    expect(nextScanAgeChange(now - 25 * 60 * 60 * 1000, now)).toBe(23 * 60 * 60 * 1000);
  });

  it("names no boundary when no sweep has run", () => {
    expect(nextScanAgeChange(null, now)).toBeNull();
    expect(nextScanAgeChange(0, now)).toBeNull();
    expect(nextScanAgeChange(undefined, now)).toBeNull();
  });

  it("words the line from the locale's own formatter", () => {
    const t = (key, params) => {
      const catalogue = {
        "linkHealth.lastScanJustNow": "Last scan just now",
        "linkHealth.lastScanAgo": `Last scan ${params?.age}`,
      };
      return catalogue[key];
    };
    // The shape the real translator carries (i18n/index.js), in English words.
    t.relative = (value, unit) => `${-value} ${unit}${-value === 1 ? "" : "s"} ago`;

    // The clock is injectable, so a timer can re-read one instant (#303).
    expect(lastScanLabel(100 * DAY - 30 * 1000, t, 100 * DAY)).toBe("Last scan just now");
    expect(lastScanLabel(100 * DAY - 2 * 60 * 60 * 1000, t, 100 * DAY)).toBe(
      "Last scan 2 hours ago"
    );
    expect(lastScanLabel(null, t, 100 * DAY)).toBeNull();
  });
});

describe("statusReasonLabel (#295)", () => {
  const t = (key, params) => {
    const catalogue = {
      "linkHealth.reasonHttp": `HTTP ${params?.code}`,
      "linkHealth.reasonDns": "DNS Unreachable",
      "linkHealth.reasonTimeout": "Timeout",
      "linkHealth.reasonGeneric": "Unreachable",
    };
    return catalogue[key];
  };

  it("names the three shapes a check distinguishes", () => {
    expect(statusReasonLabel("http:404", t)).toBe("HTTP 404");
    expect(statusReasonLabel("http:503", t)).toBe("HTTP 503");
    expect(statusReasonLabel("unreachable", t)).toBe("DNS Unreachable");
    expect(statusReasonLabel("timeout", t)).toBe("Timeout");
  });

  it("still has words for a failure no detail survived for", () => {
    expect(statusReasonLabel(null, t)).toBe("Unreachable");
    expect(statusReasonLabel(undefined, t)).toBe("Unreachable");
    expect(statusReasonLabel("junk", t)).toBe("Unreachable");
  });
});
