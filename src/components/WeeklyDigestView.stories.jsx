import WeeklyDigestView from "./WeeklyDigestView.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// #296: the weekly digest is a workspace view from `lg` — the weekly-digest
// mockup's main beside the sidebar — and the mobile mockup's full-page sheet
// below it (#302). The story renders under the shared UiScope decorator like
// the other migrated surfaces, so the UI theme and direction toolbars audit
// light/dark and LTR/RTL on both compositions. The fixture mirrors the
// weekly-digest mockup's readings: model-named themes over the week's
// additions, a settled never-opened set, and an untagged set with the
// model-powered triage action.
const noop = () => undefined;

const bookmark = (id, title, url) => ({ id, title, url });

const DIGEST = {
  added: [
    bookmark(
      "1",
      "Writing a good CLAUDE.md | HumanLayer Blog",
      "https://www.humanlayer.dev/blog/writing-a-good-claude-md"
    ),
    bookmark(
      "2",
      "Chroma Context-1: Self-Editing Search Agent",
      "https://www.trychroma.com/research/context-1"
    ),
    bookmark(
      "3",
      "macOS Login Shells — Ghostty Help",
      "https://ghostty.org/docs/help/macos-login-shells"
    ),
  ],
  neverOpened: [
    bookmark("4", "Frequently Asked Questions — kitty", "https://sw.kovidgoyal.net/kitty/faq/"),
  ],
  untagged: [
    bookmark(
      "5",
      "Ripgrep User Guide",
      "https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md"
    ),
  ],
  themes: [
    {
      title: "AI & Agent Engineering",
      summary: "Agent tooling and context engineering reads.",
      ids: ["1", "2"],
    },
    { title: "Terminal & Shell Tooling", summary: "", ids: ["3"] },
  ],
  totals: { added: 14, neverOpened: 6, untagged: 4 },
};

const meta = {
  title: "BookmarkIt/Views/Weekly Digest",
  component: WeeklyDigestView,
  decorators: [UiScope],
  parameters: { layout: "fullscreen" },
  args: {
    digest: DIGEST,
    onOpen: noop,
    onShowNeverOpened: noop,
    onTriage: noop,
    onClose: noop,
  },
};

export default meta;

// The composition the viewport picks: the workspace view from `lg`, the
// sheet below — narrow the canvas to see the other one.
export const Digest = {};

// A digest with no model grouping: the clusters stand on their own and the
// triage action is the only model-powered affordance left in the header.
export const UntaggedOnly = {
  args: {
    digest: {
      added: [],
      neverOpened: [],
      untagged: DIGEST.untagged,
      themes: [],
      totals: { added: 0, neverOpened: 0, untagged: 1 },
    },
  },
};
