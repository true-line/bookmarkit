import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// The unified design system loads once, app-wide (#240): tokens first, then
// the component classes built on them. Nothing renders ui-* classes until a
// surface migrates, and useTheme stamps data-ui-theme on the root.
import "./design-system/tokens.css";
import "./design-system/components.css";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
