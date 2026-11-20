import { describe, expect, it } from "vitest";
import {
  DEFAULT_RESULT_LIMIT,
  MAX_RESULT_LIMIT,
  executeListFolders,
  executeSearchBookmarks,
  listFoldersTool,
  searchBookmarksTool,
} from "./webmcpTools.js";

// The same normalization rules the manual filters apply (#58) — "Work" the
// folder and "work" the tag are one thing — hold here, because these are the
// same functions.
const LIST = [
  {
    id: "1",
    title: "Pinecone docs",
    url: "https://docs.pinecone.io/guides",
    description: "vector database docs",
    tags: ["Work", "AI"],
    rating: 4,
    folderId: "Work/ML",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    faviconUrl: "data:image/png,not-for-agents",
  },
  {
    id: "2",
    title: "Sourdough starter guide",
    url: "https://example.com/bread",
    tags: [],
    rating: 0,
    folderId: "",
  },
  {
    id: "3",
    title: "The Go Blog",
    url: "https://go.dev/blog",
    tags: ["work"],
    rating: 5,
    folderId: "Work",
  },
  {
    id: "4",
    title: "Deprecation archive",
    url: "http://old.example.com",
    tags: ["archive"],
    rating: 1,
    folderId: "Work/ML/Old",
  },
];

describe("executeSearchBookmarks (#212)", () => {
  it("matches free text in title, url, description, and tags, case-insensitively", () => {
    expect(executeSearchBookmarks({ query: "pinecone" }, LIST).items.map((i) => i.id)).toEqual([
      "1",
    ]);
    expect(executeSearchBookmarks({ query: "go.dev" }, LIST).items.map((i) => i.id)).toEqual(["3"]);
    expect(executeSearchBookmarks({ query: "vector" }, LIST).items.map((i) => i.id)).toEqual(["1"]);
    expect(executeSearchBookmarks({ query: "ARCHIVE" }, LIST).items.map((i) => i.id)).toEqual([
      "4",
    ]);
  });

  it("narrows by tags with the app's normalization, so Work and work are one tag", () => {
    expect(executeSearchBookmarks({ tags: ["work"] }, LIST).items.map((i) => i.id)).toEqual([
      "1",
      "3",
    ]);
  });

  it("includes subfolders in a folder filter, and treats unfiled as a folder", () => {
    expect(executeSearchBookmarks({ folder: "Work" }, LIST).items.map((i) => i.id)).toEqual([
      "1",
      "3",
      "4",
    ]);
    expect(executeSearchBookmarks({ folder: "unfiled" }, LIST).items.map((i) => i.id)).toEqual([
      "2",
    ]);
  });

  it("combines filters and applies minRating", () => {
    expect(
      executeSearchBookmarks({ folder: "Work", minRating: 4 }, LIST).items.map((i) => i.id)
    ).toEqual(["1", "3"]);
  });

  it("keeps the store's order — browsing with no filters is the list, not a re-sort", () => {
    const { items, total, truncated } = executeSearchBookmarks({}, LIST);
    expect(items.map((i) => i.id)).toEqual(["1", "2", "3", "4"]);
    expect(total).toBe(4);
    expect(truncated).toBe(false);
  });

  it("truncates to limit and says so with the true total", () => {
    const { items, total, truncated, limit } = executeSearchBookmarks({ limit: 2 }, LIST);
    expect(items).toHaveLength(2);
    expect(total).toBe(4);
    expect(truncated).toBe(true);
    expect(limit).toBe(2);
  });

  it("clamps limit into range rather than trusting the caller", () => {
    expect(executeSearchBookmarks({ limit: 0 }, LIST).limit).toBe(DEFAULT_RESULT_LIMIT);
    expect(executeSearchBookmarks({ limit: 9999 }, LIST).limit).toBe(MAX_RESULT_LIMIT);
    expect(executeSearchBookmarks({}, LIST).limit).toBe(DEFAULT_RESULT_LIMIT);
  });

  it("projects only the fields an agent needs, and leaks nothing else", () => {
    const [item] = executeSearchBookmarks({ query: "pinecone" }, LIST).items;
    expect(item).toEqual({
      id: "1",
      title: "Pinecone docs",
      url: "https://docs.pinecone.io/guides",
      folder: "Work/ML",
      tags: ["Work", "AI"],
      rating: 4,
      description: "vector database docs",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });

  it("tolerates junk arguments without throwing", () => {
    expect(() =>
      executeSearchBookmarks({ query: 7, tags: "work", limit: "x" }, LIST)
    ).not.toThrow();
    expect(executeSearchBookmarks(null, LIST).total).toBe(4);
    expect(executeSearchBookmarks({}, undefined).total).toBe(0);
  });
});

describe("executeListFolders (#212)", () => {
  it("flattens the derived tree with direct counts and subtree totals", () => {
    const { items, unfiled, bookmarksTotal } = executeListFolders({}, LIST);
    expect(items).toEqual([
      { path: "Work", name: "Work", count: 1, total: 3 },
      { path: "Work/ML", name: "ML", count: 1, total: 2 },
      { path: "Work/ML/Old", name: "Old", count: 1, total: 1 },
    ]);
    expect(unfiled).toBe(1);
    expect(bookmarksTotal).toBe(4);
  });

  it("truncates to limit and reports the true folder count", () => {
    const { items, total, truncated } = executeListFolders({ limit: 1 }, LIST);
    expect(items).toHaveLength(1);
    expect(total).toBe(3);
    expect(truncated).toBe(true);
  });

  it("tolerates null arguments", () => {
    expect(() => executeListFolders(null, LIST)).not.toThrow();
    expect(executeListFolders(null, LIST).total).toBe(3);
  });
});

describe("tool definitions (#212)", () => {
  it("name, describe, and constrain both tools for a model that has never seen the app", () => {
    for (const tool of [searchBookmarksTool, listFoldersTool]) {
      expect(tool.name).toMatch(/^[a-z][a-z_]*$/);
      expect(tool.description.length).toBeGreaterThan(40);
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(tool.annotations).toEqual({ readOnlyHint: true });
      expect(tool.execute).toBeUndefined(); // bound at registration, never here
    }
  });

  it("caps limit in the schema at the value the executor clamps to", () => {
    expect(searchBookmarksTool.inputSchema.properties.limit.maximum).toBe(MAX_RESULT_LIMIT);
    expect(listFoldersTool.inputSchema.properties.limit.maximum).toBe(MAX_RESULT_LIMIT);
  });
});
