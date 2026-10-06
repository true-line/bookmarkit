// Runtime shared by the lazy 3D scenes. This module imports three, so it may
// only be imported by the lazily-loaded scene components — never by the
// statically loaded wrappers, which is what keeps three out of the initial
// main chunk and out of the popup entirely.
//
// Every scene follows the same contract: one renderer per surface, rendered on
// demand; a single static frame under prefers-reduced-motion; paused while the
// document is hidden or the element is offscreen; everything disposed on stop.

import * as THREE from "three";

/** devicePixelRatio is capped so a hi-dpi screen does not quadruple the fill. */
export const MAX_PIXEL_RATIO = 2;

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** A WebGL renderer for the canvas, or null when WebGL is unavailable. */
export function createRenderer(canvas) {
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    return renderer;
  } catch {
    return null;
  }
}

/**
 * Renders on demand. Each scheduled frame calls `frame(now)` (seconds); when it
 * returns true another frame is scheduled, and when it returns false the loop
 * settles — no frames run until `request()` is called again (a pointer move, a
 * hover, a return to visibility). Nothing is scheduled while the document is
 * hidden or, when IntersectionObserver is available, while `element` is
 * offscreen. With reduced motion exactly one frame is rendered synchronously
 * and nothing is ever scheduled.
 *
 * @returns {{ request: () => void, stop: () => void }} stop cancels everything.
 */
export function startRenderLoop({
  renderer,
  frame,
  reducedMotion = false,
  element = null,
  schedule = (callback) => window.requestAnimationFrame(callback),
  cancel = (id) => window.cancelAnimationFrame(id),
}) {
  if (reducedMotion) {
    frame(0);
    return { request: () => {}, stop: () => {} };
  }

  let scheduledId = null;
  let stopped = false;
  let inViewport = true;
  let hidden = typeof document !== "undefined" && document.hidden;

  const canRun = () => !stopped && !hidden && inViewport;

  const tick = (now) => {
    scheduledId = null;
    if (stopped || !frame(now)) return;
    if (canRun()) scheduledId = schedule(tick);
  };

  const request = () => {
    if (scheduledId === null && canRun()) scheduledId = schedule(tick);
  };

  const onVisibilityChange = () => {
    hidden = document.hidden;
    // One frame on the way back in; the scene settles again on its own.
    if (!hidden) request();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  const observer =
    typeof IntersectionObserver === "function" && element
      ? new IntersectionObserver(
          (entries) => {
            inViewport = entries[entries.length - 1]?.isIntersecting !== false;
            if (inViewport) request();
          },
          { threshold: 0 }
        )
      : null;
  observer?.observe(element);

  const stop = () => {
    stopped = true;
    if (scheduledId !== null) cancel(scheduledId);
    scheduledId = null;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    observer?.disconnect();
    renderer?.dispose();
  };

  request();
  return { request, stop };
}

/** Frees every geometry and material in the scene, then the scene graph. */
export function disposeScene(scene) {
  scene.traverse((node) => {
    node.geometry?.dispose();
    const materials = Array.isArray(node.material)
      ? node.material
      : node.material
        ? [node.material]
        : [];
    for (const material of materials) material.dispose();
  });
  scene.clear();
}
