import React from "react";
import { Button, Modal } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";

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
// #285: duplicates no longer confirm here — each pair is decided on its own in
// the duplicate-review dialog, which carries the proposal explanation now.
const DeleteConfirmModal = ({ message, onConfirm, onCancel, isLoading = false }) => {
  const t = useMessages();
  return (
    <Modal
      title={t("deleteConfirm.title")}
      description={message}
      onClose={onCancel}
      hideClose
      onScrimClick={() => !isLoading && onCancel()}
      footer={
        <>
          <Button intent="secondary" onClick={onCancel} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button intent="destructive" onClick={onConfirm} loading={isLoading}>
            {isLoading ? t("deleteConfirm.deleting") : t("common.delete")}
          </Button>
        </>
      }
    />
  );
};

export default React.memo(DeleteConfirmModal);
