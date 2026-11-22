import React from "react";

// Storybook scope decorator for the unified design system stories (#238).
//
// Applied per design-system meta rather than globally: global decorators
// compose with the app preview's canvas painting inside the scope root, which
// covered the system's own background. With the decorator here, the app
// stories keep their existing canvas untouched and every design-system story
// renders under the same [data-ui-theme] root a migrated surface will use.
// The uiTheme and direction globals come from the toolbar in
// .storybook/preview.jsx.
export function UiScope(Story, context) {
  return (
    <div
      className="ui-root"
      data-ui-theme={context.globals.uiTheme || "light"}
      dir={context.globals.direction || "ltr"}
      // The margin cancels the app preview's 1.5rem padding so the token
      // canvas fills the viewport; the padding restores the inset inside.
      style={{ minHeight: "100vh", margin: "-1.5rem", padding: "1.5rem" }}
    >
      <Story />
    </div>
  );
}
