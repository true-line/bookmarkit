import * as THREE from "three";

// Builds the empty-shelf scene graph: a stack of index-card bookmarks with the
// theme's accent on the front card. Lives in its own module (not the scene
// component file, which fast refresh requires to export components only) and
// imports three directly, so it stays inside the lazily loaded effects chunk
// and can be exercised by tests without WebGL.

export const CARDS = 5;
export const CARD_SPREAD = { x: 0.14, y: -0.3, z: -0.09 };

export function buildStackScene(accent, aspect) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 50);
  camera.position.set(0, 1.4, 7);
  camera.lookAt(0, 0, 0);

  const geometry = new THREE.BoxGeometry(2.7, 1.75, 0.07);
  const cards = [];
  for (let i = 0; i < CARDS; i += 1) {
    const front = i === CARDS - 1;
    const material = new THREE.MeshStandardMaterial({
      color: front ? accent : i % 2 === 0 ? 0xfdfbf5 : 0xf3ece0,
      roughness: 0.6,
      metalness: 0.05,
    });
    const card = new THREE.Mesh(geometry.clone(), material);
    scene.add(card);
    cards.push(card);
  }

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(2, 3.5, 4);
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(-2.5, -1, 3);
  scene.add(new THREE.AmbientLight(0xffffff, 0.85), key, fill);

  return { scene, camera, cards, frontMaterial: cards[CARDS - 1].material };
}
