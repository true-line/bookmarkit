// Decorative 3D effects (the header brand mark and the empty-state shelf) are
// on by default and purely optional. This is the same shape as the favicon
// opt-in in favicon.js: a localStorage-backed boolean, read synchronously so a
// component can decide on first render, and written on toggle. No request and
// no bookmark data is involved, so — unlike favicons — there is nothing to
// opt out of beyond the animation itself.

export const EFFECTS_ENABLED_KEY = "bm_effects_enabled";

/** Whether the user has kept the decorative 3D effects on. Default: on. */
export function effectsEnabled() {
  try {
    return localStorage.getItem(EFFECTS_ENABLED_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setEffectsEnabled(enabled) {
  try {
    localStorage.setItem(EFFECTS_ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    /* storage unavailable — the setting simply does not persist */
  }
}
