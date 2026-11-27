import React from "react";
import { Button, Modal, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
// #292: the mockup's footer — the version/license line and the Privacy
// Policy and Licenses links, targets shared with the options' About section.
import { APP_LICENSE, APP_VERSION, LICENSES_URL, PRIVACY_POLICY_URL } from "../version.js";

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

// The example commands are visible copy, so each carries a catalogue key;
// one literal key per command, resolved with t() at render time.
const EXAMPLE_COMMAND_KEYS = [
  "help.commandOptions",
  "help.commandFindGithub",
  "help.commandFindTags",
  "help.commandShowStars",
  "help.commandFilterRating",
  "help.commandRemoveDuplicates",
];

// One row per action, in the order the old prose presented them. Keys render
// as ui-kbd caps; the labels carry the nuances the mockup's terse rows leave
// out, so nothing the copy used to state is lost — including the two-stage
// gestures: repeating the selection opens the bookmark, which is a keyboard
// user's only documented way to open one. Labels are catalogue keys resolved
// at render; the keycap names themselves stay literal. The agent bar's summon
// leads (#340): it is the surface the search section above describes.
const SHORTCUTS = [
  { labelKey: "help.shortcutAgentBar", keys: ["Cmd/Ctrl+K"] },
  { labelKey: "help.shortcutSelect", keys: ["Click"] },
  { labelKey: "help.shortcutOpenNewTab", keys: ["Double-click"] },
  { labelKey: "help.shortcutOpenSelected", keys: ["Click again", "Enter", "Space"] },
  { labelKey: "help.shortcutMultiSelect", keys: ["Cmd/Ctrl+Click"] },
  { labelKey: "help.shortcutEditingModal", keys: ["Shift+Click", "Shift+Enter"] },
  { labelKey: "help.shortcutEditSelected", keys: ["E"] },
  { labelKey: "help.shortcutUndo", keys: ["Cmd/Ctrl+Z"] },
  { labelKey: "help.shortcutSelectAll", keys: ["Cmd/Ctrl+A"] },
  {
    labelKey: "help.shortcutDelete",
    keys: ["D", "Cmd/Ctrl+D", "Cmd/Ctrl+Backspace", "Cmd/Ctrl+Delete"],
  },
  { labelKey: "help.shortcutsClear", keys: ["Esc"] },
];

const headingStyle = { margin: 0, color: "var(--ui-on-surface)" };
const sectionGap = { display: "grid", gap: "10px" };
const sectionDivided = {
  ...sectionGap,
  borderTop: "1px solid var(--ui-outline-variant)",
  paddingTop: "20px",
};

const HelpModal = ({ onClose }) => {
  const t = useMessages();
  return (
    <Modal
      title={t("help.title")}
      closeLabel={t("help.closeLabel")}
      onClose={onClose}
      size="2xl"
      footer={
        <>
          {/* #292: the mockup's legal row — version and license in the mono
              style, then the two links, left of the Got it button. */}
          <div className="ui-legal-row">
            <span className="ui-url ui-legal-version" dir="ltr">
              v{APP_VERSION} · {APP_LICENSE}
            </span>
            <span aria-hidden="true">·</span>
            <a className="ui-legal-link" href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer">
              {t("help.privacyPolicy")}
            </a>
            <span aria-hidden="true">·</span>
            <a className="ui-legal-link" href={LICENSES_URL} target="_blank" rel="noreferrer">
              {t("help.licenses")}
            </a>
          </div>
          <Button onClick={onClose}>{t("help.gotIt")}</Button>
        </>
      }
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
            {t("help.searchHeading")}
          </Typography>
          <Typography variant="body-md" style={{ margin: 0 }}>
            {t("help.searchBody")}
          </Typography>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--ui-space-gutter-sm)" }}>
            {EXAMPLE_COMMAND_KEYS.map((commandKey) => (
              <span key={commandKey} className="ui-command-chip">
                {t(commandKey)}
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
            {t("help.shortcutsHeading")}
          </Typography>
          <div className="ui-shortcut-grid">
            {SHORTCUTS.map(({ labelKey, keys }) => (
              <div key={labelKey} className="ui-shortcut-row">
                <Typography variant="body-sm" as="span">
                  {t(labelKey)}
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
            {t("help.tipsHeading")}
          </Typography>
          <ul
            style={{
              margin: 0,
              paddingInlineStart: "20px",
              display: "grid",
              gap: "4px",
            }}
          >
            <li>{t.rich("help.tipsDuplicates")}</li>
            <li>{t.rich("help.tipsImportExport")}</li>
          </ul>
        </section>
      </div>
    </Modal>
  );
};

export default React.memo(HelpModal);
