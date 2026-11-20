import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { createLMStudioLLM } from "./lmstudioLLM.js";

const ok = (body) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  delete globalThis.fetch;
});

describe("createLMStudioLLM", () => {
  // LM Studio itself needs no key: the default request must stay keyless. The
  // optional one exists for a server behind an authenticating proxy.
  it("generates without an Authorization header when no key is set", async () => {
    globalThis.fetch.mockResolvedValue(ok({ choices: [{ message: { content: "hi" } }] }));

    await createLMStudioLLM({ model: "m" }).generate("prompt");

    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toContain("/v1/chat/completions");
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("sends the optional key as a Bearer token when set", async () => {
    globalThis.fetch.mockResolvedValue(ok({ choices: [{ message: { content: "hi" } }] }));

    await createLMStudioLLM({ model: "m", apiKey: "proxy-key" }).generate("prompt");

    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer proxy-key");
  });

  it("authenticates model discovery with the same key", async () => {
    globalThis.fetch.mockResolvedValue(ok({ data: [{ id: "m" }] }));

    await createLMStudioLLM({ apiKey: "proxy-key" }).listModels();

    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toContain("/v1/models");
    expect(init.headers.Authorization).toBe("Bearer proxy-key");
  });
});
