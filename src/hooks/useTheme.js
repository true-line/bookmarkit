// ARCH-06: Encapsulates theme state, persistence, and CSS variable application.
// #290: the mockups' appearance settings land here too — "System default"
// resolves through the OS's prefers-color-scheme and re-resolves live, and
// the Reduce motion toggle overrides that OS request — because both land on
// the document element beside data-ui-theme, and both the manager and the
// popup need them applied.

import { useCallback, useEffect, useState } from "react";
import { getMessages } from "../i18n/index.js";

// The default palette is the same one :root declares in index.css: warm paper
// surfaces, ink text, and the brand mark's bookmark red. Keep the two in sync —
// this object is what gets written to the CSS variables when no theme is
// selected, so a drift would override the stylesheet on every mount.
const DEFAULT_THEME = {
  bgPrimary: "#fffdf8",
  bgSecondary: "#f6f1e7",
  textPrimary: "#211d18",
  textSecondary: "#6d675c",
  border: "#e4dcc9",
  accent: "#c62f35",
  accentHover: "#a92329",
};

const REQUIRED_THEME_KEYS = [
  "bgPrimary",
  "bgSecondary",
  "textPrimary",
  "textSecondary",
  "border",
  "accent",
  "accentHover",
];

// #290: the mockups' built-in entries beyond the warm default. "Dark (Slate)"
// takes its values from the design system's own dark token scope — the same
// #0d141c family [data-ui-theme="dark"] declares, so the seven legacy
// variables and the --ui-* palette read as one surface. "High Contrast" is a
// fixed light palette at maximum contrast: white canvas, ink text, black
// borders, and the brand crimson dark enough to hold ~6:1 on white (it does
// not follow the OS scheme; it is a statement, not a mirror).
const DARK_SLATE_THEME = {
  bgPrimary: "#0d141c",
  bgSecondary: "#151c24",
  textPrimary: "#dce3ef",
  textSecondary: "#aeb4be",
  border: "#404751",
  accent: "#ffb4ab",
  accentHover: "#ffd2cd",
};

const HIGH_CONTRAST_THEME = {
  bgPrimary: "#ffffff",
  bgSecondary: "#ffffff",
  textPrimary: "#000000",
  textSecondary: "#1a1a1a",
  border: "#000000",
  accent: "#b82925",
  accentHover: "#8f1f1c",
};

const BUILTIN_THEMES = {
  default: DEFAULT_THEME,
  dark: DARK_SLATE_THEME,
  "high-contrast": HIGH_CONTRAST_THEME,
};

// The built-in keys, for hiding them from the custom-theme entries — an
// uploaded theme cannot shadow a built-in (the merge below sees to that), so
// the select must not offer it twice.
export const BUILTIN_THEME_KEYS = Object.keys(BUILTIN_THEMES);

// #290: "System default" is not a palette of its own — it resolves to a
// built-in through the OS's prefers-color-scheme, re-resolving live when the
// OS flips while the app is open.
export const SYSTEM_THEME = "system";

const REDUCE_MOTION_KEY = "bm_reduce_motion";

// #290: which palette actually paints — the selected one, or, for "System
// default", whichever built-in the OS's current scheme calls for.
function resolveActiveTheme(themes, currentTheme, systemPrefersDark) {
  if (currentTheme === SYSTEM_THEME) {
    return systemPrefersDark ? themes.dark : themes.default;
  }
  return themes[currentTheme] || themes.default;
}

// #240: the unified design system scopes its --ui-* tokens to a
// [data-ui-theme="light"|"dark"] root, while this app's themes are seven
// user-editable variables with no such attribute. applyThemeToDom is the
// bridge: it stamps data-ui-theme on the document element — derived from the
// theme's background so user themes land on the right palette — and maps the
// user's accent onto the design system's brand tokens so anything tokenized
// as brand follows the selected theme. The rest of the --ui-* palette stays
// the canonical one from the Stitch screens; only brand follows the user.
function applyThemeToDom(theme) {
  const t = theme || DEFAULT_THEME;
  const root = document.documentElement;
  root.style.setProperty("--bg-primary", t.bgPrimary || "#fffdf8");
  root.style.setProperty("--bg-secondary", t.bgSecondary || "#f6f1e7");
  root.style.setProperty("--text-primary", t.textPrimary || "#211d18");
  root.style.setProperty("--text-secondary", t.textSecondary || "#6d675c");
  root.style.setProperty("--border", t.border || "#e4dcc9");
  root.style.setProperty("--accent", t.accent || "#c62f35");
  root.style.setProperty("--accent-hover", t.accentHover || "#a92329");
  root.setAttribute("data-ui-theme", resolveUiTheme(t.bgPrimary));
  root.style.setProperty("--ui-brand-crimson", t.accent || "#c62f35");
  root.style.setProperty("--ui-brand-crimson-hover", t.accentHover || "#a92329");
}

// Light or dark, judged by the theme's own background: parse #rrggbb (what
// the default theme and index.css use) directly, and measure anything else
// through the DOM so rgb()/hsl()/named uploads work in real browsers. When
// even measurement is unavailable, fall back to light.
function resolveUiTheme(bgPrimary) {
  const hex = /^#([0-9a-f]{6})$/i.exec(String(bgPrimary || "").trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return relativeLuminance([(n >> 16) & 255, (n >> 8) & 255, n & 255]) >= 0.5 ? "light" : "dark";
  }
  const rgb = measureColor(bgPrimary);
  if (!rgb) return "light";
  return relativeLuminance(rgb) >= 0.5 ? "light" : "dark";
}

// WCAG-style sRGB luminance, folded to 0..1 with a 0.5 light/dark threshold.
function relativeLuminance([r, g, b]) {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

// Computed color → rgb triple. A scratch element is what turns any valid CSS
// color form into something numeric; browsers resolve it, and environments
// that can't (or colors they refuse) return null rather than guessing.
// Alpha-bearing values composite over white before returning: the page shows
// the browser canvas behind a transparent --bg-primary, so transparent black
// renders light and must not resolve dark (8-digit hex lands here too, since
// the hex fast-path only takes 6 digits).
function measureColor(cssColor) {
  try {
    const el = document.createElement("span");
    el.style.color = cssColor;
    document.body.appendChild(el);
    const m = /^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/.exec(getComputedStyle(el).color);
    el.remove();
    if (!m) return null;
    const rgb = [Number(m[1]), Number(m[2]), Number(m[3])];
    const alpha = m[4] === undefined ? 1 : Number(m[4]);
    if (alpha >= 1) return rgb;
    return rgb.map((c) => Math.round(c * alpha + 255 * (1 - alpha)));
  } catch {
    return null;
  }
}

async function saveThemeToPersistence(key, value) {
  try {
    if (typeof chrome !== "undefined" && chrome.storage) {
      await chrome.storage.local.set({ [key]: value });
    } else {
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    }
  } catch {}
}

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState("default");
  const [themes, setThemes] = useState(BUILTIN_THEMES);
  // #290: the OS scheme "System default" resolves against, kept in state so
  // a mid-session flip re-runs the apply effect below.
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [reduceMotion, setReduceMotionState] = useState(false);

  // Load persisted themes on mount
  useEffect(() => {
    (async () => {
      try {
        if (typeof chrome !== "undefined" && chrome.storage) {
          const result = await chrome.storage.local.get([
            "bm_current_theme",
            "bm_themes",
            REDUCE_MOTION_KEY,
          ]);
          setCurrentTheme(result.bm_current_theme || "default");
          setReduceMotionState(result[REDUCE_MOTION_KEY] === "true");
          const parsed = result.bm_themes ? JSON.parse(result.bm_themes) : {};
          setThemes((prev) => ({ ...parsed, ...prev }));
        } else {
          const theme = localStorage.getItem("bm_current_theme") || "default";
          setCurrentTheme(theme);
          setReduceMotionState(localStorage.getItem(REDUCE_MOTION_KEY) === "true");
          const raw = localStorage.getItem("bm_themes");
          const parsed = raw ? JSON.parse(raw) : {};
          setThemes((prev) => ({ ...parsed, ...prev }));
        }
      } catch (e) {
        console.error("Failed to load themes:", e);
      }
    })();
  }, []);

  // #290: "System default" stays live — when the OS flips schemes with the
  // app open, the resolution re-runs without a new selection. matchMedia is
  // guarded because tests and odd embedders may not provide it.
  useEffect(() => {
    if (currentTheme !== SYSTEM_THEME || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemPrefersDark(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [currentTheme]);

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    applyThemeToDom(resolveActiveTheme(themes, currentTheme, systemPrefersDark));
  }, [currentTheme, themes, systemPrefersDark]);

  // #290: the Reduce motion override — stamped as an attribute beside
  // data-ui-theme so the collapse rules in the stylesheets can key off it
  // where prefers-reduced-motion alone wouldn't fire. Unchecked, no attribute
  // is set and the OS media queries stand alone.
  useEffect(() => {
    if (reduceMotion) {
      document.documentElement.setAttribute("data-ui-motion", "reduce");
    } else {
      document.documentElement.removeAttribute("data-ui-motion");
    }
  }, [reduceMotion]);

  const setReduceMotion = useCallback((enabled) => {
    setReduceMotionState(Boolean(enabled));
    saveThemeToPersistence(REDUCE_MOTION_KEY, enabled ? "true" : "false");
  }, []);

  const selectTheme = useCallback((themeName) => {
    setCurrentTheme(themeName);
    saveThemeToPersistence("bm_current_theme", themeName);
  }, []);

  // SEC-07: Upload validation lives here
  const uploadTheme = useCallback(async (file, showMessage) => {
    if (!file) return;
    if (file.size > 100 * 1024) {
      showMessage(getMessages()("themeUpload.tooLarge"), "error");
      return;
    }
    try {
      const text = await file.text();
      let themeData;
      if (file.name.endsWith(".yaml") || file.name.endsWith(".yml")) {
        const yaml = await import("js-yaml");
        themeData = yaml.load(text);
      } else {
        themeData = JSON.parse(text);
      }
      if (!themeData || typeof themeData !== "object" || Array.isArray(themeData)) {
        showMessage(getMessages()("themeUpload.invalidFormat"), "error");
        return;
      }
      const unknownKeys = Object.keys(themeData).filter((k) => !REQUIRED_THEME_KEYS.includes(k));
      if (unknownKeys.length > 0) {
        showMessage(
          getMessages()("themeUpload.unknownProperties", { properties: unknownKeys.join(", ") }),
          "error"
        );
        return;
      }
      const missing = REQUIRED_THEME_KEYS.filter((key) => !themeData[key]);
      if (missing.length > 0) {
        showMessage(
          getMessages()("themeUpload.missingProperties", { properties: missing.join(", ") }),
          "error"
        );
        return;
      }
      const isSafeColor = (v) => {
        if (typeof v !== "string" || !v.trim()) return false;
        return !/[;<>{}]|url\s*\(|expression\s*\(|javascript\s*:/i.test(v);
      };
      const invalidKeys = REQUIRED_THEME_KEYS.filter((k) => !isSafeColor(themeData[k]));
      if (invalidKeys.length > 0) {
        showMessage(getMessages()("themeUpload.invalidColors"), "error");
        return;
      }
      const themeName = file.name.replace(/\.(json|yaml|yml)$/i, "");
      setThemes((prev) => {
        const next = { ...prev, [themeName]: themeData };
        saveThemeToPersistence("bm_themes", JSON.stringify(next));
        return next;
      });
      showMessage(getMessages()("themeUpload.uploaded", { name: themeName }), "success");
    } catch {
      showMessage(getMessages()("themeUpload.failed"), "error");
    }
  }, []);

  return { currentTheme, themes, selectTheme, uploadTheme, reduceMotion, setReduceMotion };
}
