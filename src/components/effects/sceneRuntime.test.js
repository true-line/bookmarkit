import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { startRenderLoop, watchCssVariable } from "./sceneRuntime.js";

// The loop's contract, in isolation from three.js: one static frame under
// reduced motion, on-demand frames that stop when a scene settles, no frames
// while the document is hidden, and browser timestamps handed to scenes as
// seconds.

const manualClock = () => {
  const pending = [];
  const schedule = vi.fn((callback) => pending.push(callback) && pending.length);
  const cancel = vi.fn(() => pending.pop());
  const run = (now = 0) => pending.shift()?.(now);
  return { schedule, cancel, run, pendingCount: () => pending.length };
};

const fakeRenderer = () => ({ render: vi.fn(), dispose: vi.fn() });

describe("startRenderLoop", () => {
  it("renders exactly one frame under reduced motion and never schedules", () => {
    const { schedule, pendingCount } = manualClock();
    const frame = vi.fn(() => true);

    startRenderLoop({ renderer: fakeRenderer(), frame, reducedMotion: true, schedule });

    expect(frame).toHaveBeenCalledTimes(1);
    expect(schedule).not.toHaveBeenCalled();
    expect(pendingCount()).toBe(0);
  });

  it("disposes the renderer when a reduced-motion loop stops", () => {
    const { schedule } = manualClock();
    const renderer = fakeRenderer();
    const loop = startRenderLoop({
      renderer,
      frame: vi.fn(() => true),
      reducedMotion: true,
      schedule,
    });

    expect(renderer.dispose).not.toHaveBeenCalled();
    loop.stop();
    expect(renderer.dispose).toHaveBeenCalled();
  });

  it("passes requestAnimationFrame milliseconds to frame as seconds", () => {
    const { schedule, run } = manualClock();
    const frame = vi.fn(() => true);
    startRenderLoop({ renderer: fakeRenderer(), frame, schedule, cancel: () => {} });

    run(1000);
    run(1516);

    expect(frame).toHaveBeenNthCalledWith(1, 1);
    expect(frame).toHaveBeenNthCalledWith(2, 1.516);
  });

  it("ignores requests after settling until asked again", () => {
    const { schedule, cancel, run, pendingCount } = manualClock();
    const frame = vi
      .fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    const loop = startRenderLoop({ renderer: fakeRenderer(), frame, schedule, cancel });

    // initial request + one per continuing frame, none after the settled frame
    expect(schedule).toHaveBeenCalledTimes(1);
    run(0);
    expect(schedule).toHaveBeenCalledTimes(2);
    run(16);
    expect(schedule).toHaveBeenCalledTimes(3);
    run(32);
    expect(schedule).toHaveBeenCalledTimes(3);
    expect(frame).toHaveBeenCalledTimes(3);

    // a pointer nudge wakes it up again
    loop.request();
    expect(schedule).toHaveBeenCalledTimes(4);

    loop.stop();
    expect(pendingCount()).toBe(0);
  });

  it("schedules nothing while the document is hidden", () => {
    const { schedule, cancel, run } = manualClock();
    const frame = vi.fn(() => true);
    startRenderLoop({ renderer: fakeRenderer(), frame, schedule, cancel });
    run(0);

    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    const before = schedule.mock.calls.length;
    frame.mockClear();
    frame.mockReturnValueOnce(true);
    run(16);
    // the frame ran but settled-for-now: no follow-up scheduled while hidden
    expect(schedule.mock.calls.length).toBe(before);

    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(schedule.mock.calls.length).toBe(before + 1);
  });

  it("stop cancels a scheduled frame and disposes the renderer", () => {
    const { schedule, cancel } = manualClock();
    const renderer = fakeRenderer();
    const loop = startRenderLoop({ renderer, frame: () => true, schedule, cancel });

    loop.stop();
    expect(cancel).toHaveBeenCalled();
    expect(renderer.dispose).toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledTimes(1);
  });
});

describe("watchCssVariable", () => {
  it("reports only real value changes on the document root", async () => {
    document.documentElement.style.setProperty("--watched-var", "a");
    const onChange = vi.fn();
    const stop = watchCssVariable("--watched-var", onChange);

    // a rewrite of the same value mutates the style attribute but must not fire
    document.documentElement.style.setProperty("--watched-var", "a");
    document.documentElement.style.setProperty("--watched-var", "b");

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith("b");

    stop();
    document.documentElement.style.setProperty("--watched-var", "c");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onChange).toHaveBeenCalledTimes(1);
    document.documentElement.style.removeProperty("--watched-var");
  });
});
