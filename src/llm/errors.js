// UX-07: LLM error classification — maps raw errors to user-friendly messages.
// Error strings are never exposed verbatim; users see actionable guidance instead.

import { LLM_PROVIDERS } from "./index.js";

/**
 * @typedef {'api_key' | 'rate_limit' | 'network' | 'parse' | 'local_refused' | 'local_unreachable' | 'generic'} LLMErrorCategory
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

// #197: Ollama and LM Studio run on the user's own machine, where no API key
// field exists in Options and nothing for one to authenticate. Their refusals are
// permission problems at the local server — Ollama rejects browser origins not
// listed in OLLAMA_ORIGINS with 403, LM Studio gates requests behind its CORS
// switch — and their outages are about the machine they run on. Neither may be
// answered with the hosted advice to enter a key or check the internet.
const LOCAL_PROVIDERS = {
  [LLM_PROVIDERS.OLLAMA]: {
    refused:
      "Ollama refused the request (HTTP {status}). No API key is needed — make sure Ollama is running and that it allows this app's origin: set OLLAMA_ORIGINS (e.g. chrome-extension://*) and restart Ollama.",
    unreachable:
      "Could not reach Ollama. Make sure it is running locally and that the server address in Options matches it.",
  },
  [LLM_PROVIDERS.LMSTUDIO]: {
    refused:
      'LM Studio refused the request (HTTP {status}). No API key is needed — make sure its local server is running with "Enable CORS" turned on in its Developer settings.',
    unreachable:
      "Could not reach LM Studio. Make sure its local server is running and that the server address in Options matches it.",
  },
};

// Ordered most specific first; the first match wins.
const CATEGORY_RULES = [
  {
    category: "api_key",
    message:
      'API key is missing or invalid. Open Options (type "options" in the search bar) to enter your API key.',
    matches: ({ status, msg }) =>
      status === 401 ||
      status === 403 ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden") ||
      msg.includes("api key"),
  },
  {
    category: "rate_limit",
    message: "Rate limit reached. Please wait a moment before trying again.",
    matches: ({ status, msg }) =>
      status === 429 ||
      msg.includes("rate limit") ||
      msg.includes("too many requests") ||
      msg.includes("quota"),
  },
  {
    category: "network",
    message:
      "Could not reach the LLM provider. Check your internet connection and provider settings.",
    matches: isNetworkFailure,
  },
  {
    category: "parse",
    message: "The AI returned an unexpected response. Try rephrasing your query.",
    matches: ({ msg }) =>
      msg.includes("json") ||
      msg.includes("parse") ||
      msg.includes("interpret") ||
      msg.includes("unexpected token"),
  },
];

const GENERIC = {
  category: "generic",
  message: "Could not process your request. Check your LLM provider settings and try again.",
};

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
 * @returns {{ category: LLMErrorCategory, message: string }}
 */
export function classifyLLMError(error, provider) {
  const msg = (error?.message || "").toLowerCase();
  const name = error?.name;
  const status = error?.status || extractHttpStatus(msg);
  const local = LOCAL_PROVIDERS[String(provider ?? "").toLowerCase()];

  if (local) {
    if (status === 401 || status === 403) {
      return {
        category: "local_refused",
        message: local.refused.replace("{status}", String(status)),
      };
    }
    if (isNetworkFailure({ name, msg })) {
      // Its own category rather than `network`: a local outage repeats for every
      // request until the server is back, where a hosted provider's network
      // error may pass on a retry — callers reason about fatality off this.
      return { category: "local_unreachable", message: local.unreachable };
    }
  }

  const subject = { msg, name, status };
  const rule = CATEGORY_RULES.find((candidate) => candidate.matches(subject)) || GENERIC;
  return { category: rule.category, message: rule.message };
}

function extractHttpStatus(msg) {
  const m = msg.match(/\b(4\d\d|5\d\d)\b/);
  return m ? parseInt(m[1], 10) : null;
}
