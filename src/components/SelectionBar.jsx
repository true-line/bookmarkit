// #299: the mobile manager's selection bar (design/mockups
// /bookmarkit_mobile_manager/code.html 373–388): what is selected, Clear, and
// Bulk Edit on an inverse band pinned to the viewport's bottom, where a thumb
// reaches them. Below `lg` it is the selection's only home — "Bulk Edit"
// raises the list's inline editor until the sheet (#301) replaces it. Above
// `lg` it is not mounted, and the inline editor appears on its own, as it
// always has.
//
// Its controls are not the design system's Button: the button recipes would
// bring their light-surface fills back onto the inverse surface, so the band
// carries its own inverse readings in index.css instead. The ref lands on the
// fixed band itself — a fixed element contributes no layout height to a
// wrapper, so the app's height measurement must read this element, and only
// forwardRef puts that element in the caller's hands.

import React from "react";
import { keepsSelectionProps } from "../hooks/useBookmarkSelection.js";
import { useMessages } from "../i18n/index.js";
import { CheckCircleIcon, EditNoteIcon } from "./icons.jsx";

const SelectionBar = React.memo(
  React.forwardRef(function SelectionBar({ count, onClear, onBulkEdit, ...props }, ref) {
    const t = useMessages();
    return (
      <div
        ref={ref}
        className="ui-selection-bar"
        role="region"
        aria-label={t("shell.selectionActions")}
        // Clicking Clear or Bulk Edit must not dismiss the selection they act
        // on — the same contract the bulk edit bar holds to.
        {...keepsSelectionProps}
        {...props}
      >
        <span className="ui-selection-bar-count">
          <CheckCircleIcon />
          {t("bulkEdit.selectedCount", { count })}
        </span>
        <div className="ui-selection-bar-actions">
          <button type="button" className="ui-selection-bar-button" onClick={onClear}>
            {t("shell.clear")}
          </button>
          <button
            type="button"
            className="ui-selection-bar-button ui-selection-bar-button--primary"
            onClick={onBulkEdit}
          >
            <EditNoteIcon />
            {t("shell.bulkEdit")}
          </button>
        </div>
      </div>
    );
  })
);

export default SelectionBar;
