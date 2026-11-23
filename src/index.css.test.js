import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Read from disk for the same reason as design-system/components.css.test.js:
// vitest's default CSS handling replaces stylesheet imports with empty
// modules. The base URL goes through a local first so Vite's
// `new URL("…", import.meta.url)` asset rewrite leaves the path alone.
const hereHref = import.meta.url;
const indexCss = readFileSync(new URL("./index.css", hereHref), "utf8");

// Anchored at line start so `.ui-filter-select {` is not found inside
// `.ui-input.ui-filter-select {`.
const ruleFor = (selector) =>
  indexCss.match(new RegExp(`(?:^|\\n)${selector.replace(/\./g, "\\.")} \\{[^}]*\\}`))?.[0];

// #284: the filter and bulk-edit selects keep their mockup width as a floor,
// so a longer translated label grows the control instead of clipping. They
// sit in flex rows as .ui-input elements, and .ui-input
// (design-system/components.css) sets flex: 1 and min-width: 0 for the inputs
// that stretch and shrink inside a field row. That sheet loads before
// index.css in the app and after it in Storybook, so a rule on the select's
// own class alone wins in the app and silently loses in Storybook — which is
// how the fixed widths came to be ignored there. Paired with .ui-input, each
// rule wins on specificity in both.
describe("index.css select width floors", () => {
  const floors = {
    "ui-filter-select--rating": "9.375rem",
    "ui-filter-select--sort": "10.625rem",
    "ui-bulk-select--folder": "11.25rem",
    "ui-bulk-select--rating": "9.375rem",
  };

  it.each(["ui-filter-select", "ui-bulk-select"])(
    "keeps .ui-input.%s out of the flex-filler role",
    (selector) => {
      expect(ruleFor(`.ui-input.${selector}`)).toContain("flex: none;");
    }
  );

  it.each(Object.entries(floors))("declares .ui-input.%s with its floor", (modifier, width) => {
    const rule = ruleFor(`.ui-input.${modifier}`);

    expect(rule).toBeDefined();
    expect(rule).toContain(`min-width: ${width};`);
    expect(rule).toContain("max-width: 100%;");
  });

  it.each(["ui-filter-select", "ui-bulk-select", ...Object.keys(floors)])(
    "never declares .%s without the .ui-input half",
    (selector) => {
      // That is the order-dependent form this test exists to keep out.
      expect(ruleFor(`.${selector}`)).toBeUndefined();
    }
  );
});
