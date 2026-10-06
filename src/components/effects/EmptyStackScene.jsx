import React, { useEffect, useRef, useState } from "react";
import {
  createRenderer,
  disposeScene,
  prefersReducedMotion,
  startRenderLoop,
  watchCssVariable,
} from "./sceneRuntime.js";
import { buildStackScene, CARDS, CARD_SPREAD } from "./stackScene.js";
import { EmptyStackGlyph } from "./EmptyStack.jsx";

// A shallow stack of bookmark cards that assembles and settles into place,
// behind the empty-state copy. One entrance animation, then the loop stops
// permanently — an empty list that kept animating would be the one surface
// drawing frames while nothing happens.

const STAGGER = 0.12;
const TRAVEL = 0.65;
const DEFAULT_ACCENT = "#c62f35";

// Each card's resting place in the stack, from the back to the red front card.
const restPose = (index) => {
  const center = (CARDS - 1) / 2;
  return {
    x: (index - center) * CARD_SPREAD.x,
    y: (index - center) * CARD_SPREAD.y,
    z: (index - center) * CARD_SPREAD.z,
    rotationZ: (index - center) * 0.055,
  };
};

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export default function EmptyStackScene({ width = 260, height = 150 }) {
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = createRenderer(canvas);
    if (!renderer) {
      setFailed(true);
      return undefined;
    }
    renderer.setSize(width, height, false);

    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() ||
      DEFAULT_ACCENT;
    const { scene, camera, cards, frontMaterial } = buildStackScene(accent, width / height);
    const reducedMotion = prefersReducedMotion();
    const totalDuration = (CARDS - 1) * STAGGER + TRAVEL;

    // Where a card starts, relative to its rest pose: off to the upper right,
    // tilted — the "dealt onto the shelf" entrance.
    const ENTRANCE_OFFSET = { x: 2.4, y: 2.2, z: 1.2, tiltX: -0.3, tiltY: -0.45, tiltZ: 0.5 };

    const place = (card, index, t) => {
      const rest = restPose(index);
      const progress = Math.max(0, Math.min(1, (t - index * STAGGER) / TRAVEL));
      const eased = easeOut(progress);
      const remaining = 1 - eased;
      card.position.set(
        rest.x + remaining * ENTRANCE_OFFSET.x,
        rest.y + remaining * ENTRANCE_OFFSET.y,
        rest.z + remaining * ENTRANCE_OFFSET.z
      );
      card.rotation.set(
        remaining * ENTRANCE_OFFSET.tiltX,
        remaining * ENTRANCE_OFFSET.tiltY,
        rest.rotationZ + remaining * ENTRANCE_OFFSET.tiltZ
      );
      card.material.opacity = eased;
      card.material.transparent = true;
    };

    // requestAnimationFrame timestamps are arbitrary clocks, so the animation
    // runs on time since the first frame.
    let startedAt = null;
    const frame = (now) => {
      if (startedAt === null) startedAt = now;
      const t = reducedMotion ? totalDuration : now - startedAt;
      for (let i = 0; i < cards.length; i += 1) place(cards[i], i, t);
      renderer.render(scene, camera);
      return t < totalDuration;
    };

    const loop = startRenderLoop({ renderer, frame, reducedMotion, element: canvas });

    // Theme switches write new CSS custom properties on the root; retint the
    // front card in place instead of replaying the entrance.
    const stopWatchingAccent = watchCssVariable("--accent", (value) => {
      frontMaterial.color.set(value || DEFAULT_ACCENT);
      if (reducedMotion) renderer.render(scene, camera);
      else loop.request();
    });

    return () => {
      stopWatchingAccent();
      loop.stop();
      disposeScene(scene);
    };
  }, [width, height]);

  if (failed) return <EmptyStackGlyph />;
  return <canvas ref={canvasRef} className="ds-effects-canvas" width={width} height={height} />;
}
