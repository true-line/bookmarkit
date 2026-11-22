import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Read from disk rather than importing the stylesheet: vitest's default CSS
// stubbing replaces stylesheet imports with empty modules. The base URL goes
// through a local first so Vite's `new URL("…", import.meta.url)` asset
// rewrite doesn't turn the path into an asset import.
const hereHref = import.meta.url;
const componentsCss = readFileSync(new URL("./components.css", hereHref), "utf8");

// The dialog scrim centers its panel with a single-cell grid, so the panel's
// max-height cap is read twice: once while sizing the scrim's implicit grid
// row and again when laying the panel out. A percentage inside that cap is
// cyclic at track-sizing time — Chrome drops the whole min() and sizes the
// row to the panel's unclamped height, so a tall dialog renders centered in
// an oversized row: pushed below the viewport midline and clipped past the
// viewport's bottom edge (the help and options modals, November 2026 —
// measured at row 930px inside an 813px scrim before the fix). The cap must
// therefore stay viewport-definite: dvh arms only, never a percentage arm.
describe("components.css dialog viewport cap", () => {
  const panelRule = componentsCss.match(/\.ui-modal-panel \{[^}]*\}/)?.[0] ?? "";
  const maxHeight = panelRule.match(/max-height:\s*([^;]+);/)?.[1] ?? "";

  it("declares a max-height cap on .ui-modal-panel", () => {
    expect(panelRule).not.toBe("");
    expect(maxHeight).not.toBe("");
  });

  it("keeps every cap arm viewport-definite so grid track sizing can apply it", () => {
    expect(maxHeight).toContain("dvh");
    expect(maxHeight).not.toContain("100%");
  });
});
