// Unified UI design system (#238, Storybook-first). Public entry point.
//
// This module is additive and not yet imported by any app surface: the
// Storybook preview supplies the theme and direction toolbars, and the shared
// UiScope story decorator (story-decorator.jsx) renders the [data-ui-theme]
// scope root. Migrating a surface means importing tokens.css and
// components.css once (ideally through this entry) and rendering the surface
// under the same attribute the decorator uses.
//
// The existing src/components/DesignSystem.jsx library stays untouched; the
// two systems coexist until a surface switches.

export { Button, IconButton } from "./Button.jsx";
export { Card } from "./Card.jsx";
export { InputField } from "./InputField.jsx";
export { Modal } from "./Modal.jsx";
export { Typography } from "./Typography.jsx";
