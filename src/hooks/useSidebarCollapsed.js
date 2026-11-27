import { useCallback, useState } from "react";

// #346: whether the navigation rail sits collapsed to its mini rail is a
// display preference, not bookmark data — the same shape as the list's view
// mode (#198): localStorage-backed, read synchronously so the first paint is
// already in the chosen width, written on change, and silently non-persistent
// when storage is unavailable. Only the rail folds; the drawer never does,
// so nothing here knows about the viewport — BookmarkApp applies the flag
// where the rail is (useSidebarViewport's half of the story).

export const SIDEBAR_COLLAPSED_KEY = "bm_sidebar_collapsed";

/** The persisted preference. Defaults to expanded, so existing users keep
 *  the #283 rail until they fold it themselves. */
export function sidebarCollapsedPref() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function setSidebarCollapsedPref(collapsed) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "true" : "false");
  } catch {
    /* storage unavailable — the setting simply does not persist */
  }
}

/** Whether the rail is collapsed, and the toggle that flips and persists it. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(sidebarCollapsedPref);
  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      setSidebarCollapsedPref(next);
      return next;
    });
  }, []);
  return [collapsed, toggle];
}
