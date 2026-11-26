import DuplicateReviewModal from "./DuplicateReviewModal.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// The duplicate review (#285), the mockup's two rows: an exact-normalized-URL
// pair the rule caught, and a canonical/syndicated pair the model proposed.
// The UiScope decorator renders it under the same [data-ui-theme] root the
// app stamps, so the UI theme and direction toolbars drive the light / dark /
// RTL screenshots.
const noop = () => undefined;

const richKeep = {
  id: "rich",
  title: "Context7 — Docs for LLMs",
  url: "https://context7.com/",
  tags: ["docs"],
  rating: 5,
};
const bareDrop = { id: "bare", title: "Context7", url: "https://context7.com/?utm_source=hn" };
const canonicalKeep = {
  id: "canon",
  title: "Writing a good CLAUDE.md",
  url: "https://humanlayer.dev/blog/writing-a-good-claude-md",
  description: "Read twice; notes inside.",
};
const mirrorDrop = {
  id: "mirror",
  title: "HumanLayer: Writing a good CLAUDE.md",
  url: "https://medium.com/@humanlayer/writing-a-good-claude-md",
};

const pairs = [
  { id: "bare", keep: richKeep, drop: bareDrop, source: "rule", headline: "exactUrl" },
  {
    id: "mirror",
    keep: canonicalKeep,
    drop: mirrorDrop,
    source: "ai",
    headline: "canonical and syndicated versions of the same article",
  },
];

const meta = {
  title: "BookmarkIt/Dialogs/Duplicate Review",
  component: DuplicateReviewModal,
  decorators: [UiScope],
};

export default meta;

export const RuleAndAiPairs = {
  args: {
    pairs,
    onRemove: noop,
    onCancel: noop,
  },
};

export const Removing = {
  args: {
    pairs,
    onRemove: noop,
    onCancel: noop,
    isRemoving: true,
  },
};
