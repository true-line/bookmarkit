// ARCH-05: LLM provider abstraction on the Vercel AI SDK (#224).
//
// The five hand-rolled fetch adapters are gone. What is left here is the seam
// the rest of the app talks to — `generate` for plain text (digest, organizer,
// dedupe, form suggestions), `generatePlan` for the agent engine's
// schema-enforced plan, and `listModels` for discovery — with each provider's
// base-URL contract and endpoint-driven model listing preserved exactly.
//
// Direct-to-provider egress is unchanged: the user's key goes from the
// encrypted store to the user's chosen provider and nowhere else. No gateway,
// no telemetry.
//
// The SDK and the zod runtime it validates against are loaded on the first
// generation call, not at startup: the vendor chunk is a local asset, and the
// features that need it are all waiting on a model's answer anyway, so a
// once-per-session module load disappears inside the network round-trip.
// Discovery never loads it — picking a model is the step that comes first.

import { PLAN_JSON_SCHEMA } from "./normalize.js";

/**
 * @typedef {Object} LLMProvider
 * @property {string} name - Provider key (e.g. 'gemini', 'openai', 'ollama')
 * @property {(prompt: string, signal?: AbortSignal) => Promise<string>} generate
 *   Generate a text response from the given prompt.
 *   `signal` is an optional AbortSignal for ARCH-04 request cancellation.
 * @property {(prompt: string, signal?: AbortSignal) => Promise<{steps: object[]}>} generatePlan
 *   Generate an agent plan against PLAN_JSON_SCHEMA. Throws when no usable plan
 *   came back; the caller owns normalization and fallback.
 * @property {() => Promise<string[]>} listModels
 *   The models the endpoint actually serves. No canned fallbacks: a failed
 *   listing throws, so the UI can show an honest empty state instead of stale
 *   names the endpoint may no longer accept (#224).
 */

export const LLM_PROVIDERS = {
  GEMINI: "gemini",
  OPENAI: "openai", // ChatGPT
  GROK: "grok",
  OLLAMA: "ollama",
  LMSTUDIO: "lmstudio",
};

/**
 * Providers that reach a third party, and need a key to be asked anything.
 * Ollama and LM Studio run on the user's own machine and work without a key;
 * one set for them is optional, for a server behind an authenticating proxy.
 */
const KEY_REQUIRED = new Set([LLM_PROVIDERS.GEMINI, LLM_PROVIDERS.OPENAI, LLM_PROVIDERS.GROK]);

/**
 * The error `generate`/`generatePlan` throw without a chosen model. Its message
 * is matched by classifyLLMError, so every caller shows the same guidance.
 */
export const MODEL_NOT_SELECTED =
  "No model is selected for this provider. Open Options and choose one from the list, or type its id.";

/**
 * Whether this provider can actually be asked something.
 *
 * A provider name alone is not consent: `gemini` is the default before anything
 * is configured, so a feature that read the name and called anyway would send
 * bookmark titles to a remote API for a request destined to fail on its missing
 * key. Anything that transmits user data on its own initiative — rather than
 * because the user typed a query — checks this first.
 *
 * @param {string} provider
 * @param {object} [options] The merged provider options, build-time ones included.
 * @returns {boolean}
 */
export function isProviderReady(provider, options = {}) {
  const p = (provider || "").toString().toLowerCase();
  if (!p) return false;
  if (!KEY_REQUIRED.has(p)) return true;
  return String(options?.apiKey ?? "").trim().length > 0;
}

/**
 * The options a request would actually go out with: build-time options are the
 * base layer, the caller's stored settings override them, and empty values are
 * dropped so provider defaults apply. Readiness checks and the requests
 * themselves read this same merge, so what the UI treats as configured is what
 * a call would use.
 *
 * @param {object} [providerOptions] The stored options for the chosen provider.
 * @returns {object}
 */
export function resolveProviderOptions(providerOptions = {}) {
  const configured = (typeof __llm_options__ !== "undefined" && __llm_options__) || {};
  const merged = { ...configured, ...(providerOptions || {}) };
  return Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== "" && v != null));
}

/**
 * Whether the natural-language search box should take input. Request readiness,
 * with one deliberate exception that keeps the box open for a query whose
 * purpose is reaching a message: a locked session. With the options encrypted
 * there is nothing to read, and submitting a query is how the user reaches the
 * engine's unlock prompt (#29). A missing model keeps the box open too — the
 * engine's no-model message explains what to do, rather than the box going dark
 * with no hint why (#224).
 *
 * @param {string} provider
 * @param {object} [providerOptions] The stored options for the chosen provider.
 * @param {boolean} [locked] Encrypted options not unlocked this session.
 * @returns {boolean}
 */
export function isSearchEnabled(provider, providerOptions = {}, locked = false) {
  if (locked) return true;
  return isProviderReady(provider, resolveProviderOptions(providerOptions));
}

const trimSlash = (url) => String(url ?? "").replace(/\/+$/u, "");

// ARCH-02 preserved: 30s per request, and the SDK's transport retries stand in
// for what fetchWithRetry did for the adapters.
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;

// The vendor surface this module uses, resolved once per session. Everything
// the old adapters re-implemented — timeouts, transport retries, cancellation,
// structured output — lives behind it.
let vendorPromise = null;
function loadVendor() {
  vendorPromise ??= import("./aiVendor.js").then((m) => m.vendor);
  return vendorPromise;
}

/**
 * The model id a request needs. There are no defaults anywhere (#224): a
 * provider without a chosen model is one user decision away from working, and
 * guessing a name the endpoint may not serve is how the list rotted before.
 */
function requireModel(model) {
  if (!String(model ?? "").trim()) throw new Error(MODEL_NOT_SELECTED);
  return model;
}

// Model discovery is a plain GET: Authorization only when a key is set, and
// never Content-Type — a JSON content header would make the cross-origin GET
// CORS-preflight, which servers permitting the bare GET may refuse
// (Codex #215).
const listHeaders = (apiKey) => (apiKey ? { Authorization: `Bearer ${apiKey}` } : {});

async function listOpenAICompatibleModels(url, apiKey) {
  const res = await fetch(url, { method: "GET", headers: listHeaders(apiKey) });
  if (!res.ok) throw new Error(`Model list failed with status ${res.status}`);
  const data = await res.json();
  return (data?.data || []).map((m) => m?.id).filter(Boolean);
}

/**
 * The one generation path: plain text, or a plan when an output schema is
 * given. It receives the loaded vendor, so no provider builder holds a static
 * reference into the lazy chunk.
 */
async function runGeneration(
  vendor,
  { model, prompt, signal, temperature, enableTemperature, output }
) {
  return vendor.generateText({
    model,
    prompt,
    ...(signal ? { abortSignal: signal } : {}),
    maxRetries: MAX_RETRIES,
    timeout: { totalMs: REQUEST_TIMEOUT_MS },
    ...(enableTemperature && typeof temperature === "number" ? { temperature } : {}),
    ...(output ? { output } : {}),
  });
}

/**
 * Build the provider seam for `provider` under `options`.
 *
 * Each provider keeps its options' established meaning: OpenAI and Grok options
 * name the v1 root, Ollama and LM Studio name the host the server listens on,
 * and the Gemini option names the host under /v1beta.
 *
 * @param {string} provider
 * @param {object} [options] { apiKey?, model?, baseUrl?, temperature?, enableTemperature? }
 * @returns {LLMProvider}
 */
export function createLLM(provider = LLM_PROVIDERS.GEMINI, options = {}) {
  const p = (provider || "").toString().toLowerCase();

  const apiKey = options?.apiKey || "";
  const model = () => requireModel(options?.model);

  // Gemini names its models "models/<id>" and marks what each can do; only
  // ones that can answer a chat request belong in the picker.
  const listGeminiModels = async () => {
    const host = trimSlash(options?.baseUrl || "https://generativelanguage.googleapis.com");
    const res = await fetch(`${host}/v1beta/models`, {
      method: "GET",
      headers: apiKey ? { "x-goog-api-key": apiKey } : {},
    });
    if (!res.ok) throw new Error(`Model list failed with status ${res.status}`);
    const data = await res.json();
    return (data?.models || [])
      .filter(
        (m) =>
          !m?.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent")
      )
      .map((m) => String(m?.name || "").replace(/^models\//u, ""))
      .filter(Boolean);
  };

  // The local servers' discovery stays on each server's own endpoint, because
  // that is what answers without an API key.
  const listLocalModels = (host, listPath, readNames) => async () => {
    const res = await fetch(`${trimSlash(host)}${listPath}`, {
      method: "GET",
      headers: listHeaders(apiKey),
    });
    if (!res.ok) throw new Error(`Model list failed with status ${res.status}`);
    return readNames(await res.json()).filter(Boolean);
  };

  const listRemoteModels = (base) => () =>
    listOpenAICompatibleModels(`${trimSlash(base)}/models`, apiKey);

  const generateWith = (buildModel) => async (prompt, signal) => {
    const vendor = await loadVendor();
    const result = await runGeneration(vendor, {
      model: buildModel(vendor, model()),
      prompt,
      signal,
      temperature: options?.temperature,
      enableTemperature: options?.enableTemperature,
    });
    return result.text;
  };

  const generatePlanWith = (buildModel) => async (prompt, signal) => {
    const vendor = await loadVendor();
    const result = await runGeneration(vendor, {
      model: buildModel(vendor, model()),
      prompt,
      signal,
      temperature: options?.temperature,
      enableTemperature: options?.enableTemperature,
      output: vendor.Output.object({
        schema: vendor.jsonSchema(PLAN_JSON_SCHEMA),
        name: "AgentPlan",
        description: "The ordered action steps the application should take.",
      }),
    });
    return result.output;
  };

  switch (p) {
    case LLM_PROVIDERS.OPENAI: {
      const base = trimSlash(options?.baseUrl || "https://api.openai.com/v1");
      const buildModel = (vendor, id) =>
        vendor.createOpenAI({ ...(apiKey ? { apiKey } : {}), baseURL: base })(id);
      return {
        name: p,
        generate: generateWith(buildModel),
        generatePlan: generatePlanWith(buildModel),
        listModels: listRemoteModels(base),
      };
    }
    case LLM_PROVIDERS.GROK: {
      const base = trimSlash(options?.baseUrl || "https://api.x.ai/v1");
      const buildModel = (vendor, id) =>
        vendor.createXai({ ...(apiKey ? { apiKey } : {}), baseURL: base })(id);
      return {
        name: p,
        generate: generateWith(buildModel),
        generatePlan: generatePlanWith(buildModel),
        listModels: listRemoteModels(base),
      };
    }
    case LLM_PROVIDERS.OLLAMA: {
      const host = trimSlash(options?.baseUrl || "http://localhost:11434");
      // The local servers take the OpenAI-compatible chat path for generation,
      // which is what carries structured output.
      const buildModel = (vendor, id) =>
        vendor.createOpenAICompatible({
          name: p,
          baseURL: `${host}/v1`,
          ...(apiKey ? { apiKey } : {}),
        })(id);
      return {
        name: p,
        generate: generateWith(buildModel),
        generatePlan: generatePlanWith(buildModel),
        listModels: listLocalModels(host, "/api/tags", (data) =>
          (data?.models || []).map((m) => m?.model || m?.name)
        ),
      };
    }
    case LLM_PROVIDERS.LMSTUDIO: {
      const host = trimSlash(options?.baseUrl || "http://localhost:1234");
      const buildModel = (vendor, id) =>
        vendor.createOpenAICompatible({
          name: p,
          baseURL: `${host}/v1`,
          ...(apiKey ? { apiKey } : {}),
        })(id);
      return {
        name: p,
        generate: generateWith(buildModel),
        generatePlan: generatePlanWith(buildModel),
        listModels: listLocalModels(host, "/v1/models", (data) =>
          (data?.data || []).map((m) => m?.id)
        ),
      };
    }
    case LLM_PROVIDERS.GEMINI:
    default: {
      const host = trimSlash(options?.baseUrl || "https://generativelanguage.googleapis.com");
      const buildModel = (vendor, id) =>
        vendor.createGoogleGenerativeAI({
          ...(apiKey ? { apiKey } : {}),
          baseURL: `${host}/v1beta`,
        })(id);
      return {
        name: LLM_PROVIDERS.GEMINI,
        generate: generateWith(buildModel),
        generatePlan: generatePlanWith(buildModel),
        listModels: listGeminiModels,
      };
    }
  }
}
