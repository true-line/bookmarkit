import EmptyShelfStates from "./EmptyShelf.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// The empty shelf is migrated to the unified design system (#250), so its
// stories render under the same [data-ui-theme] scope root the app gets from
// the theme bridge. Flip the UI theme and Direction toolbars for the light,
// dark and RTL checks. The states wrapper picks the shelf's three readings:
// the first-run call to action, the missed search, and the agent request that
// matched nothing.

const noop = () => undefined;

const meta = {
  title: "BookmarkIt/Application/Empty shelf",
  component: EmptyShelfStates,
  decorators: [UiScope],
  parameters: { layout: "fullscreen" },
  args: {
    isLoading: false,
    bookmarksTotal: 0,
    searchActive: false,
    onAddNew: noop,
    onImport: noop,
    onClear: noop,
    effectsEnabled: true,
  },
};

export default meta;

export const FirstRun = {};

export const NoSearchResults = {
  args: { bookmarksTotal: 42, searchActive: true, searchQuery: "kubernetes" },
};

export const AgentRequestMatchedNothing = {
  args: { bookmarksTotal: 42, lastAction: { search: "podcasts" } },
};
