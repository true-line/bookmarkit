import { describe, it, expect } from "vitest";
import {
  chunkIntoRows,
  columnsForWidth,
  rowKeyFor,
  COLUMN_GAP,
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
