import { afterEach, describe, it, expect } from "vitest";

import { isProviderReady, resolveProviderOptions } from "./index.js";

describe("isProviderReady", () => {
  // A provider name is not consent: `gemini` is the default before anything is
  // configured, so a feature that transmits on its own initiative must not read
  // the name and go.
  it("wants a key before a remote provider is asked anything", () => {
    expect(isProviderReady("gemini", {})).toBe(false);
    expect(isProviderReady("openai", { apiKey: "   " })).toBe(false);
    expect(isProviderReady("gemini", { apiKey: "k" })).toBe(true);
  });

  it("asks nothing of a provider running on this machine", () => {
    expect(isProviderReady("ollama", {})).toBe(true);
    expect(isProviderReady("lmstudio", {})).toBe(true);
  });

  it("is not ready with no provider at all", () => {
    expect(isProviderReady("", { apiKey: "k" })).toBe(false);
    expect(isProviderReady(null)).toBe(false);
  });
});

describe("resolveProviderOptions", () => {
  afterEach(() => {
    delete globalThis.__llm_options__;
  });

  it("layers stored settings over the build-time ones and drops empties", () => {
    globalThis.__llm_options__ = { apiKey: "build", model: "build-model" };
    // A stored empty value is a deliberate "use the provider default", so it
    // shadows the build-time value rather than reverting to it.
    expect(resolveProviderOptions({ apiKey: "stored", model: "", baseUrl: null })).toEqual({
      apiKey: "stored",
    });
  });

  it("passes stored settings through untouched apart from the empties", () => {
    globalThis.__llm_options__ = undefined;
    expect(resolveProviderOptions({ apiKey: "k", model: "" })).toEqual({ apiKey: "k" });
    expect(resolveProviderOptions()).toEqual({});
  });
});
