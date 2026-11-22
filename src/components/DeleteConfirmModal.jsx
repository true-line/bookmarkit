import React from "react";
import { Button, Modal } from "../design-system/index.js";

// #243: the first app surfaces on the unified design system's modal. The
// screens confirm destructive actions through modal-standard with a
// button-destructive footer action, so the confirm button maps to
// intent="destructive" and Cancel to intent="secondary" — the destructive
// reading is the footer recipe, not the alert variant's error heading. The
// question rides the header description so the dialog stays described by what
// it asks: the legacy modal pointed aria-describedby at the message paragraph
// (delete-confirm-msg), and the unified standard modal only wires the
// description prop into that labelling. Focus trap, Escape, and focus
// restoration come from the unified Modal's useFocusTrap. onScrimClick guards
// both routes out so a deletion in flight cannot be abandoned half way.
// A11Y-04, PERF-05: dialog labelling and React.memo.
// UX-09: isLoading prop disables buttons and shows spinner during async deletion.
// #86: `reasons` explains a proposal the user did not make by hand — a model's
// verdict that two bookmarks are the same page. Nothing is deleted without the
// pair, and the reason for it, being visible first.
const DeleteConfirmModal = ({ message, reasons = [], onConfirm, onCancel, isLoading = false }) => {
  return (
    <Modal
      title="Confirm Deletion"
      description={message}
      onClose={onCancel}
      hideClose
      onScrimClick={() => !isLoading && onCancel()}
      footer={
        <>
          <Button intent="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button intent="destructive" onClick={onConfirm} loading={isLoading}>
            {isLoading ? "Deleting…" : "Delete"}
          </Button>
        </>
      }
    >
      {reasons.length > 0 && (
        <ul className="mt-3 max-h-60 overflow-y-auto text-sm space-y-2">
          {reasons.map(({ id, title, keptTitle, reason }) => (
            <li key={id} className="p-2 rounded border border-border">
              <span className="text-primary-text">{title}</span>
              <span className="text-secondary-text"> — same page as </span>
              <span className="text-primary-text">{keptTitle}</span>
              <div className="text-xs text-secondary-text">{reason}</div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

export default React.memo(DeleteConfirmModal);
