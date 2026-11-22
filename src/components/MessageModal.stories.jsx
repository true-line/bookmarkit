import MessageModal from "./MessageModal.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// The migrated message dialog (#243): the unified modal-standard over the
// legacy Banner body (the design system has no Banner of its own yet). The
// UiScope decorator renders it under the same [data-ui-theme] root the app
// stamps, so the UI theme and direction toolbars drive light / dark / RTL.
const noop = () => undefined;

const meta = {
  title: "BookmarkIt/Dialogs/Message",
  component: MessageModal,
  decorators: [UiScope],
};

export default meta;

export const Info = {
  args: { message: "Theme imported.", type: "info", onClose: noop },
};

export const Success = {
  args: { message: "Bookmarks saved.", type: "success", onClose: noop },
};

export const Error = {
  args: { message: "That file is not a BookmarkIt theme.", type: "error", onClose: noop },
};
