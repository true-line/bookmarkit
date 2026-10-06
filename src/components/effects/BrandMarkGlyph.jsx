import React from "react";

// The static bookmark ribbon — the fallback for the 3D brand mark whenever the
// effects are off, WebGL is unavailable, or motion is reduced. Decorative by
// contract: never announced, never focusable, never a pointer target.
export default function BrandMarkGlyph({ size = 44, className = "ds-brand-glyph" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Navy copy behind the ribbon: the depth the 3D mark renders live. */}
      <path d="M14 4h28v39.4L27.5 33.4 14 43.4z" fill="#1d2b53" />
      <path d="M6 4h28v39.4L19.5 33.4 6 43.4z" fill="var(--accent, #c62f35)" />
    </svg>
  );
}
