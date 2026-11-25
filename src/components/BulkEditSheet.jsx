// #301: the mobile bulk-edit sheet (design/mockups
// /bookmarkit_mobile_bulk_edit/code.html 181–247) — what BulkEditBar's engine
// becomes below `lg`, where the SelectionBar's "Bulk Edit" opens it. A
// presentational twin of the inline bar, not a second engine: every value,
// handler and computed fragment arrives as a prop, so there is exactly one
// change collector and one guarded apply. Still a dialog to the keyboard —
// role, aria-modal, the focus trap (armed by the bar), Escape — and part of
// acting on the selection, like the bar: a click inside must never dismiss
// what it is editing.

import React from "react";
import { keepsSelectionProps } from "../hooks/useBookmarkSelection.js";
import { Button, InputField } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";

// How many of the selection the preview names before it sums the rest — a
// reading aid, not a cap on what a change writes.
const PREVIEW_LIMIT = 12;

// The sheet app bar's back arrow — the edit-bookmark sheet's glyph (#300).
function BackIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

const BulkEditSheet = ({
  sheetRef,
  sheetTitleId,
  count,
  total,
  selected,
  form,
  set,
  isAutoTagging,
  confirming,
  nothingToDo,
  patchCount,
  autoTagButton,
  autoTagErrorLine,
  summary,
  folderSelect,
  newFolderField,
  onDelete,
  requestClose,
  apply,
}) => {
  const t = useMessages();

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={sheetTitleId}
      tabIndex={-1}
      className="ui-sheet ui-sheet--bulk"
      {...keepsSelectionProps}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        // Like the dialog's panel: never let the app's shortcuts hear it.
        event.stopPropagation();
        requestClose();
      }}
    >
      <header className="ui-sheet-bar">
        <button
          type="button"
          className="ui-icon-button"
          aria-label={t("bulkEdit.backAria")}
          onClick={requestClose}
          disabled={isAutoTagging}
        >
          <BackIcon />
        </button>
        <div className="ui-sheet-heading">
          <h2 id={sheetTitleId}>{t("shell.bulkEdit")}</h2>
          <p className="ui-sheet-subtitle">{t("bulkEdit.selectedCount", { count })}</p>
        </div>
      </header>
      <main className="ui-sheet-body">
        <section className="ui-sheet-section">
          <div className="flex items-center justify-between gap-2">
            <span className="ui-type-label-md">{t("bulkEdit.previewTitle")}</span>
            <span className="ui-type-label-sm ui-numeric" style={{ color: "var(--ui-primary)" }}>
              {t("bulkEdit.previewOf", { selected: count, total })}
            </span>
          </div>
          <ul className="ui-sheet-preview">
            {selected.slice(0, PREVIEW_LIMIT).map((b) => (
              <li key={b.id}>{b.title || b.url}</li>
            ))}
            {selected.length > PREVIEW_LIMIT && (
              <li className="ui-sheet-preview-more">
                {t("bulkEdit.previewMore", { count: selected.length - PREVIEW_LIMIT })}
              </li>
            )}
          </ul>
        </section>

        <section className="ui-sheet-section">
          <h2>{t("bulkEdit.folderSectionTitle")}</h2>
          <div className="ui-field">
            <label htmlFor="bulk-folder" className="ui-type-label-md">
              {t("bulkEdit.folderLabel")}
            </label>
            {folderSelect}
          </div>
          {newFolderField}
        </section>

        <section className="ui-sheet-section">
          <div className="flex items-center justify-between gap-2">
            <h2>{t("bulkEdit.tagsSectionTitle")}</h2>
            {autoTagButton}
          </div>
          <InputField
            id="bulk-add-tags"
            type="text"
            label={t("bulkEdit.addTagsLabel")}
            value={form.addTags}
            onChange={set("addTags")}
            placeholder={t("bulkEdit.addTagsPlaceholder")}
          />
          <InputField
            id="bulk-remove-tags"
            type="text"
            label={t("bulkEdit.removeTagsLabel")}
            value={form.removeTags}
            onChange={set("removeTags")}
            placeholder={t("bulkEdit.removeTagsPlaceholder")}
          />
          {autoTagErrorLine}
        </section>

        {onDelete && (
          <section className="ui-sheet-section ui-sheet-section--danger">
            <h2>{t("bulkEdit.dangerTitle")}</h2>
            <p className="ui-type-body-sm" style={{ color: "var(--ui-on-surface-variant)" }}>
              {t("bulkEdit.dangerNote", { count })}
            </p>
            <Button type="button" intent="destructive" onClick={onDelete}>
              {t("bulkEdit.deleteBookmarks", { count })}
            </Button>
          </section>
        )}

        {summary}
      </main>
      <footer className="ui-sheet-footer">
        <Button intent="secondary" onClick={requestClose} disabled={isAutoTagging}>
          {t("common.cancel")}
        </Button>
        <Button intent="primary" onClick={apply} disabled={nothingToDo}>
          {confirming ? t("bulkEdit.applyTo", { count: patchCount }) : t("bulkEdit.applyChanges")}
        </Button>
      </footer>
    </div>
  );
};

export default BulkEditSheet;
