import { describe, it, expect } from "vitest";
import { classifyLLMError } from "./errors.js";

const categoryOf = (error) => classifyLLMError(error).category;

describe("classifyLLMError", () => {
  it("recognizes auth failures by status and by wording", () => {
    expect(categoryOf({ status: 401 })).toBe("api_key");
    expect(categoryOf(new Error("HTTP 403 Forbidden"))).toBe("api_key");
    expect(categoryOf(new Error("Invalid API key provided"))).toBe("api_key");
  });

  // #224: the AI SDK reports HTTP status as `statusCode`; the message must
  // still classify, and a provider without a chosen model says so plainly.
  it("reads the SDK's statusCode and recognizes a missing model", () => {
    expect(categoryOf({ statusCode: 429, message: "" })).toBe("rate_limit");
    const noModel = classifyLLMError(
      new Error("No model is selected for this provider. Open Options and choose one."),
      "gemini"
    );
    expect(noModel.category).toBe("no_model");
    expect(noModel.message).toMatch(/choose one/i);
    expect(noModel.message).not.toMatch(/API key/i);
  });

  it("recognizes rate limiting", () => {
    expect(categoryOf({ status: 429 })).toBe("rate_limit");
    expect(categoryOf(new Error("You exceeded your quota"))).toBe("rate_limit");
  });

  it("recognizes parse failures", () => {
    expect(categoryOf(new SyntaxError("Unexpected token < in JSON at position 0"))).toBe("parse");
  });

  it("treats a fetch TypeError as a connectivity problem (#28)", () => {
    const chrome = new TypeError("Failed to fetch");
    const firefox = new TypeError("NetworkError when attempting to fetch resource.");
    const safari = new TypeError("Load failed");

    expect(categoryOf(chrome)).toBe("network");
    expect(categoryOf(firefox)).toBe("network");
    expect(categoryOf(safari)).toBe("network");
  });

  it("does not disguise a programming TypeError as a connectivity problem (#28)", () => {
    const bug = new TypeError("llm.generate is not a function");

    expect(categoryOf(bug)).toBe("generic");
    expect(classifyLLMError(bug).message).not.toMatch(/internet connection/u);
  });

  it("falls back to a generic message", () => {
    expect(categoryOf(new Error("something else entirely"))).toBe("generic");
    expect(categoryOf(undefined)).toBe("generic");
  });

  it("never returns the raw error text", () => {
    const { message } = classifyLLMError(new Error("secret-token-abc123 rejected"));
    expect(message).not.toContain("secret-token-abc123");
  });

  // #197: a local server's 403 is usually an origin refusal, not a missing key,
  // so the hosted advice would send the user in circles. The optional proxy key
  // gets a mention first, where it can actually be the cause.
  it("reads a keyless local provider's refusal as the server, not a missing key", () => {
    const { category, message } = classifyLLMError(new Error("Ollama API error 403"), "ollama");

    expect(category).toBe("local_refused");
    expect(message).toMatch(/OLLAMA_ORIGINS/u);
    expect(message).toMatch(/If you set an API key/u);
    expect(message).not.toMatch(/enter your API key/u);
    expect(classifyLLMError(new Error("LM Studio API error 401"), "lmstudio").category).toBe(
      "local_refused"
    );
  });

  it("blames a local outage on the machine, not the internet", () => {
    const chrome = new TypeError("Failed to fetch");
    const { category, message } = classifyLLMError(chrome, "ollama");

    // Not `network`: unlike a hosted provider's drop-out, a local outage repeats
    // until the server is back, and callers treat that as a stop, not a skip.
    expect(category).toBe("local_unreachable");
    expect(message).toMatch(/running/u);
    expect(message).not.toMatch(/internet connection/u);
  });

  it("keeps the hosted-provider reading where a key can actually help", () => {
    expect(classifyLLMError(new Error("Gemini API error 403"), "gemini").category).toBe("api_key");
    expect(classifyLLMError(new Error("OpenAI API error 401"), "openai").message).toMatch(
      /API key/u
    );
    // The default reading, provider unknown, is unchanged too.
    expect(classifyLLMError(new Error("Ollama API error 403")).category).toBe("api_key");
  });

  it("classifies a local provider's other errors as before", () => {
    expect(classifyLLMError(new Error("Ollama API error 500"), "ollama").category).toBe("generic");
    expect(classifyLLMError(new Error("HTTP 429"), "lmstudio").category).toBe("rate_limit");
  });
});

// #307: the wording is the catalogue's. A caller that only wants the category
// still gets it, and a caller with its own translator gets that translator's
// sentence — so a classifier is the same classifier in every language.
describe("classifyLLMError messages come from the catalogue", () => {
  // A translator that answers with the key it was asked for and the parameters
  // it was given, so the test can see exactly which message was requested.
  const echo = (key, params) =>
    params && Object.keys(params).length ? `${key} ${JSON.stringify(params)}` : key;
  const error = (message) => new Error(message);

  it.each([
    ["no model is selected", undefined, "no_model", "llmError.noModel"],
    ["Invalid API key provided", undefined, "api_key", "llmError.apiKey"],
    ["HTTP 429", undefined, "rate_limit", "llmError.rateLimit"],
    ["Failed to fetch", undefined, "network", "llmError.network"],
    ["Unexpected token in JSON", undefined, "parse", "llmError.parse"],
    ["something else entirely", undefined, "generic", "llmError.generic"],
    ["Ollama API error 403", "ollama", "local_refused", "llmError.ollamaRefused"],
    ["Failed to fetch", "ollama", "local_unreachable", "llmError.ollamaUnreachable"],
    ["LM Studio API error 401", "lmstudio", "local_refused", "llmError.lmStudioRefused"],
    ["Failed to fetch", "lmstudio", "local_unreachable", "llmError.lmStudioUnreachable"],
  ])("reads %s (%s) as %s from %s", (message, provider, category, key) => {
    const classified = classifyLLMError(error(message), provider, echo);

    expect(classified.category).toBe(category);
    expect(classified.message.startsWith(key)).toBe(true);
  });

  it("hands a local refusal its status as a number for the locale to format", () => {
    expect(classifyLLMError(error("Ollama API error 403"), "ollama", echo).message).toBe(
      'llmError.ollamaRefused {"status":403}'
    );
  });

  it("reads the message in effect outside a component when given no translator", () => {
    expect(classifyLLMError(error("HTTP 429")).message).toBe(
      "Rate limit reached. Please wait a moment before trying again."
    );
  });

  it("is the same classification with and without a translator", () => {
    for (const [message, provider] of [
      ["Invalid API key", undefined],
      ["Failed to fetch", "ollama"],
      ["HTTP 500", "lmstudio"],
    ]) {
      expect(classifyLLMError(error(message), provider, echo).category).toBe(
        classifyLLMError(error(message), provider).category
      );
    }
  });
});
