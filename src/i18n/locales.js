// The interface-language registry (#298) — what the UI can speak, what each
// language calls itself, and the direction its script writes in. The Options
// selector reads the list; LocaleProvider resolves the stored choice against
// it, stamps dir/lang from it, and mounts the catalogue the entry carries.
// Adding a locale is: add its catalogue as src/i18n/messages/<code>.js beside
// the English one and one entry here that imports it — the selector, the
// direction stamping and the message lookup all pick it up with no other
// change.

import en from "./messages/en.js";

export const DEFAULT_LOCALE = "en";

// The selector's first entry: not a locale, a choice that defers to the
// browser's own language preference.
export const SYSTEM_LOCALE = "system";

export const LOCALES = [
  // The catalogue ships English only today; the mockup's Arabic, Hebrew and
  // Japanese rows land with their message files. The messages ride the entry
  // (codex P2 on #317): a registry detached from its catalogues would render
  // English while presenting the language as selectable.
  { code: "en", label: "English (LTR)", messages: en },
];

// The languages whose script runs right-to-left, by language subtag. Anything
// not listed writes left-to-right.
const RTL_LANGUAGES = new Set([
  "ar",
  "he",
  "fa",
  "ur",
  "ps",
  "sd",
  "ug",
  "ckb",
  "yi",
  "syc",
  "diq",
]);

// The direction a locale's script writes in: "ar" → "rtl", "ar-EG" → "rtl",
// "en-US" → "ltr", unknown → "ltr". One source of truth for the root stamping
// and for tests of it.
export const dirFor = (code) => {
  const language = String(code || "")
    .split("-")[0]
    .toLowerCase();
  return RTL_LANGUAGES.has(language) ? "rtl" : "ltr";
};

// The stored choice — SYSTEM_LOCALE or a registry code — resolved to the
// locale the UI renders in. "System" walks the browser's own preferences
// against what we ship (exact tag first, then the language subtag); an
// explicit shipped code is taken as-is; anything else — including a stale
// code for a locale that no longer ships — reads English rather than
// breaking the select or the copy.
export function resolveLocale(choice, available = LOCALES, systemLanguages = []) {
  // Comparison is case-insensitive on both sides; the returned code is always
  // the registered one, so a pt-PT preference lands on pt-PT rather than the
  // first pt-* entry (codex P2 on #317).
  const registered = new Map(available.map((locale) => [locale.code.toLowerCase(), locale.code]));
  const choiceKey = String(choice || "").toLowerCase();
  if (choice && choice !== SYSTEM_LOCALE && registered.has(choiceKey)) {
    return registered.get(choiceKey);
  }
  for (const tag of systemLanguages) {
    const normalized = String(tag || "").toLowerCase();
    if (registered.has(normalized)) return registered.get(normalized);
    const language = normalized.split("-")[0];
    const base = [...registered.keys()].find((code) => code.split("-")[0] === language);
    if (base) return registered.get(base);
  }
  return DEFAULT_LOCALE;
}
