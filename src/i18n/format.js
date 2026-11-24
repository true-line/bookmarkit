// Pure formatting for the UI message catalogue (#284): named-placeholder
// interpolation, inline emphasis, CLDR plural selection, and Intl-backed
// count/date formatting for the active locale. Deliberately dependency-free —
// no ICU library. No React here; the read side lives in index.js.

// One template token: an inline element (`<strong>…</strong>`) or a
// `{placeholder}`.
const TOKEN = /<(\w+)>([\s\S]*?)<\/\1>|\{(\w+)\}/g;

/**
 * The elements a template may name — the emphasis a sentence needs to stay
 * one template. Anything else (`<kbd>`, `<script>`) stays as literal text, so
 * a catalogue can never put an element on the page that the allow-list omits.
 */
export const RICH_TAGS = new Set(["strong", "em"]);

// Intl formatters are expensive to build, so instances are cached per locale.
const numberFormats = new Map();
const numberFormatFor = (locale) => {
  let format = numberFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(locale);
    numberFormats.set(locale, format);
  }
  return format;
};

const pluralRules = new Map();
const pluralRulesFor = (locale) => {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  return rules;
};

/** Format a count for the locale — `{count}` renders as `2,089` in en. */
export function formatNumber(value, locale = "en") {
  return numberFormatFor(locale).format(value);
}

/**
 * Split a template into ordered segments: a run of text, a `{placeholder}`
 * carrying its value, or an inline element holding its own segments. Text
 * that runs on uninterrupted is one string.
 */
export function interpolate(template, params = {}, locale = "en") {
  const segments = [];
  const text = (chunk) => {
    if (!chunk) return;
    const last = segments[segments.length - 1];
    if (typeof last === "string") segments[segments.length - 1] = last + chunk;
    else segments.push(chunk);
  };
  let end = 0;
  for (const match of template.matchAll(TOKEN)) {
    text(template.slice(end, match.index));
    end = match.index + match[0].length;
    const [, tag, inner, slot] = match;
    if (slot !== undefined) {
      const value = params[slot];
      // A slot with nothing to show stays visible rather than silently emptying.
      if (value === undefined || value === null) text(match[0]);
      else {
        segments.push({
          slot,
          value: typeof value === "number" ? formatNumber(value, locale) : value,
        });
      }
    } else if (RICH_TAGS.has(tag)) {
      segments.push({ tag, children: interpolate(inner, params, locale) });
    } else {
      text(match[0]);
    }
  }
  text(template.slice(end));
  return segments;
}

/**
 * The same segments as one plain string, for an aria-label, a title or any
 * other place that cannot hold markup: the emphasis goes, and a value only
 * markup can show (a React node) stays as its visible `{placeholder}`.
 */
export const segmentsToText = (segments) =>
  segments
    .map((segment) => {
      if (typeof segment === "string") return segment;
      if (segment.tag) return segmentsToText(segment.children);
      return typeof segment.value === "object" ? `{${segment.slot}}` : String(segment.value);
    })
    .join("");

/**
 * Fill a message template's named placeholders. Numeric values are formatted
 * with Intl.NumberFormat so counts read for the locale; pass strings for
 * everything else. A placeholder with no matching parameter is left visible
 * rather than silently dropped.
 */
export function formatMessage(template, params = {}, locale = "en") {
  return segmentsToText(interpolate(template, params, locale));
}

/** The CLDR plural category a count falls into ("one", "two", "few", "other"…). */
export function pluralForm(count, locale = "en") {
  return pluralRulesFor(locale).select(count);
}

/** Pick a plural message's form; a form the locale does not use falls back to "other". */
export function selectPluralForm(forms, count, locale = "en") {
  return forms[pluralForm(count, locale)] ?? forms.other;
}

export function formatDate(value, options = undefined, locale = "en") {
  return new Intl.DateTimeFormat(locale, options).format(value);
}

export function formatRelativeTime(value, unit, options = undefined, locale = "en") {
  return new Intl.RelativeTimeFormat(locale, options).format(value, unit);
}
