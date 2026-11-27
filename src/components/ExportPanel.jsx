// The export tab as its own panel — the twin of ImportPanel.jsx for the read
// direction, and the mirror composition: three readonly previews, each with
// its download link (primary JSON, tonal secondary for HTML and Markdown,
// per the mockup's recipes). Extracted from ImportExportContent.jsx for
// #293: that file gained the narrow sheet twin and sat at the lint's line
// ceiling, so the export body moved out the way the import body already
// had. UX-03's memoization moves with it and improves: the serializations
// now compute only while the export tab is mounted, not on every panel
// render. The download anchors wear the ui-button recipe directly —
// download needs the anchor's native attribute, which the Button component
// (a real <button>) cannot carry.

import React, { useMemo } from "react";
import { generateNetscapeHtml } from "../utils/netscapeBookmarks.js";
import { generateMarkdownLinks } from "../utils/markdownBookmarks.js";
import { Tag, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";

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

const ExportPanel = ({ bookmarks }) => {
  const t = useMessages();

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

  return (
    <div role="tabpanel" id="io-panel-export" aria-labelledby="io-tab-export">
      <section aria-labelledby="io-export-heading" className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <Typography variant="headline-sm" as="h3" id="io-export-heading" style={{ margin: 0 }}>
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
        <div>
          <a href={jsonDataUri} download="bookmarks.json" className="ui-button ui-button--primary">
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
  );
};

export default ExportPanel;
