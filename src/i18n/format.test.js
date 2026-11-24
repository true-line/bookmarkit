import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatMessage,
  formatNumber,
  formatRelativeTime,
  interpolate,
  pluralForm,
  segmentsToText,
  selectPluralForm,
} from "./format.js";

describe("interpolate", () => {
  it("returns a template with nothing to fill as one string", () => {
    expect(interpolate("Any rating")).toEqual(["Any rating"]);
  });

  it("keeps slots and inline elements in order, merging the text around them", () => {
    expect(
      interpolate("This will add <strong>{count}</strong> bookmarks.", { count: 2089 }, "en")
    ).toEqual([
      "This will add ",
      { tag: "strong", children: [{ slot: "count", value: "2,089" }] },
      " bookmarks.",
    ]);
  });

  it("carries a value that is not text (a React node) through untouched", () => {
    const node = { $$typeof: Symbol.for("react.element") };

    expect(interpolate("{chip} links", { chip: node })).toEqual([
      { slot: "chip", value: node },
      " links",
    ]);
  });

  it("leaves an element outside the allow-list as literal text", () => {
    expect(interpolate("<kbd>Shift</kbd>+click or <script>x</script>")).toEqual([
      "<kbd>Shift</kbd>+click or <script>x</script>",
    ]);
  });

  it("leaves a slot with no value, or a null one, visible", () => {
    expect(interpolate("Moved {count} and {n}.", { n: null })).toEqual(["Moved {count} and {n}."]);
  });

  it("does not read markup out of a value", () => {
    expect(interpolate("{query}?", { query: "<strong>a</strong>" })).toEqual([
      { slot: "query", value: "<strong>a</strong>" },
      "?",
    ]);
  });
});

describe("segmentsToText", () => {
  it("drops the emphasis and shows the slots as text", () => {
    expect(
      segmentsToText([
        "This will add ",
        { tag: "strong", children: [{ slot: "count", value: "2" }] },
        " bookmarks.",
      ])
    ).toBe("This will add 2 bookmarks.");
  });

  it("leaves a slot visible when only markup can show its value", () => {
    expect(
      segmentsToText([{ slot: "chip", value: { $$typeof: Symbol.for("react.element") } }, " links"])
    ).toBe("{chip} links");
  });
});

describe("formatMessage", () => {
  it("fills named placeholders", () => {
    expect(formatMessage("Delete view {name}", { name: "Five stars" })).toBe(
      "Delete view Five stars"
    );
  });

  it("formats numeric placeholders with the locale's grouping", () => {
    expect(formatMessage("{count} total bookmarks", { count: 2089 }, "en")).toBe(
      "2,089 total bookmarks"
    );
  });

  it("leaves small numbers byte-identical to the raw digits", () => {
    expect(formatMessage("{count} selected", { count: 11 }, "en")).toBe("11 selected");
  });

  it("keeps a placeholder with no matching parameter visible", () => {
    expect(formatMessage("Moved {count} bookmark(s).", {})).toBe("Moved {count} bookmark(s).");
  });

  it("passes strings through untouched", () => {
    expect(formatMessage("{query}?", { query: "a {b} c" })).toBe("a {b} c?");
  });
});

describe("formatNumber", () => {
  it("groups digits for en", () => {
    expect(formatNumber(2089, "en")).toBe("2,089");
    expect(formatNumber(42, "en")).toBe("42");
  });
});

describe("pluralForm", () => {
  it("classifies English counts", () => {
    expect(pluralForm(0, "en")).toBe("other");
    expect(pluralForm(1, "en")).toBe("one");
    expect(pluralForm(2, "en")).toBe("other");
  });
});

describe("selectPluralForm", () => {
  const forms = { one: "{count} bookmark", other: "{count} bookmarks" };

  it("picks the form Intl.PluralRules selects", () => {
    expect(selectPluralForm(forms, 1, "en")).toBe("{count} bookmark");
    expect(selectPluralForm(forms, 2, "en")).toBe("{count} bookmarks");
  });

  it("falls back to other for a category the message does not define", () => {
    const fewForms = { few: "{count} skimmed", other: "{count} bookmarks" };
    expect(selectPluralForm(fewForms, 1, "en")).toBe("{count} bookmarks");
  });

  it("falls back to other when the form itself is missing", () => {
    expect(selectPluralForm({ other: "{count} bookmarks" }, 1, "en")).toBe("{count} bookmarks");
  });
});

describe("formatDate", () => {
  it("formats a date for en", () => {
    expect(
      formatDate(new Date("2026-01-05T12:00:00Z"), { timeZone: "UTC", dateStyle: "long" }, "en")
    ).toBe("January 5, 2026");
  });
});

describe("formatRelativeTime", () => {
  it("formats English relative units", () => {
    expect(formatRelativeTime(-1, "day", undefined, "en")).toBe("1 day ago");
    expect(formatRelativeTime(2, "day", undefined, "en")).toBe("in 2 days");
  });
});
