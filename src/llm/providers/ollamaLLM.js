// Ollama local provider
// Expects options: { model?: string, baseUrl?: string, apiKey?: string }
// apiKey is optional: Ollama itself needs none, but a server placed behind an
// authenticating proxy may require one. Sent as a Bearer header only when set.
// ARCH-02: generate() uses fetchWithRetry (30s timeout, up to 3 attempts).
// ARCH-05: generate() accepts an optional AbortSignal for ARCH-04 cancellation.

import { fetchWithRetry } from "../retry.js";

export function createOllamaLLM({
  model = "llama3.1",
  baseUrl = "http://localhost:11434",
  apiKey = "",
  temperature,
  enableTemperature = false,
} = {}) {
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
    name: "ollama",
    async generate(prompt, signal) {
      const res = await fetchWithRetry(
        `${baseUrl}/api/generate`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            prompt,
            stream: false,
            ...(enableTemperature && typeof temperature === "number"
              ? { options: { temperature } }
              : {}),
          }),
        },
        {},
        signal
      );
      if (!res.ok) throw new Error(`Ollama API error ${res.status}`);
      const data = await res.json();
      return data?.response || "";
    },
    async listModels() {
      try {
        const res = await fetch(`${baseUrl}/api/tags`, { method: "GET", headers: listHeaders });
        if (!res.ok) return [model];
        const data = await res.json();
        const names = (data?.models || []).map((m) => m?.model || m?.name).filter(Boolean);
        return Array.from(new Set([model, ...names]));
      } catch {
        return [model];
      }
    },
  };
}
