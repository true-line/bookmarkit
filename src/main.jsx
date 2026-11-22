import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// The unified design system loads once, app-wide (#240): tokens first, then
// the component classes built on them, then the self-hosted OFL fonts the
// --ui-font-* families name (Codex P2 on #262: #242 migrates the first
// surface, so the type scale ships to the production entry too).
import "./design-system/tokens.css";
import "./design-system/components.css";
import "@fontsource/red-hat-text/600.css";
import "@fontsource/radio-canada-big/400.css";
import "@fontsource/radio-canada-big/500.css";
import "@fontsource/radio-canada-big/600.css";
import "@fontsource/fira-code/400.css";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
