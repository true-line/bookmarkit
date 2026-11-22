import DeleteConfirmModal from "./DeleteConfirmModal.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// The migrated delete confirmation (#243): the unified modal-standard with the
// destructive footer recipe. The UiScope decorator renders it under the same
// [data-ui-theme] root the app stamps, so the UI theme and direction toolbars
// drive the light / dark / RTL screenshots.
const noop = () => undefined;

const reasons = [
  {
    id: "syndicated",
    title: "Rust ownership, explained",
    keptTitle: "Rust ownership explained",
    reason: "syndicated copy of the same article",
  },
];

const meta = {
  title: "BookmarkIt/Dialogs/Delete Confirm",
  component: DeleteConfirmModal,
  decorators: [UiScope],
};

export default meta;

export const Confirmation = {
  args: {
    message: "Are you sure you want to delete 2 bookmark(s)?",
    onConfirm: noop,
    onCancel: noop,
  },
};

export const DuplicatePair = {
  args: {
    message: "Are you sure you want to delete 1 bookmark(s)?",
    reasons,
    onConfirm: noop,
    onCancel: noop,
  },
};

export const Deleting = {
  args: {
    message: "Are you sure you want to delete 2 bookmark(s)?",
    onConfirm: noop,
    onCancel: noop,
    isLoading: true,
  },
};
