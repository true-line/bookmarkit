import React from "react";
import "../src/index.css";
// Unified UI design system (#238): tokens and component styles, loaded once
// here. The rules are inert outside a [data-ui-theme] root — design-system
// stories render under one via the shared UiScope decorator; app stories are
// untouched and keep their own canvas and variables.
import "../src/design-system/tokens.css";
import "../src/design-system/components.css";
// Self-hosted OFL fonts for the unified type scale: Red Hat Text headings,
// Radio Canada Big body/UI, Fira Code URLs and chips. Weights are exactly the
// ones the spec's scale uses.
import "@fontsource/red-hat-text/600.css";
import "@fontsource/radio-canada-big/400.css";
import "@fontsource/radio-canada-big/500.css";
import "@fontsource/radio-canada-big/600.css";
import "@fontsource/fira-code/400.css";

const preview = {
  globalTypes: {
    uiTheme: {
      name: "UI theme",
      description: "Unified design system color scheme",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
    direction: {
      name: "Direction",
      description: "Reading direction (RTL readiness)",
      toolbar: {
        icon: "transfer",
        items: [
          { value: "ltr", title: "Left-to-right" },
          { value: "rtl", title: "Right-to-left" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { uiTheme: "light", direction: "ltr" },
  decorators: [
    (_Story) => (
      <div
        style={{
          minHeight: "100vh",
          padding: "1.5rem",
          color: "var(--text-primary)",
          background: "var(--bg-secondary)",
        }}
      >
        <_Story />
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    controls: { expanded: true },
    a11y: { test: "error" },
  },
};

export default preview;
