import { describe, it, expect } from "vitest";
import {
  getDuplicateKey,
  findDuplicateIds,
  findDuplicatePairs,
  keepReasonTokens,
  filterDuplicateImports,
} from "./duplicates.js";

describe("getDuplicateKey", () => {
  it("is case-insensitive and trims the url", () => {
    expect(getDuplicateKey({ title: "  Hello ", url: "HTTP://X.COM " })).toBe(
      getDuplicateKey({ title: "hello", url: "http://x.com" })
    );
  });

  it("ignores the title, so the same page saved under two names matches (#45)", () => {
    expect(getDuplicateKey({ title: "React docs", url: "https://react.dev/learn" })).toBe(
      getDuplicateKey({ title: "Learn React", url: "https://react.dev/learn" })
    );
  });

  it("falls back to the title when there is no url (#45)", () => {
    expect(getDuplicateKey({ title: "Note" })).not.toBe(getDuplicateKey({ title: "Other" }));
    expect(getDuplicateKey({})).toBe("title:");
  });
});

describe("findDuplicateIds", () => {
  it("keeps the first occurrence and returns later duplicate ids", () => {
    const list = [
      { id: "1", title: "A", url: "http://a.com" },
      { id: "2", title: "a", url: "http://a.com" },
      { id: "3", title: "B", url: "http://b.com" },
      { id: "4", title: "b ", url: " http://b.com" },
    ];
    expect(findDuplicateIds(list)).toEqual(["2", "4"]);
  });

  it("returns an empty array when there are no duplicates", () => {
    expect(findDuplicateIds([{ id: "1", title: "A", url: "http://a.com" }])).toEqual([]);
  });

  it("matches across scheme, www., trailing slash, and tracking params (#45)", () => {
    const list = [
      { id: "1", title: "Post", url: "http://www.example.com/post/" },
      { id: "2", title: "Post again", url: "https://example.com/post?utm_source=news" },
      { id: "3", title: "Post third", url: "https://example.com/post?fbclid=abc" },
    ];
    expect(findDuplicateIds(list)).toEqual(["2", "3"]);
  });

  it("keeps the copy carrying metadata rather than the first one (#45)", () => {
    const list = [
      { id: "bare", title: "A", url: "https://a.test/" },
      { id: "annotated", title: "A", url: "https://a.test/", tags: ["react"], rating: 4 },
    ];
    expect(findDuplicateIds(list)).toEqual(["bare"]);
  });

  it("keeps the earliest copy when metadata is equal (#45)", () => {
    const list = [
      { id: "first", title: "A", url: "https://a.test/", rating: 3 },
      { id: "second", title: "A", url: "https://a.test/", tags: ["x"] },
    ];
    expect(findDuplicateIds(list)).toEqual(["second"]);
  });

  it("does not collapse bookmarks that differ in path or query (#45)", () => {
    const list = [
      { id: "1", url: "https://example.com/a" },
      { id: "2", url: "https://example.com/b" },
      { id: "3", url: "https://example.com/a?page=2" },
      { id: "4", url: "https://example.com/a#install" },
    ];
    expect(findDuplicateIds(list)).toEqual([]);
  });
});

// #285: the review shows both copies of every pair, so the pairs are a thing
// of their own — the same keep decisions findDuplicateIds has always made,
// with the survivor attached.
describe("findDuplicatePairs", () => {
  it("pairs each later copy with the one kept so far", () => {
    const list = [
      { id: "1", title: "A", url: "http://a.com" },
      { id: "2", title: "a", url: "http://a.com" },
      { id: "3", title: "B", url: "http://b.com" },
      { id: "4", title: "b ", url: " http://b.com" },
    ];

    expect(findDuplicatePairs(list)).toEqual([
      { keep: list[0], drop: list[1] },
      { keep: list[2], drop: list[3] },
    ]);
  });

  it("swaps the survivor when a richer copy arrives", () => {
    const bare = { id: "bare", title: "A", url: "https://a.test/" };
    const annotated = { id: "annotated", title: "A", url: "https://a.test/", tags: ["react"] };

    expect(findDuplicatePairs([bare, annotated])).toEqual([{ keep: annotated, drop: bare }]);
  });

  it("agrees with findDuplicateIds about which copy goes", () => {
    const list = [
      { id: "first", title: "A", url: "https://a.test/", rating: 3 },
      { id: "second", title: "A", url: "https://a.test/", tags: ["x"] },
    ];

    expect(findDuplicatePairs(list).map(({ drop }) => drop.id)).toEqual(findDuplicateIds(list));
  });
});

describe("keepReasonTokens", () => {
  it("names the metadata that carried the keep decision", () => {
    expect(keepReasonTokens({ tags: ["a"], rating: 4, description: "Notes." })).toEqual([
      "tags",
      "rating",
      "notes",
    ]);
  });

  it("falls back to earliest when the copies are equally bare", () => {
    expect(keepReasonTokens({ title: "A", url: "https://a.test/" })).toEqual(["earliest"]);
  });

  it("does not count an empty description or a zero rating", () => {
    expect(keepReasonTokens({ tags: [], rating: 0, description: "   " })).toEqual(["earliest"]);
  });
});

describe("filterDuplicateImports", () => {
  it("skips imports already present in existing bookmarks", () => {
    const existing = [{ id: "1", title: "A", url: "http://a.com" }];
    const incoming = [
      { title: "a", url: "http://a.com" },
      { title: "C", url: "http://c.com" },
    ];
    const { bookmarks, skippedCount } = filterDuplicateImports(incoming, existing);
    expect(skippedCount).toBe(1);
    expect(bookmarks).toEqual([{ title: "C", url: "http://c.com" }]);
  });

  it("dedupes within the incoming batch too", () => {
    const incoming = [
      { title: "C", url: "http://c.com" },
      { title: "c", url: "http://c.com" },
    ];
    const { bookmarks, skippedCount } = filterDuplicateImports(incoming, []);
    expect(bookmarks).toHaveLength(1);
    expect(skippedCount).toBe(1);
  });

  it("imports the annotated copy when the batch has it twice (#45)", () => {
    const incoming = [
      { title: "Docs", url: "https://example.com/docs" },
      { title: "Docs", url: "https://example.com/docs", tags: ["react"], rating: 5 },
    ];
    const { bookmarks, skippedCount } = filterDuplicateImports(incoming, []);
    expect(skippedCount).toBe(1);
    expect(bookmarks).toEqual([incoming[1]]);
  });

  it("keeps the surviving copy where it first appeared (#45)", () => {
    const incoming = [
      { title: "First", url: "https://example.com/a" },
      { title: "Other", url: "https://example.com/b" },
      { title: "First, annotated", url: "https://example.com/a", tags: ["x"] },
    ];
    const { bookmarks } = filterDuplicateImports(incoming, []);
    expect(bookmarks.map((b) => b.title)).toEqual(["First, annotated", "Other"]);
  });

  it("defaults to empty inputs", () => {
    expect(filterDuplicateImports()).toEqual({ bookmarks: [], skippedCount: 0 });
  });
});
