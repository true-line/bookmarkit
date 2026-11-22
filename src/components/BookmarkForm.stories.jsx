import BookmarkForm from "./BookmarkForm.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// #242: the edit-bookmark dialog is the first app surface migrated onto the
// unified design system, so its story renders under the shared UiScope
// decorator like the design-system stories — the UI theme and direction
// toolbars audit light/dark and LTR/RTL on the migrated dialog.
const noop = () => undefined;

const EDIT_BOOKMARK = {
  id: "1",
  title: "macOS Login Shells — Ghostty Help",
  url: "https://ghostty.org/docs/help/macos-login-shells",
  description:
    "Official Ghostty documentation explaining how macOS login shells initialize PATH and environment variables.",
  tags: ["macos", "shell", "terminal"],
  rating: 4,
  folderId: "Engineering/Terminal & CLI",
  faviconUrl: "",
};

const meta = {
  title: "BookmarkIt/Dialogs/EditBookmark",
  component: BookmarkForm,
  decorators: [UiScope],
  parameters: { layout: "fullscreen" },
  args: {
    onClose: noop,
    onSave: noop,
    onDelete: noop,
    // The URL check is a network call in the app; stories pin the settled
    // valid state so the mockup's input-field-valid reading is reviewable.
    fetchUrlStatus: async () => ({ status: "valid" }),
    folders: ["Engineering/Terminal & CLI", "AI & Agents", "Personal"],
    provider: "gemini",
    providerOptions: { apiKey: "", model: "gemini-2.0-flash" },
  },
};

export default meta;

export const Edit = {
  args: { bookmark: EDIT_BOOKMARK },
};

export const AddNew = {
  args: { bookmark: null },
};
