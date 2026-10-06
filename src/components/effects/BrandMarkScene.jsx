import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  createRenderer,
  disposeScene,
  prefersReducedMotion,
  startRenderLoop,
  watchCssVariable,
} from "./sceneRuntime.js";
import BrandMarkGlyph from "./BrandMarkGlyph.jsx";

// The dimensional brand mark: a slowly settling bookmark ribbon that tilts
// toward the pointer, in the theme's accent with a navy rim. Loaded lazily so
// three never reaches the initial bundle. Any WebGL failure falls back to the
// static glyph, so this component always renders *something*.

const REST = { x: 0.16, y: -0.45 };
const IDLE_AMPLITUDE = 0.24;
const IDLE_DECAY = 0.5;
const SETTLE_EPSILON = 0.01;
const HOVER_MARGIN = 24;
const DEFAULT_ACCENT = "#c62f35";

function accentColor() {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return value || DEFAULT_ACCENT;
}

function buildMarkScene(accent) {
  const scene = new THREE.Scene();

  const shape = new THREE.Shape();
  shape.moveTo(-1.1, -1.6);
  shape.lineTo(-1.1, 1.6);
  shape.lineTo(1.1, 1.6);
  shape.lineTo(1.1, -1.6);
  shape.lineTo(0, -0.75);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  geometry.center();

  const materials = [
    new THREE.MeshStandardMaterial({ color: accent, roughness: 0.35, metalness: 0.15 }),
    new THREE.MeshStandardMaterial({ color: 0x1d2b53, roughness: 0.5, metalness: 0.1 }),
  ];
  const mesh = new THREE.Mesh(geometry, materials);
  scene.add(mesh);

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2.5, 3, 4);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-3, -1, 2);
  scene.add(new THREE.AmbientLight(0xffffff, 0.9), key, fill);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 7.5);
  return { scene, camera, mesh };
}

export default function BrandMarkScene({ size = 44 }) {
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
    renderer.setSize(size, size, false);

    const { scene, camera, mesh } = buildMarkScene(accentColor());
    const reducedMotion = prefersReducedMotion();

    let elapsed = 0;
    let last = null;
    let hovering = false;
    const rot = { x: REST.x + 0.5, y: REST.y - 2.6 };
    let target = { ...REST };

    const step = (dt) => {
      elapsed += dt;
      const idle = IDLE_AMPLITUDE * Math.exp(-elapsed * IDLE_DECAY);
      if (!hovering) {
        target = {
          x: REST.x + Math.sin(elapsed * 1.2) * 0.25 * idle,
          y: REST.y + Math.sin(elapsed * 1.7) * idle,
        };
      }
      const k = Math.min(1, dt * (hovering ? 12 : 4.5));
      rot.x += (target.x - rot.x) * k;
      rot.y += (target.y - rot.y) * k;
      mesh.rotation.set(rot.x, rot.y, 0);

      // The hovered pose settles too: a pointer parked near the mark does not
      // keep WebGL rendering. The pointermove handler requests a frame again
      // whenever a new position gives the mark something to move toward.
      const settled =
        (hovering || idle < SETTLE_EPSILON) &&
        Math.abs(target.x - rot.x) < SETTLE_EPSILON &&
        Math.abs(target.y - rot.y) < SETTLE_EPSILON;
      return !settled;
    };

    const frame = (now) => {
      const dt = last === null ? 0 : Math.min(0.05, now - last);
      last = now;
      let active = true;
      if (reducedMotion) {
        mesh.rotation.set(REST.x, REST.y, 0);
        active = false;
      } else {
        active = step(dt);
      }
      renderer.render(scene, camera);
      return active;
    };

    const onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      hovering =
        Math.abs(dx) <= rect.width / 2 + HOVER_MARGIN &&
        Math.abs(dy) <= rect.height / 2 + HOVER_MARGIN;
      if (hovering) {
        const nx = Math.max(-1, Math.min(1, dx / (rect.width / 2)));
        const ny = Math.max(-1, Math.min(1, dy / (rect.height / 2)));
        target = { x: REST.x + ny * 0.55, y: REST.y + nx * 1.1 };
      }
      loop.request();
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const loop = startRenderLoop({ renderer, frame, reducedMotion, element: canvas });

    // Theme switches write new CSS custom properties on the root; retint the
    // accent material in place instead of rebuilding the scene.
    const stopWatchingAccent = watchCssVariable("--accent", (value) => {
      mesh.material[0].color.set(value || DEFAULT_ACCENT);
      if (reducedMotion) renderer.render(scene, camera);
      else loop.request();
    });

    return () => {
      stopWatchingAccent();
      window.removeEventListener("pointermove", onPointerMove);
      loop.stop();
      disposeScene(scene);
    };
  }, [size]);

  if (failed) return <BrandMarkGlyph size={size} />;
  return <canvas ref={canvasRef} className="ds-effects-canvas" width={size} height={size} />;
}
