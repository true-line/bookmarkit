// ARCH-01: Centralized plan normalization — per-step validation and parameter
// sanitization for agent plans, wherever they come from: a model's structured
// output, or a stored view read back from storage (both untrusted).
//
// ARCH-03: Lightweight hand-written validators (no Zod) to keep bundle size
// minimal for the Chrome extension. Each validator coerces types and returns
// sanitized parameters so applyAgentPlan() can trust the data it receives.
//
// The JSON-extraction half the old parser needed — fence unwrapping,
// balanced-brace scanning, provider-envelope unwrapping — is gone: the plan is
// now requested against PLAN_JSON_SCHEMA (#224), so what arrives is JSON or an
// error, and this module only judges the shape of what arrived.

// ─── Constants ────────────────────────────────────────────────────────────────

export const KNOWN_ACTIONS = [
  "searchBookmarks",
  "showAllBookmarks",
  "resetSearch",
  "importBookmarks",
  "exportBookmarks",
  "removeDuplicates",
  "organizeBookmarks",
  "help",
  "findIncludes",
  "findStartsWith",
  "findWithTags",
  "filterByRating",
  "findBrokenLinks",
  "findNeverOpened",
  "weeklyDigest",
  "sortBookmarks",
  "limitResults",
  "limitFirst",
  "limitLast",
  "reorder",
  "reorderAscending",
  "reorderDescending",
  "persistSortedOrder",
];

const FIELD_VALUES = new Set(["title", "url", "description", "tags"]);
const SORT_BY_VALUES = new Set([
  "title",
  "rating",
  "url",
  "folder",
  "createdAt",
  "updatedAt",
  "lastOpenedAt",
]);
const ORDER_VALUES = new Set(["asc", "desc"]);
const DIRECTION_VALUES = new Set(["first", "last"]);
const SCOPE_VALUES = new Set(["current", "all"]);
const COMPARATOR_VALUES = new Set(["gte", "lte", "eq"]);
const ORGANIZE_FIELD_VALUES = new Set(["tags", "folderId", "description"]);

// The names a model reaches for when it means one of those. "Suggest folders" is
// the wording the README uses, so `folder` arriving instead of `folderId` is the
// request being understood, not an unsupported field.
const ORGANIZE_FIELD_ALIASES = new Map([
  ["folder", "folderId"],
  ["folders", "folderId"],
  ["folderpath", "folderId"],
  ["tag", "tags"],
  ["descriptions", "description"],
]);

// ─── The schema a plan is requested against ──────────────────────────────────
//
// Strict-friendly (every property required, nothing additional) so providers
// with native structured output can enforce it server-side. `parameters` is
// typed loosely on purpose: the per-action validators below are the authority
// on what each action accepts, and a schema per action would model every
// parameter as required under strict mode.

export const PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string", enum: KNOWN_ACTIONS },
          parameters: { type: "object", additionalProperties: true },
          priority: { type: "number" },
        },
        required: ["action", "parameters", "priority"],
        additionalProperties: false,
      },
    },
  },
  required: ["steps"],
  additionalProperties: false,
};

// ─── Utility coercions ────────────────────────────────────────────────────────

function toStringArray(val) {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string" && val.length > 0) return [val];
  return [];
}

function toPositiveInt(val) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function toFiniteNumber(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

// ─── ARCH-03: Schema validators ───────────────────────────────────────────────
// Each validator: (params: object) => { valid: boolean, sanitized: object, errors: string[] }

const ACTION_SCHEMAS = {
  // No-parameter actions
  showAllBookmarks: (_p) => ({ valid: true, sanitized: {}, errors: [] }),
  resetSearch: (_p) => ({ valid: true, sanitized: {}, errors: [] }),
  importBookmarks: (_p) => ({ valid: true, sanitized: {}, errors: [] }),
  exportBookmarks: (_p) => ({ valid: true, sanitized: {}, errors: [] }),
  removeDuplicates: (_p) => ({ valid: true, sanitized: {}, errors: [] }),
  // #47: takes no parameters — the status it filters on was written by the sweep.
  findBrokenLinks: (_p) => ({ valid: true, sanitized: {}, errors: [] }),
  // #50: both take no parameters — one narrows the view, one opens the digest.
  findNeverOpened: (_p) => ({ valid: true, sanitized: {}, errors: [] }),
  weeklyDigest: (_p) => ({ valid: true, sanitized: {}, errors: [] }),

  // #44: which of tags, folder and description to propose. Anything else asked
  // for is dropped rather than defaulted, so "clean up the titles" cannot become
  // a plan that rewrites titles.
  organizeBookmarks(p) {
    const errors = [];
    const named = p?.fields != null;
    const asked = Array.isArray(p?.fields) ? p.fields : named ? [p.fields] : [];
    const fields = [];
    for (const field of asked) {
      const name = ORGANIZE_FIELD_ALIASES.get(String(field).trim().toLowerCase()) ?? field;
      if (!ORGANIZE_FIELD_VALUES.has(name)) {
        errors.push(`Unknown organize field "${field}", ignored`);
        continue;
      }
      if (!fields.includes(name)) fields.push(name);
    }
    // Naming no fields means all of them, which is what "clean up my bookmarks"
    // asks for. Naming only fields this cannot touch is a refusal, though — "tidy
    // up the titles" must do nothing rather than propose tags instead.
    if (named && fields.length === 0) return { valid: false, sanitized: {}, errors };
    return {
      valid: true,
      sanitized: { fields: fields.length > 0 ? fields : [...ORGANIZE_FIELD_VALUES] },
      errors,
    };
  },
  help: (_p) => ({ valid: true, sanitized: {}, errors: [] }),

  searchBookmarks(p) {
    const searchTerm = p?.searchTerm != null ? String(p.searchTerm) : "";
    return { valid: true, sanitized: { searchTerm }, errors: [] };
  },

  findIncludes(p) {
    const errors = [];
    const field = FIELD_VALUES.has(p?.field) ? p.field : "title";
    if (!FIELD_VALUES.has(p?.field))
      errors.push(`Unknown field "${p?.field}", defaulting to "title"`);
    const value = p?.value != null ? String(p.value) : "";
    return { valid: true, sanitized: { field, value }, errors };
  },

  findStartsWith(p) {
    const errors = [];
    const field = FIELD_VALUES.has(p?.field) ? p.field : "title";
    if (!FIELD_VALUES.has(p?.field))
      errors.push(`Unknown field "${p?.field}", defaulting to "title"`);
    const value = p?.value != null ? String(p.value) : "";
    return { valid: true, sanitized: { field, value }, errors };
  },

  findWithTags(p) {
    const errors = [];
    if (!Array.isArray(p?.includeTags) && p?.includeTags != null) {
      errors.push(`includeTags coerced from ${typeof p.includeTags} to array`);
    }
    const includeTags = toStringArray(p?.includeTags);
    const excludeTags = toStringArray(p?.excludeTags);
    return { valid: true, sanitized: { includeTags, excludeTags }, errors };
  },

  filterByRating(p) {
    const errors = [];
    const sanitized = {};
    if (p?.minRating != null) {
      const n = toFiniteNumber(p.minRating);
      if (n === undefined) errors.push(`minRating "${p.minRating}" is not a number, ignored`);
      else sanitized.minRating = n;
    }
    if (p?.maxRating != null) {
      const n = toFiniteNumber(p.maxRating);
      if (n === undefined) errors.push(`maxRating "${p.maxRating}" is not a number, ignored`);
      else sanitized.maxRating = n;
    }
    if (p?.exact != null) {
      const n = toFiniteNumber(p.exact);
      if (n === undefined) errors.push(`exact "${p.exact}" is not a number, ignored`);
      else sanitized.exact = n;
    }
    if (p?.comparator != null) {
      if (COMPARATOR_VALUES.has(p.comparator)) sanitized.comparator = p.comparator;
      else errors.push(`Unknown comparator "${p.comparator}", ignored`);
    }
    return { valid: true, sanitized, errors };
  },

  sortBookmarks(p) {
    const errors = [];
    const sortBy = SORT_BY_VALUES.has(p?.sortBy) ? p.sortBy : "title";
    const order = ORDER_VALUES.has(p?.order) ? p.order : "asc";
    if (!SORT_BY_VALUES.has(p?.sortBy))
      errors.push(`Unknown sortBy "${p?.sortBy}", defaulting to "title"`);
    if (!ORDER_VALUES.has(p?.order))
      errors.push(`Unknown order "${p?.order}", defaulting to "asc"`);
    return { valid: true, sanitized: { sortBy, order }, errors };
  },

  limitResults(p) {
    const count = toPositiveInt(p?.count);
    if (count === undefined) {
      return {
        valid: false,
        sanitized: {},
        errors: [`count "${p?.count}" is not a positive integer`],
      };
    }
    const direction = DIRECTION_VALUES.has(p?.direction) ? p.direction : "first";
    const scope = SCOPE_VALUES.has(p?.scope) ? p.scope : "current";
    return { valid: true, sanitized: { count, direction, scope }, errors: [] };
  },

  limitFirst(p) {
    const count = toPositiveInt(p?.count);
    if (count === undefined) {
      return {
        valid: false,
        sanitized: {},
        errors: [`count "${p?.count}" is not a positive integer`],
      };
    }
    return { valid: true, sanitized: { count }, errors: [] };
  },

  limitLast(p) {
    const count = toPositiveInt(p?.count);
    if (count === undefined) {
      return {
        valid: false,
        sanitized: {},
        errors: [`count "${p?.count}" is not a positive integer`],
      };
    }
    return { valid: true, sanitized: { count }, errors: [] };
  },

  reorder(p) {
    const errors = [];
    const sortBy = SORT_BY_VALUES.has(p?.sortBy) ? p.sortBy : "title";
    const order = ORDER_VALUES.has(p?.order) ? p.order : "asc";
    if (!SORT_BY_VALUES.has(p?.sortBy))
      errors.push(`Unknown sortBy "${p?.sortBy}", defaulting to "title"`);
    if (!ORDER_VALUES.has(p?.order))
      errors.push(`Unknown order "${p?.order}", defaulting to "asc"`);
    return { valid: true, sanitized: { sortBy, order }, errors };
  },

  reorderAscending(p) {
    const sanitized = {};
    if (SORT_BY_VALUES.has(p?.sortBy)) sanitized.sortBy = p.sortBy;
    return { valid: true, sanitized, errors: [] };
  },

  reorderDescending(p) {
    const sanitized = {};
    if (SORT_BY_VALUES.has(p?.sortBy)) sanitized.sortBy = p.sortBy;
    return { valid: true, sanitized, errors: [] };
  },

  persistSortedOrder(p) {
    const errors = [];
    const sanitized = {};
    if (p?.sortBy != null) {
      if (SORT_BY_VALUES.has(p.sortBy)) sanitized.sortBy = p.sortBy;
      else errors.push(`Unknown sortBy "${p.sortBy}", ignored`);
    }
    const order = ORDER_VALUES.has(p?.order) ? p.order : "asc";
    if (p?.order != null && !ORDER_VALUES.has(p.order)) {
      errors.push(`Unknown order "${p.order}", defaulting to "asc"`);
    }
    sanitized.order = order;
    return { valid: true, sanitized, errors };
  },
};

const KNOWN_ACTION_SET = new Set(KNOWN_ACTIONS);

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Normalize an untrusted plan value into validated, sanitized steps.
 *
 * Handles the schema-shaped `{steps: [...]}` payload the structured path
 * delivers, a bare array of steps, or a single step object; anything else, and
 * any step with a missing or unknown action, yields nothing — an unknown action
 * must never reach applyAgentPlan, whether it arrived from a model or from
 * storage.
 *
 * @param {unknown} value - A parsed plan: `{steps}`, a step array, a step object, or anything else.
 * @returns {Array<{ action: string, parameters: object, priority?: number }>}
 */
export function normalizeSteps(value) {
  const plan = value && !Array.isArray(value) && Array.isArray(value.steps) ? value.steps : value;
  const stepsArray = Array.isArray(plan) ? plan : [plan];

  const validSteps = [];
  for (const step of stepsArray) {
    if (!step || typeof step !== "object" || typeof step.action !== "string") {
      console.warn("[normalize] Dropping step — missing or non-string action:", step);
      continue;
    }

    const { action, parameters, priority } = step;

    if (!KNOWN_ACTION_SET.has(action)) {
      console.warn(`[normalize] Dropping step — unknown action "${action}"`);
      continue;
    }

    // parameters must be undefined, null, or a plain object
    if (parameters !== undefined && parameters !== null && typeof parameters !== "object") {
      console.warn(
        `[normalize] Dropping step "${action}" — parameters must be an object, got ${typeof parameters}:`,
        parameters
      );
      continue;
    }

    const sanitizedPriority = priority !== undefined ? Number(priority) : undefined;
    const params = parameters && typeof parameters === "object" ? parameters : {};

    const validator = ACTION_SCHEMAS[action];
    if (validator) {
      const result = validator(params);
      if (!result.valid) {
        console.warn(`[normalize] Dropping step "${action}" — validation failed:`, result.errors);
        continue;
      }
      if (result.errors.length > 0) {
        console.warn(`[normalize] Step "${action}" — sanitized with warnings:`, result.errors);
      }
      validSteps.push({
        action,
        parameters: result.sanitized,
        ...(sanitizedPriority !== undefined && { priority: sanitizedPriority }),
      });
    } else {
      validSteps.push({
        action,
        parameters: params,
        ...(sanitizedPriority !== undefined && { priority: sanitizedPriority }),
      });
    }
  }

  return validSteps;
}
