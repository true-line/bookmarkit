import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { fetchUrlStatus, normalizeStatusReason } from "./urlStatus.js";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  delete globalThis.chrome;
  vi.unstubAllGlobals();
});

describe("fetchUrlStatus in the extension", () => {
  it("asks the worker, which is the only privileged fetch", async () => {
    const sendMessage = vi.fn((_message, respond) =>
      respond({ status: "valid", redirectUrl: null, reason: null })
    );
    globalThis.chrome = { runtime: { id: "test", sendMessage } };

    await expect(fetchUrlStatus("https://example.com")).resolves.toEqual({
      status: "valid",
      redirectUrl: null,
      reason: null,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("carries the worker's failure detail through (#295)", async () => {
    const sendMessage = vi.fn((_message, respond) =>
      respond({ status: "invalid", redirectUrl: null, reason: "http:404" })
    );
    globalThis.chrome = { runtime: { id: "test", sendMessage } };

    await expect(fetchUrlStatus("https://example.com")).resolves.toEqual({
      status: "invalid",
      redirectUrl: null,
      reason: "http:404",
    });
  });

  it("does not trust an unknown reason shape from the message channel", async () => {
    const sendMessage = vi.fn((_message, respond) =>
      respond({ status: "invalid", redirectUrl: null, reason: { code: 404 } })
    );
    globalThis.chrome = { runtime: { id: "test", sendMessage } };

    await expect(fetchUrlStatus("https://example.com")).resolves.toEqual({
      status: "invalid",
      redirectUrl: null,
      reason: null,
    });
  });

  it("treats a worker that answered nothing as unreachable", async () => {
    globalThis.chrome = {
      runtime: { id: "test", sendMessage: (_m, respond) => respond(undefined) },
    };

    await expect(fetchUrlStatus("https://example.com")).resolves.toEqual({
      status: "invalid",
      redirectUrl: null,
      reason: null,
    });
  });
});

describe("fetchUrlStatus in the web build", () => {
  it("reports a URL that answers", async () => {
    globalThis.fetch.mockResolvedValue({ ok: true, type: "basic" });

    await expect(fetchUrlStatus("https://example.com")).resolves.toEqual({
      status: "valid",
      redirectUrl: null,
      reason: null,
    });
  });

  // #10: the request leaves the browser even when the response is unreadable, so a
  // public URL answering 30x with an internal Location must not be followed here
  // either. The answer is "reachable, target not disclosed", as in the worker.
  it("does not follow a redirect, and does not hand its target back", async () => {
    globalThis.fetch.mockResolvedValue({
      type: "opaqueredirect",
      ok: false,
      url: "http://127.0.0.1/",
    });

    await expect(fetchUrlStatus("https://example.com")).resolves.toEqual({
      status: "valid",
      redirectUrl: null,
      reason: null,
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ redirect: "manual", method: "HEAD" })
    );
  });

  // #295: the failure detail is the check's own reading — the status code when
  // the host answered, the timeout when the probe gave up, and one honest name
  // for every refusal the network offered.
  it("says why a URL that answered badly did", async () => {
    globalThis.fetch.mockResolvedValue({ ok: false, status: 404, type: "basic" });

    await expect(fetchUrlStatus("https://example.com")).resolves.toEqual({
      status: "invalid",
      redirectUrl: null,
      reason: "http:404",
    });
  });

  it("tells a timeout from the rest of what the network can refuse", async () => {
    globalThis.fetch.mockRejectedValueOnce(
      Object.assign(new Error("slow"), { name: "AbortError" })
    );
    await expect(fetchUrlStatus("https://example.com")).resolves.toEqual({
      status: "invalid",
      redirectUrl: null,
      reason: "timeout",
    });

    globalThis.fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(fetchUrlStatus("https://example.com")).resolves.toEqual({
      status: "invalid",
      redirectUrl: null,
      reason: "unreachable",
    });
  });

  it("reports a URL that does not answer", async () => {
    globalThis.fetch.mockRejectedValue(new Error("network"));

    await expect(fetchUrlStatus("https://example.com")).resolves.toEqual({
      status: "invalid",
      redirectUrl: null,
      reason: "unreachable",
    });
  });
});

describe("what fetchUrlStatus refuses to ask about at all", () => {
  it("never fetches an internal host or an unsupported scheme", async () => {
    for (const url of [
      "http://127.0.0.1:8080/admin",
      "http://169.254.169.254/latest/meta-data",
      "http://localhost/",
      "javascript:alert(1)",
      "file:///etc/passwd",
    ]) {
      await expect(fetchUrlStatus(url)).resolves.toEqual({
        status: "invalid",
        redirectUrl: null,
        reason: null,
      });
    }

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("says nothing about an empty URL", async () => {
    await expect(fetchUrlStatus("")).resolves.toEqual({
      status: "idle",
      redirectUrl: null,
      reason: null,
    });
  });
});

describe("normalizeStatusReason", () => {
  it("keeps the three shapes a check can honestly distinguish", () => {
    expect(normalizeStatusReason("timeout")).toBe("timeout");
    expect(normalizeStatusReason("unreachable")).toBe("unreachable");
    expect(normalizeStatusReason("http:404")).toBe("http:404");
    expect(normalizeStatusReason("http:503")).toBe("http:503");
  });

  it("reads anything else as no detail at all", () => {
    expect(normalizeStatusReason(null)).toBeNull();
    expect(normalizeStatusReason(undefined)).toBeNull();
    expect(normalizeStatusReason("")).toBeNull();
    expect(normalizeStatusReason("http:ab")).toBeNull();
    expect(normalizeStatusReason("HTTP:404")).toBeNull();
    expect(normalizeStatusReason({ code: 404 })).toBeNull();
  });
});
