import React, { Suspense, lazy } from "react";

// The header brand mark. Static by default and animated only when the user has
// kept the effects preference on: the three.js scene is a lazy import, so it
// costs the main chunk nothing until it is actually wanted. Every failure mode
// — WebGL unavailable, the scene failing to load, effects turned off — lands
// on the same SVG glyph, so the header never loses its mark.

const BrandMarkScene = lazy(() => import("./BrandMarkScene.jsx"));
import BrandMarkGlyph from "./BrandMarkGlyph.jsx";

export default function BrandMark({ enabled = true, size = 44 }) {
  if (!enabled) return <BrandMarkGlyph size={size} />;

  return (
    <div className="ds-brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <Suspense fallback={<BrandMarkGlyph size={size} />}>
        <BrandMarkScene size={size} />
      </Suspense>
    </div>
  );
}
