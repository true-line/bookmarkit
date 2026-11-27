import AgentSpotlightBar from "./AgentSpotlightBar.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// #340: the agent bar's two provider states, side by side in the catalogue —
// the overlay a configured provider summons, and the gate toast that answers
// the shortcut when there is none (#339's decision: the strip carries no
// agent field in either state). The theme and direction toolbars give the
// light/dark and RTL readings of both surfaces.

const meta = {
  title: "BookmarkIt/Overlays/AgentSpotlightBar",
  component: AgentSpotlightBar,
  decorators: [UiScope],
  parameters: { layout: "fullscreen" },
  args: {
    onClose: () => undefined,
    onDismissNotice: () => undefined,
    onSubmit: () => Promise.resolve(),
  },
};

export default meta;

/** A provider is configured: Cmd/Ctrl+K opens the bar with the input focused. */
export const ProviderConfigured = {
  args: { open: true, noticeOpen: false },
};

/** No provider: the shortcut answers with the gate toast instead of a field. */
export const ProviderMissing = {
  args: { open: false, noticeOpen: true },
};
