import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// The unified design system loads in the popup too (#245): tokens, then the
// component classes built on them, then the self-hosted OFL fonts the
// --ui-* families name — mirroring the app entry so both surfaces render
// the same recipes at the same type scale.
import "../design-system/tokens.css";
import "../design-system/components.css";
import "@fontsource/red-hat-text/600.css";
import "@fontsource/radio-canada-big/400.css";
import "@fontsource/radio-canada-big/500.css";
import "@fontsource/radio-canada-big/600.css";
import "@fontsource/fira-code/400.css";
import "../index.css";
import QuickAddRoot from "./QuickAddRoot.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QuickAddRoot />
  </StrictMode>
);
