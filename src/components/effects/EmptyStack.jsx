import React, { Suspense, lazy } from "react";

// The expressive empty state: a small stack of index-card bookmarks that
// assembles once, settles, and stops rendering. Same contract as the header
// brand mark — lazy three.js, static SVG when the effects are off, WebGL
// fails, or the chunk cannot load; a single static frame under reduced motion.

const EmptyStackScene = lazy(() => import("./EmptyStackScene.jsx"));
import SceneFallback from "./SceneFallback.jsx";

export function EmptyStackGlyph({ size = 48 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

export default function EmptyStack({ enabled = true, width = 260, height = 150 }) {
  if (!enabled) return <EmptyStackGlyph />;

  return (
    <div className="ds-empty-stack" style={{ width, height }} aria-hidden="true">
      <SceneFallback fallback={<EmptyStackGlyph />}>
        <Suspense fallback={<EmptyStackGlyph />}>
          <EmptyStackScene width={width} height={height} />
        </Suspense>
      </SceneFallback>
    </div>
  );
}
