import { describe, it, expect } from "vitest";
import { DEFAULT_LOCALE, LOCALES, SYSTEM_LOCALE, dirFor, resolveLocale } from "./locales.js";

// #298: the registry's two pure decisions — which direction a locale's
// script writes in, and what the stored choice resolves to. These decide the
// root stamping and the selector, so an RTL locale must resolve and stamp
// correctly before any catalogue ships.

describe("dirFor", () => {
  it.each([
    ["ar", "rtl"],
    ["ar-EG", "rtl"],
    ["he", "rtl"],
    ["he-IL", "rtl"],
    ["fa", "rtl"],
    ["ur", "rtl"],
    ["en", "ltr"],
    ["en-US", "ltr"],
    ["ja", "ltr"],
    ["pt-BR", "ltr"],
  ])("%s → %s", (code, dir) => {
    expect(dirFor(code)).toBe(dir);
  });

  it("reads empty or unknown input as left-to-right", () => {
    expect(dirFor("")).toBe("ltr");
    expect(dirFor(undefined)).toBe("ltr");
    expect(dirFor("tlh-KLINGON")).toBe("ltr");
  });
});

describe("resolveLocale", () => {
  it("resolves the system choice to the browser's exact shipped tag", () => {
    expect(resolveLocale(SYSTEM_LOCALE, LOCALES, ["fr", "en"])).toBe("en");
  });

  it("resolves the system choice by the browser's language subtag", () => {
    // A registry with a regional tag and a browser asking for the same
    // language in another region.
    const available = [
      { code: "en", label: "English (LTR)" },
      { code: "pt-BR", label: "Português (LTR)" },
    ];
    expect(resolveLocale(SYSTEM_LOCALE, available, ["pt-PT", "pt"])).toBe("pt-BR");
    expect(resolveLocale(SYSTEM_LOCALE, available, ["en-GB"])).toBe("en");
  });

  it("resolves a right-to-left system language to the shipped RTL locale", () => {
    const available = [
      { code: "en", label: "English (LTR)" },
      { code: "ar", label: "العربية (RTL)" },
    ];
    expect(resolveLocale(SYSTEM_LOCALE, available, ["ar-EG"])).toBe("ar");
  });

  it("reads a system choice with no matching browser language as English", () => {
    expect(resolveLocale(SYSTEM_LOCALE, LOCALES, ["ja", "de-DE"])).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(SYSTEM_LOCALE, LOCALES, [])).toBe(DEFAULT_LOCALE);
  });

  it("takes an explicit shipped choice as-is, whatever the browser prefers", () => {
    expect(resolveLocale("en", LOCALES, ["ja"])).toBe("en");
  });

  it("reads a stale choice for a locale that no longer ships as English", () => {
    expect(resolveLocale("tlh", LOCALES, [])).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("zz", LOCALES, ["en"])).toBe(DEFAULT_LOCALE);
  });

  it("preserves an exact regional match over the first entry of the same language", () => {
    // Codex P2 on #317: lowercasing only the preference made an exact
    // pt-PT match miss mixed-case registry codes and land on pt-BR.
    const available = [
      { code: "en", label: "English (LTR)" },
      { code: "pt-BR", label: "Português do Brasil (LTR)" },
      { code: "pt-PT", label: "Português (LTR)" },
    ];
    expect(resolveLocale(SYSTEM_LOCALE, available, ["pt-PT"])).toBe("pt-PT");
    expect(resolveLocale("pt-PT", available, [])).toBe("pt-PT");
    expect(resolveLocale("pt-pt", available, [])).toBe("pt-PT");
    expect(resolveLocale(SYSTEM_LOCALE, available, ["pt-PT", "pt"])).toBe("pt-PT");
  });
});

describe("LOCALES registry", () => {
  it("wires every shipped entry to its catalogue", () => {
    // Codex P2 on #317: an entry whose catalogue is not imported renders
    // English while presenting the language as selectable.
    for (const locale of LOCALES) {
      expect(locale.messages).toBeDefined();
    }
    expect(LOCALES.find((locale) => locale.code === DEFAULT_LOCALE).messages).toBeDefined();
  });
});
