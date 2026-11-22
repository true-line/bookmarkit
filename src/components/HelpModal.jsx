import React from "react";
import { Button, Modal, Typography } from "../design-system/index.js";

// Migrated to the unified design system (#244): the modal-standard shell at
// the help-shortcuts screen's max-w-2xl reading (size="2xl"), the same
// screen's shortcut rows, example-command chips and ui-kbd keycaps, and the
// design system's typography throughout. Row content stays the app's real
// bindings — Shift+Enter edits (mirroring Shift+Click) and Cmd/Ctrl+Z undoes
// the last write — so nothing is documented here that the app does not do.
//
// PERF-05: React.memo to skip unnecessary re-renders. Focus trap, Escape,
// and focus restoration come from the design-system Modal (#27), including
// the 150ms exit animation it closes through.

const EXAMPLE_COMMANDS = [
  '"options"',
  '"find github"',
  '"find tags: react then sort by rating descending"',
  '"show 3 stars or more"',
  '"filter rating >= 4 then sort by title asc"',
  '"remove duplicates"',
];

// One row per action, in the order the old prose presented them. Keys render
// as ui-kbd caps; the labels carry the nuances the mockup's terse rows leave
// out, so nothing the copy used to state is lost — including the two-stage
// gestures: repeating the selection opens the bookmark, which is a keyboard
// user's only documented way to open one.
const SHORTCUTS = [
  { label: "Select a bookmark", keys: ["Click"] },
  { label: "Open in a new tab", keys: ["Double-click"] },
  { label: "Open the selected bookmark", keys: ["Click again", "Enter", "Space"] },
  { label: "Toggle multi-select", keys: ["Cmd/Ctrl+Click"] },
  { label: "Open the editing modal", keys: ["Shift+Click", "Shift+Enter"] },
  { label: "Edit selected bookmark", keys: ["E"] },
  { label: "Undo last change", keys: ["Cmd/Ctrl+Z"] },
  { label: "Select all visible", keys: ["Cmd/Ctrl+A"] },
  {
    label: "Delete selected (asks to confirm)",
    keys: ["D", "Cmd/Ctrl+D", "Cmd/Ctrl+Backspace", "Cmd/Ctrl+Delete"],
  },
  { label: "Clear selection & pending deletes", keys: ["Esc"] },
];

const headingStyle = { margin: 0, color: "var(--ui-on-surface)" };
const sectionGap = { display: "grid", gap: "10px" };
const sectionDivided = {
  ...sectionGap,
  borderTop: "1px solid var(--ui-outline-variant)",
  paddingTop: "20px",
};

const HelpModal = ({ onClose }) => {
  return (
    <Modal
      title="Help & Keyboard Shortcuts"
      closeLabel="Close help"
      onClose={onClose}
      size="2xl"
      footer={<Button onClick={onClose}>Got it</Button>}
    >
      <div
        style={{
          display: "grid",
          gap: "var(--ui-space-gutter-lg)",
          color: "var(--ui-on-surface-variant)",
        }}
      >
        <section style={sectionGap} aria-labelledby="help-search-heading">
          <Typography variant="headline-sm" as="h3" id="help-search-heading" style={headingStyle}>
            Natural Language Search
          </Typography>
          <Typography variant="body-md" style={{ margin: 0 }}>
            The main search bar is powered by an AI agent. When a provider is configured in Options,
            type commands in plain English to find, sort, and manage your bookmarks. For example:
          </Typography>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--ui-space-gutter-sm)" }}>
            {EXAMPLE_COMMANDS.map((command) => (
              <span key={command} className="ui-command-chip">
                {command}
              </span>
            ))}
          </div>
        </section>

        <section style={sectionDivided} aria-labelledby="help-shortcuts-heading">
          <Typography
            variant="headline-sm"
            as="h3"
            id="help-shortcuts-heading"
            style={headingStyle}
          >
            Keyboard Shortcuts
          </Typography>
          <div className="ui-shortcut-grid">
            {SHORTCUTS.map(({ label, keys }) => (
              <div key={label} className="ui-shortcut-row">
                <Typography variant="body-sm" as="span">
                  {label}
                </Typography>
                <span
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px",
                    justifyContent: "flex-end",
                  }}
                >
                  {keys.map((key) => (
                    <kbd key={key} className="ui-kbd">
                      {key}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section style={sectionDivided} aria-labelledby="help-tips-heading">
          <Typography variant="headline-sm" as="h3" id="help-tips-heading" style={headingStyle}>
            Tips
          </Typography>
          <ul
            style={{
              margin: 0,
              paddingInlineStart: "20px",
              display: "grid",
              gap: "4px",
            }}
          >
            <li>
              Use the <strong>Remove Duplicates</strong> button (or type "remove duplicates" into
              the search) to find and delete duplicates by title+URL.
            </li>
            <li>
              <strong>Import/Export</strong> lets you back up or restore bookmarks from JSON/HTML.
            </li>
          </ul>
        </section>
      </div>
    </Modal>
  );
};

export default React.memo(HelpModal);
