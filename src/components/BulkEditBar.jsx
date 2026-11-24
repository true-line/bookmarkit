// #54: What to do with a selection, once there is more than one thing in it.
//
// Multi-select could only delete, so retagging forty bookmarks meant opening the
// form forty times. This collects a change; `utils/bulkEdit.js` decides what it
// would write and the store applies it in one go.
//
// The confirmation is inline rather than a dialog: it is the same bar, one step
// on, which keeps the selection visible behind it and keeps this component out of
// the app's dialog stack.

import React, { useMemo, useState } from "react";
import { keepsSelectionProps } from "../hooks/useBookmarkSelection.js";
import { describeBulkEdit, isEmptyChange, planBulkEdit } from "../utils/bulkEdit.js";
import { Button, InputField } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import { SelectionIcon } from "./icons.jsx";

// Above this many bookmarks, applying takes a second press. Small enough that a
// slip on a big selection is caught, large enough not to nag.
const CONFIRM_ABOVE = 10;

// "Leave this field alone" has to be distinguishable from "set it to empty",
// since no folder and no rating are both things a bulk edit can mean.
const KEEP = "";
const ROOT = "\u0000root";
const NEW_FOLDER = "\u0000new";

const EMPTY = { addTags: "", removeTags: "", folder: KEEP, newFolder: "", rating: KEEP };

/** Folders already in use, so moving into one is a choice rather than a spelling test. */
const folderOptions = (bookmarks) =>
  [...new Set(bookmarks.map((b) => b?.folderId).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

/**
 * The change as `planBulkEdit` wants it: a field left alone is absent rather than
 * present and empty.
 */
function asChange({ addTags, removeTags, folder, newFolder, rating }) {
  const change = { addTags, removeTags };
  if (folder === ROOT) change.folderId = "";
  else if (folder === NEW_FOLDER) {
    const path = newFolder.trim();
    if (path) change.folderId = path;
  } else if (folder !== KEEP) change.folderId = folder;
  if (rating !== KEEP) change.rating = Number(rating);
  return change;
}

const BulkEditBar = React.memo(function BulkEditBar({
  selected,
  allBookmarks = [],
  onApply,
  onClearSelection,
  onDelete,
}) {
  const t = useMessages();
  const [form, setForm] = useState(EMPTY);
  const [confirming, setConfirming] = useState(false);

  const change = useMemo(() => asChange(form), [form]);
  const { patches, unchanged } = useMemo(() => planBulkEdit(selected, change), [selected, change]);
  const nothingToDo = patches.length === 0;

  // Any edit to the form withdraws a pending confirmation: the number that was
  // being confirmed is no longer the number that would be written.
  const set = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    setConfirming(false);
  };

  const apply = async () => {
    if (nothingToDo) return;
    if (patches.length > CONFIRM_ABOVE && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    await onApply(patches);
    setForm(EMPTY);
  };

  const count = selected.length;
  const folders = folderOptions(allBookmarks);

  return (
    // Clicking a control here must not dismiss the selection it acts on.
    <div
      className="ui-bulk-bar mb-4"
      {...keepsSelectionProps}
      role="group"
      aria-label={t("bulkEdit.groupAria", { count })}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="ui-bulk-count ui-type-label-md ui-numeric">
          <SelectionIcon />
          {t("bulkEdit.selectedCount", { count })}
        </span>

        <InputField
          id="bulk-add-tags"
          type="text"
          value={form.addTags}
          onChange={set("addTags")}
          placeholder={t("bulkEdit.addTagsPlaceholder")}
          aria-label={t("bulkEdit.addTagsAria")}
          wrapperClassName="min-w-[11.25rem] max-w-full"
        />

        <InputField
          id="bulk-remove-tags"
          type="text"
          value={form.removeTags}
          onChange={set("removeTags")}
          placeholder={t("bulkEdit.removeTagsPlaceholder")}
          aria-label={t("bulkEdit.removeTagsAria")}
          wrapperClassName="min-w-[11.25rem] max-w-full"
        />

        <select
          id="bulk-folder"
          className="ui-input ui-bulk-select ui-bulk-select--folder"
          value={form.folder}
          onChange={set("folder")}
          aria-label={t("bulkEdit.folderAria")}
        >
          <option value={KEEP}>{t("bulkEdit.keepFolders")}</option>
          <option value={ROOT}>{t("bulkEdit.noFolder")}</option>
          {folders.map((folder) => (
            <option key={folder} value={folder}>
              {folder}
            </option>
          ))}
          <option value={NEW_FOLDER}>{t("bulkEdit.newFolder")}</option>
        </select>

        {form.folder === NEW_FOLDER && (
          <InputField
            id="bulk-new-folder"
            type="text"
            value={form.newFolder}
            onChange={set("newFolder")}
            placeholder={t("bulkEdit.folderPathPlaceholder")}
            aria-label={t("bulkEdit.newFolderAria")}
            wrapperClassName="min-w-[11.25rem] max-w-full"
            autoFocus
          />
        )}

        <select
          id="bulk-rating"
          className="ui-input ui-bulk-select ui-bulk-select--rating"
          value={form.rating}
          onChange={set("rating")}
          aria-label={t("bulkEdit.ratingAria")}
        >
          <option value={KEEP}>{t("bulkEdit.keepRatings")}</option>
          <option value={0}>{t("bulkEdit.clearRating")}</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
            </option>
          ))}
        </select>

        <Button type="button" onClick={apply} disabled={nothingToDo}>
          {confirming ? t("bulkEdit.applyTo", { count: patches.length }) : t("bulkEdit.apply")}
        </Button>

        {onDelete && (
          <Button type="button" intent="destructive" onClick={onDelete}>
            {t("common.delete")}
          </Button>
        )}

        <Button type="button" intent="secondary" onClick={onClearSelection}>
          {t("bulkEdit.clearSelection")}
        </Button>
      </div>

      {/* Says what would happen before it happens, and stays quiet when nothing would. */}
      <div className="ui-bulk-summary mt-2" aria-live="polite">
        {isEmptyChange(change)
          ? t("bulkEdit.hint")
          : nothingToDo
            ? t("bulkEdit.allMatch", { count })
            : `${describeBulkEdit(change, patches.length, t)}${
                unchanged > 0 ? ` ${t("bulkEdit.alreadyMatch", { count: unchanged })}` : ""
              }`}
      </div>
    </div>
  );
});

export default BulkEditBar;
