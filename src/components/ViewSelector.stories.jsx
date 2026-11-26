import ViewSelector from "./ViewSelector.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// The view selector is migrated to the unified design system (#250), so its
// stories render under the same [data-ui-theme] scope root the app gets from
// the theme bridge. Flip the UI theme and Direction toolbars for the light,
// dark and RTL checks; each story pins one of the three modes' pressed
// reading.

const noop = () => undefined;

const meta = {
  title: "BookmarkIt/Application/View selector",
  component: ViewSelector,
  decorators: [UiScope],
  parameters: { layout: "fullscreen" },
  args: { onChange: noop },
};

export default meta;

export const Single = {
  args: { value: "single" },
};

export const Flow = {
  args: { value: "flow" },
};

export const Grid = {
  args: { value: "grid" },
};
