// UX-07: LLM error classification — maps raw errors to user-friendly messages.
// Error strings are never exposed verbatim; users see actionable guidance instead.
//
// #307: what an error *is* is decided here; what it *says* is the message
// catalogue's. Each rule names a category and a message key, and the sentence
// is resolved when the error is classified, so a caller that only wants the
// category still gets it without any wording.

import { getMessages } from "../i18n/index.js";
import { LLM_PROVIDERS } from "./index.js";

/**
 * @typedef {'api_key' | 'rate_limit' | 'network' | 'parse' | 'local_refused' | 'local_unreachable' | 'no_model' | 'generic'} LLMErrorCategory
 */

// #28: A TypeError only means "network" when it is the one fetch throws. Browsers
// word that differently — "Failed to fetch" (Chrome), "NetworkError when
// attempting to fetch resource." (Firefox), "Load failed" (Safari) — and every
// other TypeError is a programming mistake that must not be dressed up as a
// connectivity problem.
const FETCH_TYPE_ERROR = /failed to fetch|networkerror|network error|load failed/u;

const isNetworkFailure = ({ name, msg }) =>
  (name === "TypeError" && FETCH_TYPE_ERROR.test(msg)) ||
  msg.includes("network") ||
  msg.includes("failed to fetch") ||
  msg.includes("connection") ||
  msg.includes("timeout") ||
  msg.includes("timed out") ||
  msg.includes("cors");

// #197: Ollama and LM Studio run on the user's own machine, where a key is
// optional and usually absent. Their refusals are permission problems at the
// local server — Ollama rejects browser origins not listed in OLLAMA_ORIGINS
// with 403, LM Studio gates requests behind its CORS switch — and their outages
// are about the machine they run on. Neither may be answered with the hosted
// advice to enter a key or check the internet; a key set for a proxied server
// is only worth checking first, not the thing the user must go get.
const LOCAL_PROVIDERS = {
  [LLM_PROVIDERS.OLLAMA]: {
    refusedKey: "llmError.ollamaRefused",
    unreachableKey: "llmError.ollamaUnreachable",
  },
  [LLM_PROVIDERS.LMSTUDIO]: {
    refusedKey: "llmError.lmStudioRefused",
    unreachableKey: "llmError.lmStudioUnreachable",
  },
};

// Ordered most specific first; the first match wins.
const CATEGORY_RULES = [
  {
    // #224: a provider without a chosen model is one decision away from
    // working, and the message must say so rather than read as a failure.
    category: "no_model",
    key: "llmError.noModel",
    matches: ({ msg }) => msg.includes("no model is selected"),
  },
  {
    category: "api_key",
    key: "llmError.apiKey",
    matches: ({ status, msg }) =>
      status === 401 ||
      status === 403 ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden") ||
      msg.includes("api key"),
  },
  {
    category: "rate_limit",
    key: "llmError.rateLimit",
    matches: ({ status, msg }) =>
      status === 429 ||
      msg.includes("rate limit") ||
      msg.includes("too many requests") ||
      msg.includes("quota"),
  },
  {
    category: "network",
    key: "llmError.network",
    matches: isNetworkFailure,
  },
  {
    category: "parse",
    key: "llmError.parse",
    matches: ({ msg }) =>
      msg.includes("json") ||
      msg.includes("parse") ||
      msg.includes("interpret") ||
      msg.includes("unexpected token"),
  },
];

const GENERIC = { category: "generic", key: "llmError.generic" };

/**
 * Classify a fetch/LLM error into a category and return a user-friendly message.
 *
 * The provider is optional. Without it the hosted-provider reading applies; with
 * a keyless local provider (Ollama, LM Studio) a refusal or outage keeps its own
 * category (`local_refused` / `local_unreachable`) but says what actually went
 * wrong at the local server, because there is no key for the hosted advice to
 * point at (#197).
 *
 * @param {Error} error
 * @param {string} [provider]
 * @param {Function} [t] The translator to read the message with; the one in
 *   effect outside a component unless a caller has its own.
 * @returns {{ category: LLMErrorCategory, message: string }}
 */
export function classifyLLMError(error, provider, t = getMessages()) {
  const msg = (error?.message || "").toLowerCase();
  const name = error?.name;
  // The AI SDK's APICallError reports `statusCode`; the hand-rolled adapters
  // threw plain Errors with `status`. Either is honored here.
  const status = error?.status || error?.statusCode || extractHttpStatus(msg);
  const local = LOCAL_PROVIDERS[String(provider ?? "").toLowerCase()];

  if (local) {
    if (status === 401 || status === 403) {
      return { category: "local_refused", message: t(local.refusedKey, { status }) };
    }
    if (isNetworkFailure({ name, msg })) {
      // Its own category rather than `network`: a local outage repeats for every
      // request until the server is back, where a hosted provider's network
      // error may pass on a retry — callers reason about fatality off this.
      return { category: "local_unreachable", message: t(local.unreachableKey) };
    }
  }

  const subject = { msg, name, status };
  const rule = CATEGORY_RULES.find((candidate) => candidate.matches(subject)) || GENERIC;
  return { category: rule.category, message: t(rule.key) };
}

function extractHttpStatus(msg) {
  const m = msg.match(/\b(4\d\d|5\d\d)\b/);
  return m ? parseInt(m[1], 10) : null;
}
