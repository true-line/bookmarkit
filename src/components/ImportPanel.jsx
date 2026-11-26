import React, { useState } from "react";
import { Button, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";

// The import side of the import/export panel (#247): one body shared by the
// JSON, Netscape HTML and Markdown tabs (#287), which differ only in strings
// and accept list. The mockup's dashed drop zone is the file input's label, so
// click and keyboard both open the picker while the input keeps its own
// accessible name, and dragover/drop make the advertised dropping real — a
// dropped file runs through the same reader and staging path as a picked one.
// The paste field follows. File text, its name (the confirmation names the
// chosen file), and read errors come back through onFileText/onFileError —
// parsing and staging belong to the parent, because JSON validates
// asynchronously before confirming while HTML and Markdown do not.

/**
 * #25: Read the chosen file and clear the input. Without the reset the browser
 * fires no change event when the same file is picked again, so a failed import
 * could not be retried without picking a different file first.
 * @returns {Promise<string|null>} the file's text, or null if nothing was chosen
 */
const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("The file could not be read."));
    reader.readAsText(file);
  });

const readChosenFile = (event) => {
  const [file] = event.target.files;
  event.target.value = "";
  if (!file) {
    return Promise.resolve(null);
  }
  return readFile(file).then((text) => ({ text, name: file.name }));
};

// The three tabs differ only in strings and accept list; the visible strings
// are catalogue keys resolved with t() at render time, while the placeholders
// stay literal — they quote the expected data format, not UI copy.
const IMPORT_FORMATS = {
  "import-json": {
    accept: ".json",
    fileLabel: "importExport.uploadJsonFile",
    dropTitle: "importExport.dropJson",
    intro: "importExport.introJson",
    pasteLabel: "importExport.pasteJson",
    placeholder: '[{"title": "Example", "url": "https://example.com", "tags": ["test"]}]',
    action: "importExport.actionJson",
  },
  "import-html": {
    accept: ".html,.htm",
    fileLabel: "importExport.uploadHtmlFile",
    dropTitle: "importExport.dropHtml",
    intro: "importExport.introHtml",
    pasteLabel: "importExport.pasteHtml",
    placeholder: "<!DOCTYPE NETSCAPE-Bookmark-file-1>...",
    action: "importExport.actionHtml",
  },
  "import-markdown": {
    accept: ".md,.markdown",
    fileLabel: "importExport.uploadMdFile",
    dropTitle: "importExport.dropMd",
    intro: "importExport.introMd",
    pasteLabel: "importExport.pasteMd",
    placeholder: "- [Example](https://example.com)",
    action: "importExport.actionMarkdown",
  },
};

// The mockup's upload glyph at its 28px reading, in the primary role.
const ICON_UPLOAD = "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12l-4 4m4-4l4 4";

const mutedText = { margin: 0, color: "var(--ui-on-surface-variant)" };

export function ImportPanel({
  format,
  text,
  onTextChange,
  onImport,
  isParsing,
  onFileText,
  onFileError,
}) {
  const t = useMessages();
  const spec = IMPORT_FORMATS[format];
  const short = format.replace(/^import-/, "");
  const [dragging, setDragging] = useState(false);
  return (
    <div role="tabpanel" id={`io-panel-${format}`} aria-labelledby={`io-tab-${format}`}>
      <section aria-labelledby={`io-${format}-heading`} className="grid gap-3">
        <Typography variant="body-sm" as="p" style={mutedText}>
          {t(spec.intro)}
        </Typography>
        <label
          className={`ui-dropzone${dragging ? " ui-dropzone--dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setDragging(false);
            const [file] = e.dataTransfer.files;
            if (!file) return;
            try {
              onFileText(await readFile(file), file.name);
            } catch {
              onFileError();
            }
          }}
        >
          <input
            id={`upload-${short}-file`}
            type="file"
            accept={spec.accept}
            aria-label={t(spec.fileLabel)}
            className="sr-only"
            onChange={async (e) => {
              try {
                const chosen = await readChosenFile(e);
                onFileText(chosen ? chosen.text : null, chosen?.name);
              } catch {
                onFileError();
              }
            }}
          />
          <svg
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{ color: "var(--ui-primary)" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICON_UPLOAD} />
          </svg>
          <Typography variant="label-md" as="span" style={{ color: "var(--ui-on-surface)" }}>
            {t(spec.dropTitle)}
          </Typography>
          <Typography variant="body-sm" as="span">
            {t("importExport.dropHint")}
          </Typography>
        </label>
        <Typography variant="body-sm" as="p" className="text-center" style={mutedText}>
          {t("importExport.orSeparator")}
        </Typography>
        <div className="ui-field">
          <label htmlFor={`import-${short}-text`}>{t(spec.pasteLabel)}</label>
          <textarea
            id={`import-${short}-text`}
            value={text}
            onChange={onTextChange}
            className="ui-textarea ui-textarea--mono"
            rows={8}
            placeholder={spec.placeholder}
          />
        </div>
        <div>
          <Button onClick={onImport} disabled={isParsing || !text.trim()} loading={isParsing}>
            {isParsing ? t("importExport.parsing") : t(spec.action)}
          </Button>
        </div>
      </section>
    </div>
  );
}
