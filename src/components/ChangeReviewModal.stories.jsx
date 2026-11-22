import ChangeReviewModal from "./ChangeReviewModal.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// The change-review dialog is migrated to the unified design system (#249),
// so its stories render under the same [data-ui-theme] scope root the app
// gets from the theme bridge. Flip the UI theme and Direction toolbars for
// the light, dark and RTL checks; the dialog shares the duplicate-review
// mockup family's wide 2xl reading at every viewport. The Applying story
// pins the footer's disabled-and-loading reading mid-apply.

const noop = () => undefined;

const rows = [
  {
    id: "1",
    title: "Rust ownership",
    fields: ["tags", "folderId"],
    before: { tags: ["rust"], folderId: "" },
    after: { tags: ["rust", "memory", "systems"], folderId: "Programming/Rust" },
  },
  {
    id: "2",
    title: "Sourdough starter",
    fields: ["description"],
    before: { description: "" },
    after: { description: "Keeping a starter alive." },
  },
  {
    id: "3",
    title: "Vite guide",
    fields: ["url", "urlStatus"],
    before: { url: "http://vite.dev/guide", urlStatus: "invalid" },
    after: { url: "https://vite.dev/guide/env-and-mode", urlStatus: "valid" },
  },
];

const meta = {
  title: "BookmarkIt/Dialogs/ChangeReview",
  component: ChangeReviewModal,
  decorators: [UiScope],
  parameters: { layout: "fullscreen" },
  args: {
    rows,
    title: "Review the proposed changes",
    onApply: noop,
    onCancel: noop,
  },
};

export default meta;

export const Default = {};

export const Applying = {
  args: { isApplying: true },
};
