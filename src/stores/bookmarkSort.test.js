import { describe, it, expect } from "vitest";
import { sortBookmarksByField } from "./bookmarkSort.js";

// One comparator for all three stores (#359): the copies used to drift, and
// the Firebase copy silently no-op'd a folder sort.
describe("sortBookmarksByField", () => {
  const bookmark = (over) => ({ id: "x", title: "x", url: "https://x.example", ...over });

  it("maps the agent plan's folder key onto the stored folderId", () => {
    const bookmarks = [
      bookmark({ id: "work", folderId: "Work" }),
      bookmark({ id: "root", folderId: "" }),
      bookmark({ id: "archive", folderId: "Archive" }),
    ];

    const sorted = sortBookmarksByField(bookmarks, { sortBy: "folder", order: "asc" });

    expect(sorted.map((b) => b.id)).toEqual(["root", "archive", "work"]);
  });

  it("compares the two timestamps as instants, not spellings", () => {
    // The January-spelled stamp is earlier in time: its instant is 22:30Z on
    // the 31st, against 23:00Z for the literally-smaller January string.
    const bookmarks = [
      bookmark({ id: "spelled-first", createdAt: "2026-01-31T23:00:00.000Z" }),
      bookmark({ id: "happened-first", createdAt: "2026-02-01T00:30:00.000+02:00" }),
    ];

    expect(
      sortBookmarksByField(bookmarks, { sortBy: "createdAt", order: "asc" }).map((b) => b.id)
    ).toEqual(["happened-first", "spelled-first"]);
  });

  it("treats updatedAt the same way", () => {
    const bookmarks = [
      bookmark({ id: "old", updatedAt: "2026-01-31T23:00:00.000Z" }),
      bookmark({ id: "newer", updatedAt: "2026-02-01T00:30:00.000+02:00" }),
    ];

    expect(
      sortBookmarksByField(bookmarks, { sortBy: "updatedAt", order: "asc" }).map((b) => b.id)
    ).toEqual(["newer", "old"]);
  });

  it("sorts a missing timestamp as the epoch", () => {
    const bookmarks = [
      bookmark({ id: "stamped", createdAt: "1970-01-01T00:00:00.001Z" }),
      bookmark({ id: "bare" }),
    ];

    expect(sortBookmarksByField(bookmarks, { sortBy: "createdAt" }).map((b) => b.id)).toEqual([
      "bare",
      "stamped",
    ]);
  });

  it("sorts rating numerically, unrated as zero", () => {
    const bookmarks = [
      bookmark({ id: "three", rating: 3 }),
      bookmark({ id: "unrated" }),
      bookmark({ id: "five", rating: 5 }),
    ];

    const sorted = sortBookmarksByField(bookmarks, { sortBy: "rating", order: "asc" });

    expect(sorted.map((b) => b.id)).toEqual(["unrated", "three", "five"]);
  });

  it("compares strings case-insensitively", () => {
    const bookmarks = [
      bookmark({ id: "upper", title: "Alpha" }),
      bookmark({ id: "lower", title: "aardvark" }),
    ];

    expect(sortBookmarksByField(bookmarks).map((b) => b.id)).toEqual(["lower", "upper"]);
  });

  it("reverses for desc without mutating the caller's array", () => {
    const bookmarks = [
      bookmark({ id: "a", folderId: "Work" }),
      bookmark({ id: "b", folderId: "" }),
    ];

    const sorted = sortBookmarksByField(bookmarks, { sortBy: "folder", order: "desc" });

    expect(sorted.map((b) => b.id)).toEqual(["a", "b"]);
    expect(bookmarks.map((b) => b.id)).toEqual(["a", "b"]);
  });
});
