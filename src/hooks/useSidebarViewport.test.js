import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSidebarViewport } from "./useSidebarViewport.js";

// jsdom has no matchMedia, so each test installs the query the hook asks for,
// with a `state` the test flips to stand for the viewport changing.
const installMatchMedia = (matches) => {
  const state = { matches };
  const listeners = new Set();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      query,
      get matches() {
        return state.matches;
      },
      addEventListener: (type, listener) => listeners.add(listener),
      removeEventListener: (type, listener) => listeners.delete(listener),
    })),
  });
  return { state, listeners };
};

afterEach(() => {
  delete window.matchMedia;
});

describe("useSidebarViewport (#283)", () => {
  it("asks for the rail breakpoint Tailwind and the stylesheet use", () => {
    installMatchMedia(true);
    renderHook(() => useSidebarViewport());

    expect(window.matchMedia).toHaveBeenCalledWith("(min-width: 1024px)");
  });

  it("reads the viewport before the first render", () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useSidebarViewport());

    expect(result.current).toBe(false);
  });

  it("follows the viewport across the breakpoint", () => {
    const { state, listeners } = installMatchMedia(false);
    const { result } = renderHook(() => useSidebarViewport());
    expect(result.current).toBe(false);

    const cross = (nowMatches) =>
      act(() => {
        state.matches = nowMatches;
        listeners.forEach((listener) => listener());
      });

    cross(true);
    expect(result.current).toBe(true);
    cross(false);
    expect(result.current).toBe(false);
  });

  it("unsubscribes when the component goes away", () => {
    const { listeners } = installMatchMedia(true);
    const { unmount } = renderHook(() => useSidebarViewport());
    expect(listeners.size).toBe(1);

    unmount();
    expect(listeners.size).toBe(0);
  });

  it("treats an engine without matchMedia as the narrower layout", () => {
    const { result } = renderHook(() => useSidebarViewport());

    expect(result.current).toBe(false);
  });
});
