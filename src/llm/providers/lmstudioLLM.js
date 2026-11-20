// LM Studio local server provider
// Expects options: { model?: string, baseUrl?: string, apiKey?: string }
// Default LM Studio server (REST): http://localhost:1234
// apiKey is optional: LM Studio itself needs none, but a server placed behind
// an authenticating proxy may require one. Sent as a Bearer header only when set.
// ARCH-02: generate() uses fetchWithRetry (30s timeout, up to 3 attempts).
// ARCH-05: generate() accepts an optional AbortSignal for ARCH-04 cancellation.

import { fetchWithRetry } from "../retry.js";

export function createLMStudioLLM({
  model = "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF",
  baseUrl = "http://localhost:1234",
  apiKey = "",
  temperature,
  enableTemperature = false,
} = {}) {
  // LM Studio exposes OpenAI-compatible /v1 endpoints
  const base = baseUrl.replace(/\/$/, "");
  // Only include Authorization when apiKey is non-empty, so the default local
  // setup keeps the keyless request it always worked with.
  const headers = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
  // Model discovery is a plain GET: Authorization only when a key is set, and
  // never Content-Type — a JSON content header would make the cross-origin GET
  // CORS-preflight, which servers permitting the bare GET may refuse
  // (Codex #215).
  const listHeaders = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  return {
    name: "lmstudio",
    async generate(prompt, signal) {
      const res = await fetchWithRetry(
        `${base}/v1/chat/completions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "You are a helpful assistant." },
              { role: "user", content: prompt },
            ],
            ...(enableTemperature && typeof temperature === "number" ? { temperature } : {}),
            stream: false,
          }),
        },
        {},
        signal
      );
      if (!res.ok) throw new Error(`LM Studio API error ${res.status}`);
      const data = await res.json();
      return data?.choices?.[0]?.message?.content || "";
    },
    async listModels() {
      try {
        const res = await fetch(`${base}/v1/models`, { method: "GET", headers: listHeaders });
        if (!res.ok) return [model];
        const data = await res.json();
        const names = (data?.data || []).map((m) => m?.id).filter(Boolean);
        return Array.from(new Set([model, ...names]));
      } catch {
        return [model];
      }
    },
  };
}
