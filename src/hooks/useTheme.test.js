import { renderHook, act } from "@testing-library/react";
import { useTheme } from "./useTheme.js";

// #240: applyThemeToDom is the bridge between the app's seven user-editable
// theme variables and the unified design system's [data-ui-theme] token
// scope. These tests drive it through the hook's apply effect and read the
// document element back.

function root() {
  return document.documentElement;
}

afterEach(() => {
  root().removeAttribute("data-ui-theme");
  root().style.removeProperty("--ui-brand-crimson");
  root().style.removeProperty("--ui-brand-crimson-hover");
  localStorage.clear();
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
