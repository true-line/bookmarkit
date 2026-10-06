import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import React from "react";
import BrandMark from "./BrandMark.jsx";

const glyph = () => document.querySelector(".ds-brand-glyph");
const canvas = () => document.querySelector(".ds-effects-canvas");

// The lazy scene module with its three.js dependency mocked out: the tests
// here exercise the wrapper's fallbacks, not the rendering.
vi.mock("./sceneRuntime.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createRenderer: vi.fn(),
    prefersReducedMotion: vi.fn(() => false),
    startRenderLoop: vi.fn(() => ({ request: vi.fn(), stop: vi.fn() })),
    disposeScene: vi.fn(),
  };
});

describe("BrandMark", () => {
  it("shows the static glyph when the effects preference is off", async () => {
    const { container } = render(<BrandMark enabled={false} />);

    await waitFor(() => expect(glyph()).toBeTruthy());
    expect(canvas()).toBeNull();
    expect(container.querySelector(".ds-brand-mark")).toBeNull();
    // decorative: never announced, never a pointer target
    expect(glyph().getAttribute("aria-hidden")).toBe("true");
  });

  it("falls back to the glyph when WebGL is unavailable", async () => {
    const { createRenderer } = await import("./sceneRuntime.js");
    createRenderer.mockReturnValue(null);

    render(<BrandMark enabled />);

    await waitFor(() => expect(glyph()).toBeTruthy());
    expect(canvas()).toBeNull();
  });

  it("renders the scene canvas when a renderer exists", async () => {
    const { createRenderer } = await import("./sceneRuntime.js");
    createRenderer.mockReturnValue({ setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() });

    const { container } = render(<BrandMark enabled />);

    await waitFor(() => expect(canvas()).not.toBeNull());
    expect(container.querySelector(".ds-brand-mark").getAttribute("aria-hidden")).toBe("true");
    expect(glyph()).toBeNull();
  });

  it("passes reduced motion through to the render loop", async () => {
    const { createRenderer, prefersReducedMotion, startRenderLoop } =
      await import("./sceneRuntime.js");
    createRenderer.mockReturnValue({ setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() });
    prefersReducedMotion.mockReturnValue(true);

    render(<BrandMark enabled />);

    await waitFor(() => expect(startRenderLoop).toHaveBeenCalled());
    const options = startRenderLoop.mock.calls.at(-1)[0];
    expect(options.reducedMotion).toBe(true);
    // one static frame is the loop's own tested behavior
    expect(typeof options.frame).toBe("function");
  });

  it("stops the loop and frees the scene on unmount", async () => {
    const { createRenderer, startRenderLoop, disposeScene } = await import("./sceneRuntime.js");
    createRenderer.mockReturnValue({ setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() });
    const stop = vi.fn();
    startRenderLoop.mockReturnValue({ request: vi.fn(), stop });

    const { unmount } = render(<BrandMark enabled />);
    await waitFor(() => expect(startRenderLoop).toHaveBeenCalled());

    unmount();
    expect(stop).toHaveBeenCalled();
    expect(disposeScene).toHaveBeenCalled();
  });
});
