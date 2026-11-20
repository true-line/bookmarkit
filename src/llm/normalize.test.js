import { describe, it, expect } from "vitest";
import { KNOWN_ACTIONS, PLAN_JSON_SCHEMA, normalizeSteps } from "./normalize.js";

describe("normalizeSteps", () => {
  it("returns [] for empty or non-plan input", () => {
    expect(normalizeSteps(null)).toEqual([]);
    expect(normalizeSteps(undefined)).toEqual([]);
    expect(normalizeSteps("sorry, I cannot help with that")).toEqual([]);
    expect(normalizeSteps(42)).toEqual([]);
  });

  it("accepts a single step object and wraps it into an array", () => {
    expect(normalizeSteps({ action: "resetSearch" })).toEqual([
      { action: "resetSearch", parameters: {} },
    ]);
  });

  it("drops steps with unknown actions", () => {
    expect(normalizeSteps([{ action: "nukeEverything" }, { action: "resetSearch" }])).toEqual([
      { action: "resetSearch", parameters: {} },
    ]);
  });

  it("sanitizes an unknown field back to the default", () => {
    expect(
      normalizeSteps([{ action: "findIncludes", parameters: { field: "bogus", value: "x" } }])
    ).toEqual([{ action: "findIncludes", parameters: { field: "title", value: "x" } }]);
  });

  it("drops a step when a required numeric param is invalid", () => {
    expect(normalizeSteps([{ action: "limitResults", parameters: { count: "abc" } }])).toEqual([]);
  });

  // #44: "clean up my bookmarks" means all three fields; anything else named is
  // dropped rather than defaulted, so a plan cannot ask to rewrite titles.
  it("keeps the organize fields it knows and drops the rest", () => {
    expect(
      normalizeSteps([
        { action: "organizeBookmarks", parameters: { fields: ["tags", "title", "folderId"] } },
      ])
    ).toEqual([{ action: "organizeBookmarks", parameters: { fields: ["tags", "folderId"] } }]);
  });

  it("organizes everything when no field is named", () => {
    expect(normalizeSteps([{ action: "organizeBookmarks" }])).toEqual([
      { action: "organizeBookmarks", parameters: { fields: ["tags", "folderId", "description"] } },
    ]);
  });

  it("reads `folder` as the folder field, which is what the wording suggests", () => {
    expect(
      normalizeSteps([{ action: "organizeBookmarks", parameters: { fields: ["folder"] } }])
    ).toEqual([{ action: "organizeBookmarks", parameters: { fields: ["folderId"] } }]);
  });

  it("refuses a tidy-up of only fields it cannot touch, rather than doing the rest", () => {
    expect(
      normalizeSteps([{ action: "organizeBookmarks", parameters: { fields: ["title"] } }])
    ).toEqual([]);
  });

  it("preserves a numeric priority", () => {
    expect(normalizeSteps([{ action: "resetSearch", priority: 2 }])).toEqual([
      { action: "resetSearch", parameters: {}, priority: 2 },
    ]);
  });

  it("coerces tag params to string arrays", () => {
    expect(
      normalizeSteps([{ action: "findWithTags", parameters: { includeTags: "news" } }])
    ).toEqual([{ action: "findWithTags", parameters: { includeTags: ["news"], excludeTags: [] } }]);
  });

  // A stored view's plan is untrusted data, exactly like a model's answer — the
  // same normalization applies to both, with no text round-trip in between.
  it("normalizes a stored plan as data, not text", () => {
    const stored = [
      { action: "searchBookmarks", parameters: { searchTerm: "docs" } },
      { action: "persistSortedOrder", parameters: { sortBy: "title", order: "desc" } },
    ];
    expect(normalizeSteps(stored)).toEqual([
      { action: "searchBookmarks", parameters: { searchTerm: "docs" } },
      { action: "persistSortedOrder", parameters: { sortBy: "title", order: "desc" } },
    ]);
  });

  it("does not treat a parameters string as usable", () => {
    expect(normalizeSteps([{ action: "searchBookmarks", parameters: "docs" }])).toEqual([]);
  });

  it("accepts a schema-shaped {steps} payload as the structured path delivers it", () => {
    expect(normalizeSteps({ steps: [{ action: "help", parameters: {}, priority: 0 }] })).toEqual([
      { action: "help", parameters: {}, priority: 0 },
    ]);
  });
});

describe("PLAN_JSON_SCHEMA", () => {
  // The schema is what providers are asked to enforce server-side; if it ever
  // drifts from the whitelist, structured output and normalization would accept
  // different plans.
  it("admits exactly the actions normalizeSteps does", () => {
    const enumActions = PLAN_JSON_SCHEMA.properties.steps.items.properties.action.enum;
    expect([...enumActions].sort()).toEqual([...KNOWN_ACTIONS].sort());
  });

  it("requires a steps array of action/parameters/priority triples", () => {
    expect(PLAN_JSON_SCHEMA.required).toEqual(["steps"]);
    expect(PLAN_JSON_SCHEMA.properties.steps.items.required).toEqual([
      "action",
      "parameters",
      "priority",
    ]);
    expect(PLAN_JSON_SCHEMA.properties.steps.items.additionalProperties).toBe(false);
  });
});

// #50: two actions with nothing to validate — one narrows the view, one opens the
// digest — so the only question is whether they survive the whitelist.
describe("the week's actions (#50)", () => {
  it("accepts a request for what was never opened", () => {
    expect(normalizeSteps([{ action: "findNeverOpened", parameters: {} }])).toEqual([
      { action: "findNeverOpened", parameters: {} },
    ]);
  });

  it("accepts a request for the digest", () => {
    expect(normalizeSteps([{ action: "weeklyDigest" }])).toEqual([
      { action: "weeklyDigest", parameters: {} },
    ]);
  });

  // A sort the menus offer but the whitelist rejects becomes a silent sort by title.
  it("sorts by last opened, as the manual sort does", () => {
    expect(
      normalizeSteps([{ action: "sortBookmarks", parameters: { sortBy: "lastOpenedAt" } }])
    ).toEqual([{ action: "sortBookmarks", parameters: { sortBy: "lastOpenedAt", order: "asc" } }]);
  });
});
