import React, { useMemo, useRef, useState } from "react";
import { generateNetscapeHtml, parseNetscapeHtml } from "../utils/netscapeBookmarks.js";
import { readImportedBookmarks } from "../utils/importedBookmarks.js";
import { generateMarkdownLinks, parseMarkdownLinks } from "../utils/markdownBookmarks.js";
import { filterDuplicateImports } from "../utils/duplicates.js";
import { isSafeHttpUrl } from "../utils/url.js";
import { Button, Modal, Tag, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import { ImportPanel } from "./ImportPanel.jsx";
import ImportConfirmCard from "./ImportConfirmCard.jsx";

// Migrated to the unified design system (#247): the import/export panel runs
// as the modal-standard dialog itself (title plus the mockup's description
// line, Close on the tinted footer band) instead of living inside the legacy
// Modal. The mockup's recipes carry the presentation — the dashed drop zone
// for file import, the export section's live bookmark-count tag, primary for
// the JSON download and the tab's import action, tonal secondary for the
// rest — while the tabbed JSON/HTML/Markdown structure stays the app's own:
// the mockup merges every format onto one chooser, and #287 keeps that
// composition (recorded in DESIGN.md) while widening it — the mobile mockup's
// "Export Markdown" and "Skip URLs already in library" join the desktop
// mockup's export copy. The round-trip behavior (per-format parse, paste,
// preview, append/replace confirmation) is pinned by tests and unchanged.
// Netscape parse/export logic is untouched.
//
// The confirmation's numbers are honest about the skip-existing choice: when
// it is checked (the mockup's default), the staged entries run through the
// same normalized-URL rule the store edge applies, so the count you approve is
// the count that will be added and the rest are named. Unchecking it imports
// every usable entry, duplicates included — which is why the store edge takes
// the choice as a parameter instead of deciding it.
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
  { value: "import-markdown", label: "importExport.importMarkdownTab" },
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
  const [importMarkdownText, setImportMarkdownText] = useState("");
  // UX-03: Loading state for async JSON parse
  const [isParsing, setIsParsing] = useState(false);
  // UX-04: Confirmation state before executing import
  // { type: 'json'|'html'|'markdown', data, entries, count, fileName } —
  // `data` is what the store handler receives (normalized entries, or the
  // HTML text it parses itself); `entries` are the usable entries behind the
  // count, so the confirmation can show what skip-existing leaves.
  const [pendingImport, setPendingImport] = useState(null);
  const [replaceAll, setReplaceAll] = useState(false);
  // #287: the mockup's checkbox, checked — skipping URLs already in the
  // library is what the store edge has always done, so the default keeps it.
  const [skipExisting, setSkipExisting] = useState(true);

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
  const markdownExport = useMemo(() => generateMarkdownLinks(bookmarks), [bookmarks]);
  // UX-03: Memoize data URIs for download links
  const jsonDataUri = useMemo(
    () => `data:application/json;charset=utf-8,${encodeURIComponent(jsonExport)}`,
    [jsonExport]
  );
  const htmlDataUri = useMemo(
    () => `data:text/html;charset=utf-8,${encodeURIComponent(htmlExport)}`,
    [htmlExport]
  );
  const markdownDataUri = useMemo(
    () => `data:text/markdown;charset=utf-8,${encodeURIComponent(markdownExport)}`,
    [markdownExport]
  );

  /**
   * #25: Validate before confirming, not after. The array's raw length used to be
   * the number shown, so an import of 100 entries where 40 had no usable URL
   * still promised 100 bookmarks and then quietly added 60.
   */
  const stageJsonImport = (text, fileName) => {
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
    setPendingImport({
      type: "json",
      data: importable,
      entries: importable,
      count: importable.length,
      fileName,
    });
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

  // Counted by parsing rather than by matching <DT>, which also introduces
  // folders — and, like the JSON path, counted by what the store would accept,
  // so the number shown cannot include links the import would refuse.
  const stageHtmlImport = (text, fileName) => {
    const entries = parseNetscapeHtml(text).filter((bookmark) => isSafeHttpUrl(bookmark.url));
    if (entries.length === 0) {
      showMessage(t("importExport.nothingToImport"), "error");
      return;
    }
    setPendingImport({ type: "html", data: text, entries, count: entries.length, fileName });
  };

  const stageMarkdownImport = (text, fileName) => {
    const { bookmarks: importable, rejectedCount } = readImportedBookmarks(
      parseMarkdownLinks(text)
    );
    if (importable.length === 0) {
      showMessage(
        `${t("importExport.nothingToImport")} ${
          rejectedCount > 0
            ? t("importExport.skippingEntries", { count: rejectedCount })
            : t("importExport.noMarkdownLinks")
        }`,
        "error"
      );
      return;
    }
    if (rejectedCount > 0) {
      showMessage(t("importExport.skippingEntries", { count: rejectedCount }), "info");
    }
    setPendingImport({
      type: "markdown",
      data: importable,
      entries: importable,
      count: importable.length,
      fileName,
    });
  };

  const requestHtmlImport = () => stageHtmlImport(importHtmlText);

  const requestMarkdownImport = () => stageMarkdownImport(importMarkdownText);

  // #287: the confirmation's numbers are the store edge's numbers. When
  // skip-existing is on, the staged entries run through the same
  // normalized-URL rule the edge applies — against an emptied library under
  // replace — and the skip count splits into what it can honestly name:
  // duplicates the file itself carries, and entries the library already
  // holds. Off, nothing is filtered, so nothing is promised as skipped.
  const effectiveImport = useMemo(() => {
    if (!pendingImport) return null;
    if (!skipExisting) {
      return { count: pendingImport.count, skippedCount: 0, duplicateCount: 0 };
    }
    const { bookmarks: kept, skippedCount } = filterDuplicateImports(
      pendingImport.entries,
      replaceAll ? [] : bookmarks
    );
    const { skippedCount: withinFile } = filterDuplicateImports(pendingImport.entries, []);
    return {
      count: kept.length,
      skippedCount: skippedCount - withinFile,
      duplicateCount: withinFile,
    };
  }, [bookmarks, pendingImport, replaceAll, skipExisting]);

  // UX-04: Execute confirmed import
  const executeImport = async () => {
    if (!pendingImport) return;
    try {
      // JSON and Markdown hand the store the normalized entries; HTML hands
      // the file text it parses itself — await so status is only shown after
      // completion. skipExisting rides along: unchecked, the store edge keeps
      // entries the library already holds.
      if (pendingImport.type === "html") {
        await onImportHtml(pendingImport.data, replaceAll, skipExisting);
      } else {
        await onImportJson(pendingImport.data, replaceAll, skipExisting);
      }
    } catch {
      showMessage(t("importExport.importFailed"), "error");
    } finally {
      setPendingImport(null);
      setReplaceAll(false);
      setSkipExisting(true);
    }
  };

  const cancelImport = () => {
    setPendingImport(null);
    setReplaceAll(false);
    setSkipExisting(true);
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
      {pendingImport && effectiveImport ? (
        <ImportConfirmCard
          fileName={pendingImport.fileName}
          count={effectiveImport.count}
          skippedCount={effectiveImport.skippedCount}
          duplicateCount={effectiveImport.duplicateCount}
          skipExisting={skipExisting}
          onSkipExistingChange={setSkipExisting}
          replaceAll={replaceAll}
          onReplaceAllChange={setReplaceAll}
          onConfirm={executeImport}
          onCancel={cancelImport}
        />
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
                    {t("importExport.exportJson")}
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
                    {t("importExport.exportHtml")}
                  </a>
                </div>
                <div className="ui-field">
                  <label htmlFor="export-md">{t("importExport.markdownExportLabel")}</label>
                  <textarea
                    id="export-md"
                    readOnly
                    value={markdownExport}
                    className="ui-textarea ui-textarea--mono"
                    rows={8}
                  />
                </div>
                <div>
                  <a
                    href={markdownDataUri}
                    download="bookmarks.md"
                    className="ui-button ui-button--secondary"
                  >
                    <IoIcon path={ICON_PATHS.download} />
                    {t("importExport.exportMarkdown")}
                  </a>
                </div>
              </section>
            </div>
          )}

          {activeTab !== "export" && (
            <ImportPanel
              format={activeTab}
              text={
                activeTab === "import-json"
                  ? importJsonText
                  : activeTab === "import-html"
                    ? importHtmlText
                    : importMarkdownText
              }
              onTextChange={(e) => {
                if (activeTab === "import-json") setImportJsonText(e.target.value);
                else if (activeTab === "import-html") setImportHtmlText(e.target.value);
                else setImportMarkdownText(e.target.value);
              }}
              onImport={
                activeTab === "import-json"
                  ? requestJsonImport
                  : activeTab === "import-html"
                    ? requestHtmlImport
                    : requestMarkdownImport
              }
              isParsing={activeTab === "import-json" && isParsing}
              onFileText={(text, fileName) => {
                if (text === null) return;
                if (activeTab === "import-json") stageJsonImport(text, fileName);
                else if (activeTab === "import-html") stageHtmlImport(text, fileName);
                else stageMarkdownImport(text, fileName);
              }}
              onFileError={() =>
                showMessage(
                  activeTab === "import-json"
                    ? t("importExport.jsonFileError")
                    : activeTab === "import-html"
                      ? t("importExport.htmlFileError")
                      : t("importExport.mdFileError"),
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
