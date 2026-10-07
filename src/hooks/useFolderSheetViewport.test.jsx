import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFolderSheetViewport } from "./useFolderSheetViewport.js";

// jsdom has no layout engine, so the media query is stubbed with a controllable
// MediaQueryList; the hook's job is only to read it and follow its changes.

let query;

beforeEach(() => {
  query = {
    matches: false,
    listeners: new Set(),
  };
  query.addEventListener = vi.fn((type, listener) => query.listeners.add(listener));
  query.removeEventListener = vi.fn((type, listener) => query.listeners.delete(listener));
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => query)
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const crossBreakpoint = (matches) => {
  query.matches = matches;
  query.listeners.forEach((listener) => listener({ matches }));
};

describe("useFolderSheetViewport", () => {
  it("reads the sheet breakpoint on mount", () => {
    const { result } = renderHook(() => useFolderSheetViewport());

    expect(result.current).toBe(false);
    expect(matchMedia).toHaveBeenCalledWith("(max-width: 639.98px)");
  });

  it("follows the viewport across the breakpoint both ways", () => {
    const { result } = renderHook(() => useFolderSheetViewport());

    act(() => crossBreakpoint(true));
    expect(result.current).toBe(true);

    act(() => crossBreakpoint(false));
    expect(result.current).toBe(false);
  });

  it("stops listening on unmount", () => {
    const { unmount } = renderHook(() => useFolderSheetViewport());

    unmount();

    expect(query.removeEventListener).toHaveBeenCalled();
  });

  it("stays false where matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);

    const { result } = renderHook(() => useFolderSheetViewport());

    expect(result.current).toBe(false);
  });
});
