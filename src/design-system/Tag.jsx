import React from "react";

// Unified UI design system tag (#238). The manager screens' card chips: 4px
// radius tonal chips at label-sm, laid out with wrap so longer translations
// never clip. Not a sticker-sheet family of its own — the canonical bookmark
// card composition cannot be reproduced without it.
export function Tag({ children, className = "", ...props }) {
  return (
    <span className={`ui-tag ${className}`} {...props}>
      {children}
    </span>
  );
}
