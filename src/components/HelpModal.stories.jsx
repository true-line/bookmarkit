import React from "react";
import HelpModal from "./HelpModal.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// The help modal is migrated to the unified design system (#244), so its
// story renders under the same [data-ui-theme] scope root the app gets from
// the theme bridge. Flip the UI theme and Direction toolbars for the light,
// dark and RTL checks; the mockup screen is desktop-only by design, so the
// panel keeps its wide 2xl reading at every viewport.

const meta = {
  title: "BookmarkIt/Dialogs/Help",
  component: HelpModal,
  decorators: [UiScope],
  parameters: { layout: "fullscreen" },
  args: { onClose: () => undefined },
};

export default meta;

export const Default = {};
