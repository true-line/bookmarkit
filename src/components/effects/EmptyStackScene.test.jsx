import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import EmptyStackScene from "./EmptyStackScene.jsx";
import { buildStackScene } from "./stackScene.js";
import { watchCssVariable } from "./sceneRuntime.js";

// sceneRuntime is mocked so these tests drive the scene's own behavior — the
// render loop and the watcher have their own contract tests. three itself is
// real: constructing geometries and materials needs no WebGL.

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

const accentWatchCallback = () => vi.mocked(watchCssVariable).mock.calls.at(-1)?.[1];

describe("buildStackScene", () => {
  it("builds the camera with the canvas's aspect ratio", () => {
    const { camera } = buildStackScene("#c62f35", 260 / 150);
    expect(camera.aspect).toBeCloseTo(260 / 150, 5);
  });

  it("uses the theme accent for the front card", () => {
    const { frontMaterial } = buildStackScene("#0a6b8f", 260 / 150);
    expect(frontMaterial.color.getHexString()).toBe("0a6b8f");
  });
});

describe("EmptyStackScene", () => {
  beforeEach(() => {
    mocks.request.mockClear();
    mocks.render.mockClear();
  });

  it("requests a frame with the retinted front card when the accent changes", async () => {
    render(<EmptyStackScene width={260} height={150} />);
    await waitFor(() => expect(watchCssVariable).toHaveBeenCalled());

    const callback = accentWatchCallback();
    expect(callback).toBeTypeOf("function");

    callback("#0a6b8f");

    expect(mocks.request).toHaveBeenCalled();
  });
});
