// Unified UI design system (#238, Storybook-first). Public entry point.
//
// This module is additive and not yet imported by any app surface: the
// Storybook preview supplies the theme and direction toolbars, and the shared
// UiScope story decorator (story-decorator.jsx) renders the [data-ui-theme]
// scope root. Migrating a surface means importing tokens.css and
// components.css once (ideally through this entry) and rendering the surface
// under the same attribute the decorator uses.
//
// The legacy src/components/DesignSystem.jsx library is retired (#255);
// useTheme's seven runtime theme variables remain the theme-bridge source
// (#240) feeding data-ui-theme.

export { Button, IconButton } from "./Button.jsx";
export { Card } from "./Card.jsx";
export { InputField } from "./InputField.jsx";
export { Modal } from "./Modal.jsx";
export { StarRating } from "./StarRating.jsx";
export { Tag } from "./Tag.jsx";
export { Typography } from "./Typography.jsx";
