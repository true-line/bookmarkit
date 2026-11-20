import { describe, expect, it } from "vitest";
import { isWebMcpSupported, registerWebMcpTools } from "./registerWebMcpTools.js";

/** A modelContext that remembers what was registered, like the real one. */
function fakeModelContext() {
  const registrations = new Map();
  return {
    registrations,
    registerTool: async (tool, options = {}) => {
      registrations.set(tool.name, { tool, options });
    },
  };
}

describe("isWebMcpSupported (#212)", () => {
  it("is false without the API and true with it, on documents", () => {
    expect(isWebMcpSupported({})).toBe(false);
    expect(isWebMcpSupported({ modelContext: null })).toBe(false);
    expect(isWebMcpSupported({ modelContext: {} })).toBe(true);
  });
});

describe("registerWebMcpTools (#212)", () => {
  it("registers both read-only tools under their wire names", async () => {
    const mc = fakeModelContext();
    await registerWebMcpTools({ modelContext: mc, getList: () => [] });
    expect([...mc.registrations.keys()].sort()).toEqual(["list_folders", "search_bookmarks"]);
  });

  it("hands the registration signal through, so aborting unregisters", async () => {
    const mc = fakeModelContext();
    const controller = new AbortController();
    await registerWebMcpTools({ modelContext: mc, getList: () => [], signal: controller.signal });
    for (const { options } of mc.registrations.values()) {
      expect(options.signal.aborted).toBe(false);
    }
    controller.abort();
    for (const { options } of mc.registrations.values()) {
      expect(options.signal.aborted).toBe(true);
    }
  });

  it("answers with the list as it is at call time, not at registration time", async () => {
    const mc = fakeModelContext();
    let current = [{ id: "a", title: "First", url: "https://a", tags: [], folderId: "" }];
    await registerWebMcpTools({ modelContext: mc, getList: () => current });

    const { tool } = mc.registrations.get("search_bookmarks");
    expect((await tool.execute({})).total).toBe(1);

    current = [
      { id: "a", title: "First", url: "https://a", tags: [], folderId: "" },
      { id: "b", title: "Second", url: "https://b", tags: [], folderId: "" },
    ];
    expect((await tool.execute({})).total).toBe(2);
  });

  it("throws on a document without modelContext rather than registering partly", async () => {
    await expect(registerWebMcpTools({ getList: () => [] })).rejects.toThrow(/not available/);
  });
});
