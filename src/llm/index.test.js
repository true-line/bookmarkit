import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import {
  MODEL_NOT_SELECTED,
  createLLM,
  isProviderReady,
  isSearchEnabled,
  resolveProviderOptions,
} from "./index.js";

// The AI SDK's generation entry is mocked, not its providers: model objects are
// built offline, and what these tests pin is what bookmarkit asks the SDK to do
// and how it reads the answers back.
const generateText = vi.fn();
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal()),
  generateText: (options) => generateText(options),
}));

// Counts vendor-chunk loads so tests can pin that refusing a request never
// pays for the lazy import.
const vendorState = vi.hoisted(() => ({ loads: 0 }));
vi.mock("./aiVendor.js", async (importOriginal) => {
  vendorState.loads += 1;
  return importOriginal();
});

beforeEach(() => {
  generateText.mockReset();
  generateText.mockResolvedValue({ text: "ok", output: { steps: [] } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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

describe("isSearchEnabled", () => {
  it("mirrors provider readiness while the key is readable", () => {
    expect(isSearchEnabled("gemini", { apiKey: "" }, false)).toBe(false);
    expect(isSearchEnabled("gemini", { apiKey: "k" }, false)).toBe(true);
    expect(isSearchEnabled("ollama", {}, false)).toBe(true);
  });

  // #29: a locked session has nothing readable, so readiness alone would
  // disable the box and strand the user before the unlock prompt — reached by
  // submitting a query.
  it("stays open while the options are encrypted and locked", () => {
    expect(isSearchEnabled("gemini", {}, true)).toBe(true);
    expect(isSearchEnabled(null, {}, true)).toBe(true);
  });
});

describe("createLLM generation (#224)", () => {
  it("refuses to generate without a chosen model — there are no defaults", async () => {
    const llm = createLLM("gemini", { apiKey: "k" });
    const vendorLoads = vendorState.loads;
    await expect(llm.generate("hi")).rejects.toThrow(MODEL_NOT_SELECTED);
    await expect(llm.generatePlan("hi")).rejects.toThrow(MODEL_NOT_SELECTED);
    expect(generateText).not.toHaveBeenCalled();
    // The refusal is local: the lazy vendor chunk is not fetched for it.
    expect(vendorState.loads).toBe(vendorLoads);
  });

  it("sends the prompt through the SDK and reads the text back", async () => {
    generateText.mockResolvedValue({ text: "hello", output: undefined });
    const llm = createLLM("gemini", { apiKey: "k", model: "m" });
    const controller = new AbortController();
    await expect(llm.generate("hi", controller.signal)).resolves.toBe("hello");

    expect(generateText).toHaveBeenCalledTimes(1);
    const options = generateText.mock.calls[0][0];
    expect(options.abortSignal).toBe(controller.signal);
    // Plain text generation carries no output schema.
    expect(options.output).toBeUndefined();
    // Temperature is only sent when the user turned it on.
    expect(options.temperature).toBeUndefined();
  });

  it("passes the plan schema as the output strategy and returns the parsed plan", async () => {
    generateText.mockResolvedValue({ text: "", output: { steps: [{ action: "help" }] } });
    const llm = createLLM("openai", { apiKey: "k", model: "m" });
    await expect(llm.generatePlan("hi")).resolves.toEqual({
      steps: [{ action: "help" }],
    });

    const options = generateText.mock.calls[0][0];
    expect(options.output).toBeDefined();
    expect(options.model).toBeDefined();
  });

  it("sends the temperature only when enabled, for hosted and local providers alike", async () => {
    const warm = createLLM("lmstudio", { model: "m", temperature: 0.4, enableTemperature: true });
    await warm.generate("hi");
    expect(generateText.mock.calls[0][0].temperature).toBe(0.4);

    const cold = createLLM("lmstudio", { model: "m", temperature: 0.4 });
    await cold.generate("hi");
    expect(generateText.mock.calls[1][0].temperature).toBeUndefined();
  });

  it("sends no Authorization header material for a keyless local server", async () => {
    const llm = createLLM("ollama", { model: "m" });
    await llm.generate("hi");
    // The model object carries whatever the provider would send; the point is
    // that construction without a key succeeds and the request is still made.
    expect(generateText).toHaveBeenCalledTimes(1);
  });
});

// #225 review: the transport a provider rides on is part of the contract —
// Chat Completions is what configurable endpoints advertise, and strict schema
// validation cannot express the plan schema's open `parameters` object.
describe("provider transports", () => {
  it("addresses OpenAI on Chat Completions with the plan schema as non-strict guidance", async () => {
    const llm = createLLM("openai", { apiKey: "k", model: "m" });
    await llm.generatePlan("hi");
    expect(generateText.mock.calls[0][0].model.provider).toBe("openai.chat");
  });

  it("keeps Grok on the Chat Completions path through the compatible provider", async () => {
    const llm = createLLM("grok", { apiKey: "k", model: "m" });
    await llm.generatePlan("hi");
    expect(generateText.mock.calls[0][0].model.provider).toBe("grok.chat");
  });

  it("hands the plan schema to the local servers, which take JSON-schema response formats", async () => {
    await createLLM("ollama", { model: "m" }).generatePlan("hi");
    const ollamaOptions = generateText.mock.calls[0][0];
    expect(ollamaOptions.model.provider).toBe("ollama.chat");
    expect(ollamaOptions.model.supportsStructuredOutputs).toBe(true);

    await createLLM("lmstudio", { model: "m" }).generatePlan("hi");
    const lmstudioOptions = generateText.mock.calls[1][0];
    expect(lmstudioOptions.model.provider).toBe("lmstudio.chat");
    expect(lmstudioOptions.model.supportsStructuredOutputs).toBe(true);
  });
});

describe("createLLM model discovery (#224)", () => {
  it("lists what Gemini serves, chat-capable only, without the models/ prefix", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: "models/gemini-chat", supportedGenerationMethods: ["generateContent"] },
          { name: "models/text-embedding", supportedGenerationMethods: ["embedContent"] },
          { name: "models/gemini-unmarked" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const models = await createLLM("gemini", { apiKey: "k" }).listModels();

    // An unmarked model has not said it can chat, so it stays out of the picker
    // exactly like the one that named itself an embedder.
    expect(models).toEqual(["gemini-chat"]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models"
    );
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ "x-goog-api-key": "k" });
  });

  it("asks each local server on its own endpoint, without pretending to know its models", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createLLM("ollama", {}).listModels()).rejects.toThrow(/403/);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:11434/api/tags");
    // Keyless discovery sends no Authorization header at all.
    expect(fetchMock.mock.calls[0][1].headers).toEqual({});

    await expect(createLLM("lmstudio", {}).listModels()).rejects.toThrow(/403/);
    expect(fetchMock.mock.calls[1][0]).toBe("http://localhost:1234/v1/models");
  });

  it("lets a failed listing fail — no canned fallback names (#224)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createLLM("openai", { apiKey: "bad" }).listModels()).rejects.toThrow(/401/);
    await expect(createLLM("grok", { apiKey: "bad" }).listModels()).rejects.toThrow(/401/);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.openai.com/v1/models");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.x.ai/v1/models");
  });

  it("honors a custom base URL without dropping the version segment", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    await createLLM("openai", { apiKey: "k", baseUrl: "https://proxy.example/v1" }).listModels();
    expect(fetchMock.mock.calls[0][0]).toBe("https://proxy.example/v1/models");

    await createLLM("ollama", { baseUrl: "http://at:11434/" }).listModels();
    expect(fetchMock.mock.calls[1][0]).toBe("http://at:11434/api/tags");
  });

  it("lists discovery as possible before a model is chosen", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    // Picking a model is the step discovery exists to enable.
    await expect(createLLM("openai", { apiKey: "k" }).listModels()).resolves.toEqual([]);
  });
});
