import LinkHealthView from "./LinkHealthView.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// #295: the link-health view is a workspace view from `lg` — the broken-links
// mockup's main beside the sidebar. The story renders under the shared UiScope
// decorator like the other migrated surfaces, so the UI theme and direction
// toolbars audit light/dark and LTR/RTL. The fixture mirrors the mockup's
// readings: an HTTP 404 and a DNS refusal as the chip texts, a struck-through
// dead address beside the archive's proposed snapshot, and a link the archive
// could not help keeping its row with nothing to apply.
const noop = () => undefined;

const broken = [
  {
    id: "1",
    title: "Structured Outputs in Local Inference",
    url: "https://blog.localinference.org/2023/structured-json",
    urlStatus: "invalid",
    urlStatusReason: "http:404",
  },
  {
    id: "2",
    title: "CSS Grid Subgrid Layout Patterns",
    url: "https://csspatterns.dev/subgrid-cards",
    urlStatus: "invalid",
    urlStatusReason: "unreachable",
  },
  {
    id: "3",
    title: "A page that timed out mid-sweep",
    url: "https://slow.test/timeout",
    urlStatus: "invalid",
    urlStatusReason: "timeout",
  },
];

const snapshots = {
  1: "https://web.archive.org/web/20240512/https://blog.localinference.org/2023/structured-json",
  2: "https://web.archive.org/web/20240201/https://csspatterns.dev/subgrid-cards",
};

const meta = {
  title: "BookmarkIt/Views/Link Health",
  component: LinkHealthView,
  decorators: [UiScope],
  parameters: { layout: "fullscreen" },
  args: {
    checkedTotal: 2089,
    unreachableCount: 3,
    broken,
    proposalUrls: snapshots,
    onRecheck: noop,
    onStopSweep: noop,
    onFindSnapshots: noop,
    onStopArchive: noop,
    onApply: noop,
  },
};

export default meta;

// The mockup's composition: two proposals to review, one link the archive
// could not help, Apply Selected over the accepted set.
export const Proposals = {};

// The idle reading: everything checked, nothing unreachable.
export const AllClear = {
  args: { checkedTotal: 2089, unreachableCount: 0, broken: [], proposalUrls: {} },
};

// A lookup in flight, mid-pace, with the stop where its offer was.
export const FindingSnapshots = {
  args: {
    proposalUrls: {},
    archiveRunning: true,
    archiveDone: 1,
    archiveTotal: 3,
  },
};

// A sweep re-checking the collection, wearing the bar's progress reading.
export const Sweeping = {
  args: { proposalUrls: {}, sweepRunning: true, sweepChecked: 127, sweepTotal: 2089 },
};
