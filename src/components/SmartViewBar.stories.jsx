import SmartViewBar from "./SmartViewBar.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// The smart-view bar is migrated to the unified design system (#249), so its
// stories render under the same [data-ui-theme] scope root the app gets from
// the theme bridge. Flip the UI theme and Direction toolbars for the light,
// dark and RTL checks. The bar reading is the pane's chip row; the stack
// reading is the sidebar's stacked form (SidebarNav passes layout="stack").

const noop = () => undefined;

const views = [
  { id: "v1", name: "Five-star reference", plan: [], filters: { minRating: 5 } },
  { id: "v2", name: "Unread docs", plan: [], filters: { text: "docs", neverOpened: true } },
];

const meta = {
  title: "BookmarkIt/Application/Smart views",
  component: SmartViewBar,
  decorators: [UiScope],
  parameters: { layout: "fullscreen" },
  args: {
    views,
    activeViewId: "v1",
    canSave: true,
    onApply: noop,
    onSave: noop,
    onForget: noop,
  },
};

export default meta;

export const WithSavedViews = {};

export const SaveOfferedOnly = {
  args: { views: [], activeViewId: null },
};

export const InTheSidebarStack = {
  args: { layout: "stack" },
};
