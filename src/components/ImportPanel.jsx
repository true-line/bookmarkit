import React from "react";
import { Button, Typography } from "../design-system/index.js";

// The import side of the import/export panel (#247): one body shared by the
// JSON and Netscape HTML tabs, which differ only in strings and accept list.
// The mockup's dashed drop zone is the file input's label, so click and
// keyboard both open the picker while the input keeps its own accessible
// name; the paste field follows. File text and read errors come back through
// onFileText/onFileError — parsing and staging belong to the parent, because
// JSON validates asynchronously before confirming while HTML does not.

/**
 * #25: Read the chosen file and clear the input. Without the reset the browser
 * fires no change event when the same file is picked again, so a failed import
 * could not be retried without picking a different file first.
 * @returns {Promise<string|null>} the file's text, or null if nothing was chosen
 */
const readChosenFile = (event) =>
  new Promise((resolve, reject) => {
    const [file] = event.target.files;
    event.target.value = "";
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("The file could not be read."));
    reader.readAsText(file);
  });

const IMPORT_FORMATS = {
  "import-json": {
    accept: ".json",
    fileLabel: "Upload JSON File",
    dropTitle: "Drop a JSON file here",
    intro: "Paste your JSON bookmarks here or upload a file.",
    pasteLabel: "Paste JSON Data",
    placeholder: '[{"title": "Example", "url": "https://example.com", "tags": ["test"]}]',
    action: "Import JSON Data",
  },
  "import-html": {
    accept: ".html,.htm",
    fileLabel: "Upload HTML File (Browser Export)",
    dropTitle: "Drop a Netscape HTML file here",
    intro: "Upload an HTML bookmark file or paste its content.",
    pasteLabel: "Paste HTML Data",
    placeholder: "<!DOCTYPE NETSCAPE-Bookmark-file-1>...",
    action: "Import HTML Data",
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
  const spec = IMPORT_FORMATS[format];
  const short = format === "import-json" ? "json" : "html";
  return (
    <div role="tabpanel" id={`io-panel-${format}`} aria-labelledby={`io-tab-${format}`}>
      <section aria-labelledby={`io-${format}-heading`} className="grid gap-3">
        <Typography variant="body-sm" as="p" style={mutedText}>
          {spec.intro}
        </Typography>
        <label className="ui-dropzone">
          <input
            id={`upload-${short}-file`}
            type="file"
            accept={spec.accept}
            aria-label={spec.fileLabel}
            className="sr-only"
            onChange={async (e) => {
              try {
                onFileText(await readChosenFile(e));
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
            {spec.dropTitle}
          </Typography>
          <Typography variant="body-sm" as="span">
            Titles and URLs are sanitized on import; folders and tags are preserved.
          </Typography>
        </label>
        <Typography variant="body-sm" as="p" className="text-center" style={mutedText}>
          — OR —
        </Typography>
        <div className="ui-field">
          <label htmlFor={`import-${short}-text`}>{spec.pasteLabel}</label>
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
            {isParsing ? "Parsing…" : spec.action}
          </Button>
        </div>
      </section>
    </div>
  );
}
