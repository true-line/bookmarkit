// The interface-language registry (#298) — what the UI can speak, what each
// language calls itself, and the direction its script writes in. The Options
// selector reads the list; LocaleProvider resolves the stored choice against
// it and stamps dir/lang from it. Adding a locale is: add its catalogue as
// src/i18n/messages/<code>.js beside the English one and an entry here — the
// selector, the direction stamping and the message lookup all pick it up with
// no other change.

export const DEFAULT_LOCALE = "en";

// The selector's first entry: not a locale, a choice that defers to the
// browser's own language preference.
export const SYSTEM_LOCALE = "system";

export const LOCALES = [
  // The catalogue ships English only today; the mockup's Arabic, Hebrew and
  // Japanese rows land with their message files.
  { code: "en", label: "English (LTR)" },
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
  const codes = available.map((locale) => locale.code);
  if (choice && choice !== SYSTEM_LOCALE && codes.includes(choice)) return choice;
  for (const tag of systemLanguages) {
    const normalized = String(tag || "").toLowerCase();
    if (codes.includes(normalized)) return normalized;
    const language = normalized.split("-")[0];
    const base = codes.find((code) => code.split("-")[0] === language);
    if (base) return base;
  }
  return DEFAULT_LOCALE;
}
