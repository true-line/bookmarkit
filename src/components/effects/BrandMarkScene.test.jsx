import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import BrandMarkScene from "./BrandMarkScene.jsx";
import { prefersReducedMotion, startRenderLoop, watchCssVariable } from "./sceneRuntime.js";

// sceneRuntime is mocked so these tests drive the mark's own state machine:
// the hovered pose must settle (not render forever), and a theme switch must
// retint the ribbon. three itself is real — no WebGL is touched.

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  render: vi.fn(),
}));

vi.mock("./sceneRuntime.js", () => ({
  createRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    render: mocks.render,
    dispose: vi.fn(),
  })),
  prefersReducedMotion: vi.fn(() => false),
  startRenderLoop: vi.fn(() => ({ request: mocks.request, stop: vi.fn() })),
  disposeScene: vi.fn(),
  watchCssVariable: vi.fn(() => () => {}),
}));

const sceneFrame = () => vi.mocked(startRenderLoop).mock.calls.at(-1)?.[0].frame;
const accentWatchCallback = () => vi.mocked(watchCssVariable).mock.calls.at(-1)?.[1];

describe("BrandMarkScene", () => {
  beforeEach(() => {
    mocks.request.mockClear();
    mocks.render.mockClear();
    vi.mocked(prefersReducedMotion).mockReturnValue(false);
  });

  it("lets the hovered pose settle instead of rendering forever", async () => {
    render(<BrandMarkScene size={44} />);
    await waitFor(() => expect(startRenderLoop).toHaveBeenCalled());
    const frame = sceneFrame();

    // a pointer parked inside the hover margin: hovering turns on, then the
    // mark tilts toward it and must reach its pose and stop.
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 3, clientY: 3 }));

    let settled = false;
    let now = 0;
    for (let i = 0; i < 120 && !settled; i += 1) {
      now += 0.016;
      settled = frame(now) === false;
    }
    expect(settled).toBe(true);
  });

  it("requests a frame with the retinted ribbon when the accent changes", async () => {
    render(<BrandMarkScene size={44} />);
    await waitFor(() => expect(watchCssVariable).toHaveBeenCalled());

    accentWatchCallback()("#0a6b8f");

    expect(mocks.request).toHaveBeenCalled();
  });

  it("repaints directly under reduced motion when the accent changes", async () => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true);
    render(<BrandMarkScene size={44} />);
    await waitFor(() => expect(startRenderLoop).toHaveBeenCalled());

    const renders = mocks.render.mock.calls.length;
    accentWatchCallback()("#0a6b8f");

    expect(mocks.render.mock.calls.length).toBe(renders + 1);
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
