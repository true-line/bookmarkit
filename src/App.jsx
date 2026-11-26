// ARCH-07: Top-level ErrorBoundary catches any unhandled render errors in BookmarkApp.
// UX-08: Popup size constraints applied when running as a Chrome extension popup.
// #298: LocaleProvider at the app root — the selected interface language and
// its dir stamp the whole document before anything renders under it.

import React from "react";
import "./App.css";
import BookmarkApp from "./components/BookmarkApp.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { LocaleProvider } from "./i18n/LocaleProvider.js";

// UX-08: Detect popup context by checking chrome.extension.getViews or window dimensions.
// Popup windows are constrained by Chrome to a max width of ~800px and height of ~600px.
const isPopup =
  typeof chrome !== "undefined" &&
  chrome.runtime &&
  typeof chrome.extension !== "undefined" &&
  typeof chrome.extension.getViews === "function" &&
  chrome.extension.getViews({ type: "popup" }).some((v) => v === window);

function App() {
  return (
    // UX-08: Apply popup size constraints so the UI fits inside the extension popup window.
    // #289: the design system's scope root wraps every terminal render state —
    // loading, load-error, crash boundary, shell — so the spec typeface and the
    // shared focus contract hold even on the screens that return early.
    <div
      className="ui-root"
      style={isPopup ? { width: 600, minHeight: 400, maxHeight: 580, overflow: "hidden" } : {}}
    >      <LocaleProvider>
        <ErrorBoundary fallbackMessage="BookmarkIt encountered an unexpected error. Please reload.">
          <BookmarkApp />
        </ErrorBoundary>
      </LocaleProvider>
    </div>
  );
}

export default App;
