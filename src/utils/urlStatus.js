// The one way this app asks whether a URL still answers.
//
// In the extension the question goes to the service worker, which fetches from a
// privileged context that CORS does not apply to and which enforces the SSRF
// boundary (#10): public http(s) only, `redirect: "manual"`, and a redirect
// target it will not disclose. In the web build there is no worker, so the fetch
// happens here and CORS decides what is answerable.
//
// #47: extracted from BookmarkApp so the sweep and the select-time check ask the
// same question the same way, instead of two implementations drifting apart.
//
// The boundary is the same on both paths, not just the worker's: only public
// http(s) hosts are asked about, and a redirect is never followed. In the web
// build the fetch is not privileged, but the request still leaves the browser,
// so a public URL answering 30x with a private Location would otherwise reach an
// internal host before anything could look at it.

import { isPublicHttpUrl } from "./url.js";

const UNREACHABLE = { status: "invalid", redirectUrl: null, reason: null };

/**
 * #295: why an invalid answer was invalid, as the sweep stores it.
 *
 * Only the three shapes a check can honestly distinguish survive: the host
 * answered with an error status ("http:404"), the probe gave up ("timeout"), or
 * the network refused the attempt ("unreachable" — a DNS failure and a refused
 * connection surface as the same TypeError). Anything else — an older worker's
 * answer, a hand-crafted message — reads as "no detail", which is what the chip
 * says.
 *
 * @param {unknown} reason
 * @returns {string|null}
 */
export const normalizeStatusReason = (reason) => {
  if (reason === "timeout" || reason === "unreachable") return reason;
  if (typeof reason === "string" && /^http:\d{3}$/.test(reason)) return reason;
  return null;
};

/**
 * @param {string} url
 * @returns {Promise<{status: "idle"|"valid"|"invalid", redirectUrl: string|null, reason: string|null}>}
 */
export function fetchUrlStatus(url) {
  if (!url) return Promise.resolve({ status: "idle", redirectUrl: null, reason: null });
  if (!isPublicHttpUrl(url)) return Promise.resolve({ ...UNREACHABLE });

  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "CHECK_URL", url }, (result) => {
        resolve(
          result ? { ...result, reason: normalizeStatusReason(result.reason) } : { ...UNREACHABLE }
        );
      });
    });
  }

  return fetch(url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(5000) })
    .then((res) => {
      // A redirect is "reachable, but we do not chase or expose the target" —
      // the same answer the worker gives, for the same reason.
      if (res.type === "opaqueredirect")
        return { status: "valid", redirectUrl: null, reason: null };
      if (res.ok) return { status: "valid", redirectUrl: null, reason: null };
      return { status: "invalid", redirectUrl: null, reason: `http:${res.status}` };
    })
    .catch((error) => ({
      ...UNREACHABLE,
      // Same reading as the worker's: AbortSignal.timeout() rejects with
      // TimeoutError, and some engines surfaced that expiry as AbortError.
      reason:
        error?.name === "TimeoutError" || error?.name === "AbortError" ? "timeout" : "unreachable",
    }));
}
