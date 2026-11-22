import DigestModal from "./DigestModal.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// #248: the weekly digest is migrated onto the unified design system, so its
// story renders under the shared UiScope decorator like the other migrated
// dialogs — the UI theme and direction toolbars audit light/dark and LTR/RTL
// on the migrated modal. The fixture mirrors the weekly-digest mockup's
// readings: model-named themes over the week's additions, a settled
// never-opened set, and an untagged set with the model-powered triage action.
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
};

const meta = {
  title: "BookmarkIt/Dialogs/Digest",
  component: DigestModal,
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

export const Digest = {};

// A digest with no model grouping: the sections stand on their own and the
// triage action is the only model-powered affordance left in the footer.
export const UntaggedOnly = {
  args: { digest: { added: [], neverOpened: [], untagged: DIGEST.untagged, themes: [] } },
};
