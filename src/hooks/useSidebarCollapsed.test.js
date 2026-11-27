import { afterEach, describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  SIDEBAR_COLLAPSED_KEY,
  sidebarCollapsedPref,
  useSidebarCollapsed,
} from "./useSidebarCollapsed.js";

afterEach(() => {
  localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
  vi.restoreAllMocks();
});

// #346: the fold is a display preference — read before the first paint,
// persisted on the press, and silently in-memory when storage refuses.
describe("useSidebarCollapsed (#346)", () => {
  it("defaults to the expanded rail with nothing stored", () => {
    expect(sidebarCollapsedPref()).toBe(false);
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current[0]).toBe(false);
  });

  it("reads the persisted fold before the first paint", () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "true");
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current[0]).toBe(true);
  });

  it("hears only its own two spellings", () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "folded");
    expect(sidebarCollapsedPref()).toBe(false);
  });

  it("flips and persists the fold in one press", () => {
    const { result } = renderHook(() => useSidebarCollapsed());

    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe("true");

    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe("false");
  });

  it("stays expanded when the read is refused", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage denied");
    });
    expect(sidebarCollapsedPref()).toBe(false);
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current[0]).toBe(false);
  });

  it("keeps folding when the write is refused", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage denied");
    });
    const { result } = renderHook(() => useSidebarCollapsed());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
  });
});
