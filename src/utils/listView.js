// #198: The bookmark list's view mode — one card per row, the responsive flow
// of columns (#193), or the denser grid — is a display preference, not
// bookmark data. This is the same shape as the effects toggle in effects.js:
// localStorage-backed, read synchronously so the first render is already
// correct, written on change, and silently non-persistent when storage is
// unavailable.

export const VIEW_MODE_KEY = "bm_list_view";
export const DEFAULT_VIEW_MODE = "flow";
export const VIEW_MODES = ["single", "flow", "grid"];

/** The persisted view mode. Defaults to the responsive flow, so existing
 *  users keep the #193 behavior until they choose otherwise. */
export function listViewMode() {
  try {
    const mode = localStorage.getItem(VIEW_MODE_KEY);
    return VIEW_MODES.includes(mode) ? mode : DEFAULT_VIEW_MODE;
  } catch {
    return DEFAULT_VIEW_MODE;
  }
}

/** Persist the view mode. Unknown values are ignored, so a typo or a stale
 *  key can never put the list in a mode the layout math does not know. */
export function setListViewMode(mode) {
  if (!VIEW_MODES.includes(mode)) return;
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    /* storage unavailable — the setting simply does not persist */
  }
}
