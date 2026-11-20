// #212: Whether BookmarkIt is offering its read-only tools to browser agents,
// and the effect that offers them.
//
// Off by default, like every capability that widens who can read the
// collection (#39 set the precedent for a privacy-shaped default). The toggle
// persists through the same setting helpers the rest of the app uses, so it
// lives in chrome.storage.local under the extension and localStorage on the
// plain web build.
//
// Registration waits for a store that opened cleanly: tools that answer with a
// half-loaded or unreadable list would be tools that lie. While loading, or
// after a load error, the surface is simply absent.

import { useCallback, useEffect, useRef, useState } from "react";
import { readSetting, writeSetting } from "../utils/extensionStorage.js";
import { isWebMcpSupported, registerWebMcpTools } from "../webmcp/registerWebMcpTools.js";

export const WEBMCP_TOOLS_KEY = "bm_webmcp_tools_enabled";

/** Both storage homes stringify; only chrome.storage.local keeps a real boolean. */
const readEnabled = async () => {
  const stored = await readSetting(WEBMCP_TOOLS_KEY);
  return stored === true || stored === "true";
};

/**
 * @param {{ bookmarks?: object[], isLoading?: boolean, loadError?: object|null }} state
 *   The store-facing slice of the host component. `bookmarks` is read at call
 *   time, not captured — a registration made for one list must answer for the
 *   next one too, without re-registering.
 */
export function useWebMcpTools({ bookmarks, isLoading, loadError } = {}) {
  const [enabled, setEnabledState] = useState(false);
  const [available] = useState(() => isWebMcpSupported());
  const listRef = useRef(bookmarks);
  listRef.current = bookmarks;
  // Set the moment the user chooses. A storage read still in flight when they
  // do must not land afterwards and flip their choice back — the read checks
  // this at resolution time, which is the only point the race can happen.
  const touchedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    readEnabled().then((on) => {
      if (!cancelled && !touchedRef.current) setEnabledState(on);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setEnabled = useCallback((value) => {
    const next = Boolean(value);
    touchedRef.current = true;
    setEnabledState(next);
    writeSetting(WEBMCP_TOOLS_KEY, next ? "true" : "false");
  }, []);

  const ready = Boolean(enabled && available && !isLoading && !loadError);

  useEffect(() => {
    if (!ready || !isWebMcpSupported()) return undefined;
    const controller = new AbortController();
    registerWebMcpTools({
      modelContext: document.modelContext,
      getList: () => listRef.current ?? [],
      signal: controller.signal,
    }).catch((error) => {
      console.warn("WebMCP tool registration failed:", error);
    });
    return () => controller.abort();
  }, [ready]);

  return { webMcpEnabled: enabled, setWebMcpEnabled: setEnabled, webMcpAvailable: available };
}
