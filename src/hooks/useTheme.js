// ARCH-06: Encapsulates theme state, persistence, and CSS variable application.

import { useCallback, useEffect, useState } from "react";

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
  const [themes, setThemes] = useState({ default: DEFAULT_THEME });

  // Load persisted themes on mount
  useEffect(() => {
    (async () => {
      try {
        if (typeof chrome !== "undefined" && chrome.storage) {
          const result = await chrome.storage.local.get(["bm_current_theme", "bm_themes"]);
          setCurrentTheme(result.bm_current_theme || "default");
          const parsed = result.bm_themes ? JSON.parse(result.bm_themes) : {};
          setThemes((prev) => ({ ...parsed, ...prev }));
        } else {
          const theme = localStorage.getItem("bm_current_theme") || "default";
          setCurrentTheme(theme);
          const raw = localStorage.getItem("bm_themes");
          const parsed = raw ? JSON.parse(raw) : {};
          setThemes((prev) => ({ ...parsed, ...prev }));
        }
      } catch (e) {
        console.error("Failed to load themes:", e);
      }
    })();
  }, []);

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    applyThemeToDom(themes[currentTheme] || themes.default);
  }, [currentTheme, themes]);

  const selectTheme = useCallback((themeName) => {
    setCurrentTheme(themeName);
    saveThemeToPersistence("bm_current_theme", themeName);
  }, []);

  // SEC-07: Upload validation lives here
  const uploadTheme = useCallback(async (file, showMessage) => {
    if (!file) return;
    if (file.size > 100 * 1024) {
      showMessage("Theme file is too large. Maximum allowed size is 100 KB.", "error");
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
        showMessage("Invalid theme format. Expected a JSON object with color properties.", "error");
        return;
      }
      const unknownKeys = Object.keys(themeData).filter((k) => !REQUIRED_THEME_KEYS.includes(k));
      if (unknownKeys.length > 0) {
        showMessage(
          `Theme contains unknown properties: ${unknownKeys.join(", ")}. Only the 7 color properties are allowed.`,
          "error"
        );
        return;
      }
      const missing = REQUIRED_THEME_KEYS.filter((key) => !themeData[key]);
      if (missing.length > 0) {
        showMessage(`Theme is missing required properties: ${missing.join(", ")}`, "error");
        return;
      }
      const isSafeColor = (v) => {
        if (typeof v !== "string" || !v.trim()) return false;
        return !/[;<>{}]|url\s*\(|expression\s*\(|javascript\s*:/i.test(v);
      };
      const invalidKeys = REQUIRED_THEME_KEYS.filter((k) => !isSafeColor(themeData[k]));
      if (invalidKeys.length > 0) {
        showMessage(
          "Theme contains invalid color values. Use valid CSS colors (e.g., #rrggbb, rgb(), hsl(), named colors).",
          "error"
        );
        return;
      }
      const themeName = file.name.replace(/\.(json|yaml|yml)$/i, "");
      setThemes((prev) => {
        const next = { ...prev, [themeName]: themeData };
        saveThemeToPersistence("bm_themes", JSON.stringify(next));
        return next;
      });
      showMessage(`Theme "${themeName}" uploaded successfully.`, "success");
    } catch {
      showMessage("Failed to upload theme. Please ensure the file is valid JSON or YAML.", "error");
    }
  }, []);

  return { currentTheme, themes, selectTheme, uploadTheme };
}
