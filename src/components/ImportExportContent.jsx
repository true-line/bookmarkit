import React, { useMemo, useRef, useState } from "react";
import { generateNetscapeHtml, parseNetscapeHtml } from "../utils/netscapeBookmarks.js";
import { readImportedBookmarks } from "../utils/importedBookmarks.js";
import { Button, Card, Modal, Tag, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import { ImportPanel } from "./ImportPanel.jsx";

// Migrated to the unified design system (#247): the import/export panel runs
// as the modal-standard dialog itself (title plus the mockup's description
// line, Close on the tinted footer band) instead of living inside the legacy
// Modal. The mockup's recipes carry the presentation — the dashed drop zone
// for file import, the export section's live bookmark-count tag, primary for
// the JSON download and the tab's import action, tonal secondary for the
// rest — while the tabbed JSON/HTML structure stays the app's own: the
// mockup merges both formats onto one chooser, and the round-trip behavior
// (per-format parse, paste, preview, append/replace confirmation) is pinned
// by tests and unchanged here. Netscape parse/export logic is untouched.
//
// The tabs, drop zone and textarea have no unified primitives, so they join
// components.css as screen recipes (.ui-tabs/.ui-tab, .ui-dropzone,
// .ui-textarea) alongside the help screen's shortcut rows. The tab keyboard
// contract is the legacy Tabs' exactly — roving tabindex and the
// Arrow/Home/End rotations — carried over rather than re-decided. The
// per-format import body lives in ImportPanel.jsx.

// UX-03: Memoize JSON/HTML export strings and data URIs to prevent recomputing on every render.
// UX-04: Add confirmation step before import with append vs replace option.

// Tab labels are catalogue keys, resolved with t() at render time.
const TABS = [
  { value: "export", label: "importExport.exportTab" },
  { value: "import-json", label: "importExport.importJsonTab" },
  { value: "import-html", label: "importExport.importHtmlTab" },
];

// The export buttons' download/code glyphs, per the mockup's icons.
const ICON_PATHS = {
  download:
    "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
};

function IoIcon({ path }) {
  return (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
}

const mutedText = { margin: 0, color: "var(--ui-on-surface-variant)" };
const radioRow = {
  display: "flex",
  alignItems: "center",
  gap: "var(--ui-space-gutter-sm)",
  cursor: "pointer",
};

const ImportExportContent = ({
  bookmarks,
  onClose,
  onImportJson,
  onImportHtml,
  showMessage,
  initialTab = "export",
}) => {
  const t = useMessages();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [importJsonText, setImportJsonText] = useState("");
  const [importHtmlText, setImportHtmlText] = useState("");
  // UX-03: Loading state for async JSON parse
  const [isParsing, setIsParsing] = useState(false);
  // UX-04: Confirmation state before executing import
  const [pendingImport, setPendingImport] = useState(null); // { type: 'json'|'html', data: any, count: number }
  const [replaceAll, setReplaceAll] = useState(false);

  // Roving tabindex for the format tabs, the legacy Tabs' keyboard contract.
  const tabRefs = useRef([]);
  const activateTabAt = (index) => {
    const tab = TABS[index];
    if (!tab) return;
    setActiveTab(tab.value);
    tabRefs.current[index]?.focus();
  };
  const handleTabKeyDown = (event, index) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      activateTabAt((index + 1) % TABS.length);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      activateTabAt((index - 1 + TABS.length) % TABS.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      activateTabAt(0);
    } else if (event.key === "End") {
      event.preventDefault();
      activateTabAt(TABS.length - 1);
    }
  };

  // UX-03: Memoize expensive serializations so they run at most once per bookmarks change
  const jsonExport = useMemo(() => JSON.stringify(bookmarks, null, 2), [bookmarks]);

  const htmlExport = useMemo(() => generateNetscapeHtml(bookmarks), [bookmarks]);
  // UX-03: Memoize data URIs for download links
  const jsonDataUri = useMemo(
    () => `data:application/json;charset=utf-8,${encodeURIComponent(jsonExport)}`,
    [jsonExport]
  );
  const htmlDataUri = useMemo(
    () => `data:text/html;charset=utf-8,${encodeURIComponent(htmlExport)}`,
    [htmlExport]
  );

  /**
   * #25: Validate before confirming, not after. The array's raw length used to be
   * the number shown, so an import of 100 entries where 40 had no usable URL
   * still promised 100 bookmarks and then quietly added 60.
   */
  const stageJsonImport = (text) => {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      showMessage(t("importExport.invalidJson"), "error");
      return;
    }
    const { bookmarks: importable, rejectedCount } = readImportedBookmarks(parsed);
    if (importable.length === 0) {
      showMessage(
        `${t("importExport.nothingToImport")} ${
          rejectedCount > 0
            ? t("importExport.skippingEntries", { count: rejectedCount })
            : t("importExport.emptyArray")
        }`,
        "error"
      );
      return;
    }
    if (rejectedCount > 0) {
      showMessage(t("importExport.skippingEntries", { count: rejectedCount }), "info");
    }
    setPendingImport({ type: "json", data: importable, count: importable.length });
  };

  // UX-04: Show confirmation instead of immediately importing
  const requestJsonImport = () => {
    // UX-03: Wrap JSON.parse in setTimeout to yield to the event loop for large payloads
    setIsParsing(true);
    setTimeout(() => {
      try {
        stageJsonImport(importJsonText);
      } catch {
        showMessage(t("importExport.parseError"), "error");
      } finally {
        setIsParsing(false);
      }
    }, 0);
  };

  const requestHtmlImport = () => {
    // Counted by parsing rather than by matching <DT>, which also introduces folders.
    setPendingImport({
      type: "html",
      data: importHtmlText,
      count: parseNetscapeHtml(importHtmlText).length,
    });
  };

  // UX-04: Execute confirmed import
  const executeImport = async () => {
    if (!pendingImport) return;
    try {
      // JSON hands the store the normalized entries; HTML hands the file text
      // — await so status is only shown after completion.
      if (pendingImport.type === "json") {
        await onImportJson(pendingImport.data, replaceAll);
      } else {
        await onImportHtml(pendingImport.data, replaceAll);
      }
    } catch {
      showMessage(t("importExport.importFailed"), "error");
    } finally {
      setPendingImport(null);
      setReplaceAll(false);
    }
  };

  const cancelImport = () => {
    setPendingImport(null);
    setReplaceAll(false);
  };

  return (
    <Modal
      title={t("importExport.title")}
      description={t("importExport.description")}
      closeLabel={t("importExport.closeLabel")}
      onClose={onClose}
      footer={
        <Button intent="secondary" onClick={onClose}>
          {t("common.close")}
        </Button>
      }
    >
      {/* UX-04: Confirmation step shown instead of the normal tabs UI */}
      {pendingImport ? (
        <Card
          actions={
            <>
              <Button intent="secondary" onClick={cancelImport}>
                {t("common.cancel")}
              </Button>
              <Button onClick={executeImport}>{t("common.import")}</Button>
            </>
          }
        >
          <Typography variant="body-md" as="p" style={{ margin: 0 }}>
            {t.rich("importExport.willAdd", { count: pendingImport.count })}
          </Typography>
          <div
            style={{
              display: "grid",
              gap: "var(--ui-space-gutter-sm)",
              marginBlockStart: "var(--ui-space-gutter-md)",
            }}
          >
            {[
              {
                label: t("importExport.appendRadio"),
                checked: !replaceAll,
                set: () => setReplaceAll(false),
              },
              {
                label: t("importExport.replaceRadio"),
                checked: replaceAll,
                set: () => setReplaceAll(true),
              },
            ].map(({ label, checked, set }) => (
              <label key={label} style={radioRow}>
                <input
                  type="radio"
                  name="import-mode"
                  checked={checked}
                  onChange={set}
                  style={{ accentColor: "var(--ui-primary)" }}
                />
                <Typography variant="body-sm" as="span">
                  {label}
                </Typography>
              </label>
            ))}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          <div role="tablist" aria-label={t("importExport.tablistAria")} className="ui-tabs">
            {TABS.map((tab, index) => {
              const selected = tab.value === activeTab;
              return (
                <button
                  key={tab.value}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`io-tab-${tab.value}`}
                  aria-selected={selected}
                  aria-controls={`io-panel-${tab.value}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.value)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className="ui-tab"
                >
                  {t(tab.label)}
                </button>
              );
            })}
          </div>

          {activeTab === "export" && (
            <div role="tabpanel" id="io-panel-export" aria-labelledby="io-tab-export">
              <section aria-labelledby="io-export-heading" className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Typography
                    variant="headline-sm"
                    as="h3"
                    id="io-export-heading"
                    style={{ margin: 0 }}
                  >
                    {t("importExport.exportHeading")}
                  </Typography>
                  <Tag className="ui-numeric">
                    {t("importExport.exportCount", { count: bookmarks.length })}
                  </Tag>
                </div>
                <Typography variant="body-sm" as="p" style={mutedText}>
                  {t("importExport.exportHint")}
                </Typography>
                <div className="ui-field">
                  <label htmlFor="export-json">{t("importExport.jsonExportLabel")}</label>
                  <textarea
                    id="export-json"
                    readOnly
                    value={jsonExport}
                    className="ui-textarea ui-textarea--mono"
                    rows={8}
                  />
                </div>
                {/* Download needs the anchor's native download attribute, so the
                    link wears the ui-button recipe directly — the Button component
                    can only render a real <button>. */}
                <div>
                  <a
                    href={jsonDataUri}
                    download="bookmarks.json"
                    className="ui-button ui-button--primary"
                  >
                    <IoIcon path={ICON_PATHS.download} />
                    {t("importExport.downloadJson")}
                  </a>
                </div>
                <div className="ui-field">
                  <label htmlFor="export-html">{t("importExport.htmlExportLabel")}</label>
                  <textarea
                    id="export-html"
                    readOnly
                    value={htmlExport}
                    className="ui-textarea ui-textarea--mono"
                    rows={8}
                  />
                </div>
                <div>
                  <a
                    href={htmlDataUri}
                    download="bookmarks.html"
                    className="ui-button ui-button--secondary"
                  >
                    <IoIcon path={ICON_PATHS.code} />
                    {t("importExport.downloadHtml")}
                  </a>
                </div>
              </section>
            </div>
          )}

          {activeTab !== "export" && (
            <ImportPanel
              format={activeTab}
              text={activeTab === "import-json" ? importJsonText : importHtmlText}
              onTextChange={(e) =>
                activeTab === "import-json"
                  ? setImportJsonText(e.target.value)
                  : setImportHtmlText(e.target.value)
              }
              onImport={activeTab === "import-json" ? requestJsonImport : requestHtmlImport}
              isParsing={activeTab === "import-json" && isParsing}
              onFileText={(text) => {
                if (activeTab === "import-json") {
                  if (text !== null) stageJsonImport(text);
                } else if (text === null) {
                  return;
                } else {
                  // #40: what the reader will actually find, rather than a count
                  // of <DT> rows — a folder is a <DT> too.
                  setPendingImport({
                    type: "html",
                    data: text,
                    count: parseNetscapeHtml(text).length,
                  });
                }
              }}
              onFileError={() =>
                showMessage(
                  activeTab === "import-json"
                    ? t("importExport.jsonFileError")
                    : t("importExport.htmlFileError"),
                  "error"
                )
              }
            />
          )}
        </div>
      )}
    </Modal>
  );
};

export default ImportExportContent;
