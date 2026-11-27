// #293: the import/export panel's narrow reading — what the centered dialog
// becomes below `lg`, per the mobile mockup
// (design/mockups/bookmarkit_mobile_import_export/code.html 167–233): a
// full-page sheet whose app bar carries the back arrow and the title over
// the library's size, with the panel's own tabbed body beneath. A
// presentational twin, like DigestSheet (#302): everything the sheet shows
// beyond its chrome is the panel's content passed as children. Still a
// dialog to the keyboard — role, aria-modal and Escape behave as the
// Modal's do, with the focus trap armed by the parent for the sheet only.
// The mockup draws no footer, so there is none: the back arrow is the way
// out.

import React from "react";
import { BackIcon } from "./icons.jsx";
import { useMessages } from "../i18n/index.js";

const ImportExportSheet = ({ sheetRef, sheetTitleId, count, onClose, children }) => {
  const t = useMessages();
  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={sheetTitleId}
      tabIndex={-1}
      className="ui-sheet ui-sheet--io"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        // Like the dialog's panel: never let the app's shortcuts hear it.
        event.stopPropagation();
        onClose();
      }}
    >
      <header className="ui-sheet-bar">
        <button
          type="button"
          className="ui-icon-button"
          aria-label={t("importExport.backAria")}
          onClick={onClose}
        >
          <BackIcon />
        </button>
        <div className="ui-sheet-heading">
          <h2 id={sheetTitleId}>{t("importExport.title")}</h2>
          {/* The mockup's second line: the library's size. Digit-led, so it
              rides plaintext in RTL, like the link-health sheet's. */}
          <p className="ui-sheet-subtitle ui-numeric" style={{ unicodeBidi: "plaintext" }}>
            {t("importExport.sheetSubtitle", { count })}
          </p>
        </div>
      </header>
      <main className="ui-sheet-body">{children}</main>
    </div>
  );
};

export default ImportExportSheet;
