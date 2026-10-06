import { afterEach, describe, expect, it, vi } from "vitest";
import { EFFECTS_ENABLED_KEY, effectsEnabled, setEffectsEnabled } from "./effects.js";

afterEach(() => {
  localStorage.clear();
});

describe("effects preference", () => {
  it("is on by default when nothing was persisted", () => {
    expect(localStorage.getItem(EFFECTS_ENABLED_KEY)).toBeNull();
    expect(effectsEnabled()).toBe(true);
  });

  it("persists an opt-out and reads it back", () => {
    setEffectsEnabled(false);
    expect(localStorage.getItem(EFFECTS_ENABLED_KEY)).toBe("false");
    expect(effectsEnabled()).toBe(false);
  });

  it("reads an explicit opt-in as on", () => {
    localStorage.setItem(EFFECTS_ENABLED_KEY, "true");
    expect(effectsEnabled()).toBe(true);
  });

  it("treats a corrupted value as on", () => {
    localStorage.setItem(EFFECTS_ENABLED_KEY, "yes");
    expect(effectsEnabled()).toBe(true);
  });

  it("survives a storage failure on read and write", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("unavailable");
    });
    expect(effectsEnabled()).toBe(true);
    spy.mockRestore();

    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("unavailable");
    });
    expect(() => setEffectsEnabled(false)).not.toThrow();
    setSpy.mockRestore();
  });
});
