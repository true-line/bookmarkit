import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_VIEW_MODE,
  VIEW_MODE_KEY,
  VIEW_MODES,
  listViewMode,
  setListViewMode,
} from "./listView.js";

describe("listViewMode (#198)", () => {
  beforeEach(() => {
    localStorage.removeItem(VIEW_MODE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(VIEW_MODE_KEY);
  });

  it("defaults to the responsive flow, so #193 behavior is unchanged", () => {
    expect(listViewMode()).toBe(DEFAULT_VIEW_MODE);
    expect(DEFAULT_VIEW_MODE).toBe("flow");
  });

  it("round-trips a chosen mode", () => {
    setListViewMode("grid");
    expect(listViewMode()).toBe("grid");
    setListViewMode("single");
    expect(listViewMode()).toBe("single");
  });

  it("ignores values the layout math does not know", () => {
    setListViewMode("compact");
    expect(localStorage.getItem(VIEW_MODE_KEY)).toBeNull();
    localStorage.setItem(VIEW_MODE_KEY, "compact");
    expect(listViewMode()).toBe(DEFAULT_VIEW_MODE);
  });

  it("exposes exactly the three views, in selector order", () => {
    expect(VIEW_MODES).toEqual(["single", "flow", "grid"]);
  });
});
