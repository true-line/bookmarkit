import { describe, it, expect } from "vitest";
import {
  chunkIntoRows,
  columnsForWidth,
  rowKeyFor,
  COLUMN_GAP,
  GRID_MAX_COLUMNS,
  GRID_MIN_CARD_WIDTH,
  MAX_COLUMNS,
  MIN_CARD_WIDTH,
} from "./listColumns.js";

describe("columnsForWidth (#193)", () => {
  // n columns fit exactly when width = n * MIN_CARD_WIDTH + (n - 1) * COLUMN_GAP
  const atColumns = (n) => n * MIN_CARD_WIDTH + (n - 1) * COLUMN_GAP;

  it("keeps one column while a second card would not fit", () => {
    expect(columnsForWidth(0)).toBe(1);
    expect(columnsForWidth(-10)).toBe(1);
    expect(columnsForWidth(Number.NaN)).toBe(1);
    expect(columnsForWidth(atColumns(2) - 1)).toBe(1);
  });

  it("grows through two, three and four as the list widens", () => {
    expect(columnsForWidth(atColumns(2))).toBe(2);
    expect(columnsForWidth(atColumns(3))).toBe(3);
    expect(columnsForWidth(atColumns(4))).toBe(4);
  });

  it("counts the gutters between cards, not just the cards", () => {
    // Two cards minus their gutter is a one-card fit: the space beside a card
    // is part of what a column costs.
    expect(columnsForWidth(atColumns(2) - COLUMN_GAP)).toBe(1);
  });

  it("lands 1080p fullscreen (1920px minus page padding) at three columns", () => {
    expect(columnsForWidth(1920 - 32)).toBe(3);
  });

  it("caps at five even on a 4K-wide list", () => {
    expect(columnsForWidth(3840 - 32)).toBe(MAX_COLUMNS);
    expect(columnsForWidth(Number.MAX_SAFE_INTEGER)).toBe(MAX_COLUMNS);
  });
});

describe("columnsForWidth modes (#198)", () => {
  // n columns fit exactly when width = n * MIN_CARD_WIDTH + (n - 1) * COLUMN_GAP
  const atColumns = (n) => n * MIN_CARD_WIDTH + (n - 1) * COLUMN_GAP;
  // n grid tiles fit exactly when width = n * GRID_MIN_CARD_WIDTH + (n - 1) * COLUMN_GAP
  const atGridColumns = (n) => n * GRID_MIN_CARD_WIDTH + (n - 1) * COLUMN_GAP;

  it("single is one full-width row at any width", () => {
    expect(columnsForWidth(3840, "single")).toBe(1);
    expect(columnsForWidth(0, "single")).toBe(1);
    expect(columnsForWidth(Number.NaN, "single")).toBe(1);
  });

  it("flow is the default, keeping the #193 behavior", () => {
    expect(columnsForWidth(1920 - 32)).toBe(columnsForWidth(1920 - 32, "flow"));
    expect(columnsForWidth(Number.MAX_SAFE_INTEGER, "flow")).toBe(MAX_COLUMNS);
  });

  it("grid fits more columns than flow at the same width", () => {
    const width = atColumns(2); // two flow cards just fit here
    expect(columnsForWidth(width, "flow")).toBe(2);
    expect(columnsForWidth(width, "grid")).toBeGreaterThan(2);
  });

  it("grid follows the same gutter-counting fit as flow", () => {
    expect(columnsForWidth(atGridColumns(4), "grid")).toBe(4);
    expect(columnsForWidth(atGridColumns(4) - COLUMN_GAP, "grid")).toBe(3);
    expect(columnsForWidth(atGridColumns(2) - 1, "grid")).toBe(1);
  });

  it("caps grid at its own denser ceiling", () => {
    expect(columnsForWidth(Number.MAX_SAFE_INTEGER, "grid")).toBe(GRID_MAX_COLUMNS);
    expect(GRID_MAX_COLUMNS).toBeGreaterThan(MAX_COLUMNS);
  });
});

describe("chunkIntoRows (#193)", () => {
  const letters = ["a", "b", "c", "d", "e", "f", "g"];

  it("deals items row-major into rows of the column count", () => {
    expect(chunkIntoRows(letters, 3)).toEqual([["a", "b", "c"], ["d", "e", "f"], ["g"]]);
  });

  it("keeps one row per item in a single column", () => {
    expect(chunkIntoRows(["a", "b"], 1)).toEqual([["a"], ["b"]]);
  });

  it("returns one short row when columns exceed the items", () => {
    expect(chunkIntoRows(["a"], 5)).toEqual([["a"]]);
  });

  it("is empty for an empty list", () => {
    expect(chunkIntoRows([], 3)).toEqual([]);
  });
});

describe("rowKeyFor (#193)", () => {
  it("keys a row by its column count and first card", () => {
    const row = [{ id: "b1" }];
    expect(rowKeyFor(3, row)).toBe("3:b1");
  });

  it("changes when the layout reflows, so stale heights are never read", () => {
    const row = [{ id: "b1" }];
    expect(rowKeyFor(3, row)).not.toBe(rowKeyFor(2, row));
  });
});
