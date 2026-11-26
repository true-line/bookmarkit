import LinkSweepBar from "./LinkSweepBar.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// The link-sweep bar is migrated to the unified design system (#250), so its
// stories render under the same [data-ui-theme] scope root the app gets from
// the theme bridge. Flip the UI theme and Direction toolbars for the light,
// dark and RTL checks. The bar carries its own role="status" live region; the
// stories pin its three readings — sweeping, verdict, and the already-filtered
// verdict where "Show broken" would be redundant.

const noop = () => undefined;

const meta = {
  title: "BookmarkIt/Application/Link sweep",
  component: LinkSweepBar,
  decorators: [UiScope],
  parameters: { layout: "fullscreen" },
  args: { onStop: noop, onShowBroken: noop },
};

export default meta;

export const Checking = {
  args: { running: true, checked: 12, total: 40, brokenCount: 0 },
};

export const BrokenFound = {
  args: { running: false, checked: 40, total: 40, brokenCount: 3 },
};

export const AlreadyShowingBroken = {
  args: { running: false, checked: 40, total: 40, brokenCount: 3, brokenOnly: true },
};
