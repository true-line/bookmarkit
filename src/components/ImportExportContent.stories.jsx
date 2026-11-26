import ImportExportContent from "./ImportExportContent.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";

// The migrated import/export panel (#247): the modal-standard dialog with the
// mockup's divided header, format tabs and dashed drop zone. The UiScope
// decorator renders it under the same [data-ui-theme] root the app stamps,
// so the UI theme and direction toolbars drive the light / dark / RTL
// screenshots. Stories switch tabs through the initialTab prop; the
// confirmation state is reached by staging a real import in the app.
const noop = () => undefined;

const SAMPLE_BOOKMARKS = [
  {
    id: "1",
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org/",
    tags: ["docs", "web"],
    rating: 5,
  },
  {
    id: "2",
    title: "React — Designing with tokens",
    url: "https://react.dev/learn",
    tags: ["react"],
    rating: 4,
  },
  {
    id: "3",
    title: "Netscape Bookmark File Format",
    url: "https://msdn.microsoft.com/en-us/library/ie/aa753582(v=vs.85).aspx",
    tags: ["format"],
    rating: 0,
  },
];

const meta = {
  title: "BookmarkIt/Dialogs/ImportExport",
  component: ImportExportContent,
  decorators: [UiScope],
  parameters: { layout: "fullscreen" },
  args: {
    bookmarks: SAMPLE_BOOKMARKS,
    onClose: noop,
    onImportJson: noop,
    onImportHtml: noop,
    showMessage: noop,
  },
};

export default meta;

export const Export = {};

export const ImportJson = {
  args: { initialTab: "import-json" },
};

export const ImportHtml = {
  args: { initialTab: "import-html" },
};

export const ImportMarkdown = {
  args: { initialTab: "import-markdown" },
};
