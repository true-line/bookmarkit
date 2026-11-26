import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTheme } from "./useTheme.js";

// #240: applyThemeToDom is the bridge between the app's seven user-editable
// theme variables and the unified design system's [data-ui-theme] token
// scope. These tests drive it through the hook's apply effect and read the
// document element back.

function root() {
  return document.documentElement;
}

// #290: jsdom has no matchMedia, so "System default" tests install a stub
// whose scheme the test can flip mid-session — that is the whole point of
// that entry: the palette re-resolves without a new selection.
function stubMatchMedia(initialDark) {
  const listeners = new Set();
  const query = {
    matches: initialDark,
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", () => query);
  return {
    flip(dark) {
      query.matches = dark;
      for (const listener of listeners) listener({ matches: dark });
    },
  };
}

afterEach(() => {
  root().removeAttribute("data-ui-theme");
  root().removeAttribute("data-ui-motion");
  root().style.removeProperty("--ui-brand-crimson");
  root().style.removeProperty("--ui-brand-crimson-hover");
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("useTheme → design system bridge", () => {
  it("stamps data-ui-theme=light for the default warm-paper theme", () => {
    renderHook(() => useTheme());
    expect(root().getAttribute("data-ui-theme")).toBe("light");
  });

  it("stamps data-ui-theme=dark for a dark background theme", async () => {
    localStorage.setItem(
      "bm_themes",
      JSON.stringify({
        slate: {
          bgPrimary: "#0d141c",
          bgSecondary: "#0d141c",
          textPrimary: "#dce3ef",
          textSecondary: "#8a93a2",
          border: "#2a313a",
          accent: "#c62f35",
          accentHover: "#a92329",
        },
      })
    );
    const { result } = renderHook(() => useTheme());
    await act(async () => {
      result.current.selectTheme("slate");
    });
    expect(root().getAttribute("data-ui-theme")).toBe("dark");
  });

  it("maps the theme's accent onto the design system's brand tokens", () => {
    renderHook(() => useTheme());
    expect(root().style.getPropertyValue("--ui-brand-crimson")).toBe("#c62f35");
    expect(root().style.getPropertyValue("--ui-brand-crimson-hover")).toBe("#a92329");
  });

  it("composites alpha-bearing backgrounds over the canvas before judging", async () => {
    localStorage.setItem(
      "bm_themes",
      JSON.stringify({
        ghost: {
          bgPrimary: "rgba(0, 0, 0, 0)",
          bgSecondary: "#f6f1e7",
          textPrimary: "#211d18",
          textSecondary: "#6d675c",
          border: "#e4dcc9",
          accent: "#c62f35",
          accentHover: "#a92329",
        },
      })
    );
    const { result } = renderHook(() => useTheme());
    await act(async () => {
      result.current.selectTheme("ghost");
    });
    // Transparent black renders as the light canvas behind the page.
    expect(root().getAttribute("data-ui-theme")).toBe("light");
  });

  it("keeps brand tokens following a custom accent after a theme switch", async () => {
    localStorage.setItem(
      "bm_themes",
      JSON.stringify({
        ocean: {
          bgPrimary: "#fffdf8",
          bgSecondary: "#f6f1e7",
          textPrimary: "#211d18",
          textSecondary: "#6d675c",
          border: "#e4dcc9",
          accent: "#0b6e99",
          accentHover: "#095a7d",
        },
      })
    );
    const { result } = renderHook(() => useTheme());
    await act(async () => {
      result.current.selectTheme("ocean");
    });
    expect(root().getAttribute("data-ui-theme")).toBe("light");
    expect(root().style.getPropertyValue("--ui-brand-crimson")).toBe("#0b6e99");
    expect(root().style.getPropertyValue("--ui-brand-crimson-hover")).toBe("#095a7d");
  });
});

// #290: the mockups' appearance settings — the "System default" entry that
// follows the OS scheme (live), the built-in Dark (Slate) and High Contrast
// palettes, and the Reduce motion toggle stamped as data-ui-motion.
describe("system default, built-ins, and motion (#290)", () => {
  it("resolves System default to the light palette when the OS is light", async () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    await act(async () => {
      result.current.selectTheme("system");
    });
    expect(root().getAttribute("data-ui-theme")).toBe("light");
    expect(root().style.getPropertyValue("--bg-primary")).toBe("#fffdf8");
  });

  it("resolves System default to Dark (Slate) when the OS is dark", async () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    await act(async () => {
      result.current.selectTheme("system");
    });
    expect(root().getAttribute("data-ui-theme")).toBe("dark");
    expect(root().style.getPropertyValue("--bg-primary")).toBe("#0d141c");
  });

  it("re-resolves live when the OS scheme flips mid-session", async () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    await act(async () => {
      result.current.selectTheme("system");
    });
    expect(root().style.getPropertyValue("--bg-primary")).toBe("#fffdf8");
    act(() => media.flip(true));
    expect(root().getAttribute("data-ui-theme")).toBe("dark");
    expect(root().style.getPropertyValue("--bg-primary")).toBe("#0d141c");
  });

  it("persists the System default choice like any other selection", async () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    await act(async () => {
      result.current.selectTheme("system");
    });
    expect(localStorage.getItem("bm_current_theme")).toBe("system");
  });

  it("selects the built-in Dark (Slate) and High Contrast palettes directly", async () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.themes.dark).toBeDefined();
    expect(result.current.themes["high-contrast"]).toBeDefined();
    await act(async () => {
      result.current.selectTheme("dark");
    });
    expect(root().getAttribute("data-ui-theme")).toBe("dark");
    expect(root().style.getPropertyValue("--bg-primary")).toBe("#0d141c");
    await act(async () => {
      result.current.selectTheme("high-contrast");
    });
    // White canvas judges light, and the hairline goes full ink.
    expect(root().getAttribute("data-ui-theme")).toBe("light");
    expect(root().style.getPropertyValue("--border")).toBe("#000000");
  });

  it("stamps data-ui-motion=reduce while the toggle is on and clears it off", async () => {
    const { result } = renderHook(() => useTheme());
    expect(root().hasAttribute("data-ui-motion")).toBe(false);
    await act(async () => {
      result.current.setReduceMotion(true);
    });
    expect(root().getAttribute("data-ui-motion")).toBe("reduce");
    await act(async () => {
      result.current.setReduceMotion(false);
    });
    expect(root().hasAttribute("data-ui-motion")).toBe(false);
  });

  it("persists the motion override and restores it on mount", async () => {
    const { result } = renderHook(() => useTheme());
    await act(async () => {
      result.current.setReduceMotion(true);
    });
    expect(localStorage.getItem("bm_reduce_motion")).toBe("true");
    renderHook(() => useTheme());
    await waitFor(() => expect(root().getAttribute("data-ui-motion")).toBe("reduce"));
  });
});
