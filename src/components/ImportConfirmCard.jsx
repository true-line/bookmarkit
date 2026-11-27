import React from "react";
import { Button, Card, Typography } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";

// The import confirmation (#287) — the card the staged import must be
// approved through. Its numbers are the store edge's numbers: `count` is
// what will actually be added (the parent already ran the staged entries
// through the edge's normalized-URL rule when skipExisting is set), and the
// two skip counts name what that rule leaves behind — `skippedCount` for
// entries the library already holds, `duplicateCount` for duplicates the
// file itself carries — so the count you approve is the count that is added.
// Import is disabled when nothing would be added; there is nothing to
// confirm.
//
// The mockup's "Skip URLs already in library" checkbox sits first among the
// choices, checked; under "Replace all" it is retired (disabled) — the
// library is emptied ahead of the import, so there is nothing left to skip
// as already-held, while the file's own duplicates are still named. The file
// import names its chosen file; a pasted import has none to name.

const radioRow = {
  display: "flex",
  alignItems: "center",
  gap: "var(--ui-space-gutter-sm)",
  cursor: "pointer",
};

const mutedText = { color: "var(--ui-on-surface-variant)" };

const ImportConfirmCard = ({
  fileName,
  count,
  skippedCount,
  duplicateCount,
  skipExisting,
  onSkipExistingChange,
  replaceAll,
  onReplaceAllChange,
  onConfirm,
  onCancel,
}) => {
  const t = useMessages();
  return (
    <Card
      actions={
        <>
          <Button intent="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={count === 0}>
            {t("common.import")}
          </Button>
        </>
      }
    >
      <Typography variant="body-md" as="p" style={{ margin: 0 }}>
        {t.rich("importExport.willAdd", { count })}
      </Typography>
      {fileName && (
        <Typography
          variant="body-sm"
          as="p"
          className="ui-numeric"
          style={{ ...mutedText, marginBlockStart: "var(--ui-space-gutter-sm)" }}
        >
          {t("importExport.chosenFile", { name: fileName })}
        </Typography>
      )}
      {skippedCount > 0 && (
        <Typography
          variant="body-sm"
          as="p"
          style={{ ...mutedText, marginBlockStart: "var(--ui-space-gutter-sm)" }}
        >
          {t("importExport.skippedExisting", { count: skippedCount })}
        </Typography>
      )}
      {duplicateCount > 0 && (
        <Typography
          variant="body-sm"
          as="p"
          style={{ ...mutedText, marginBlockStart: "var(--ui-space-gutter-sm)" }}
        >
          {t("importExport.skippedDuplicates", { count: duplicateCount })}
        </Typography>
      )}
      <div
        style={{
          display: "grid",
          gap: "var(--ui-space-gutter-sm)",
          marginBlockStart: "var(--ui-space-gutter-md)",
        }}
      >
        {/* #293: the choice rows are touch targets too — the coarse-pointer
            floor rides the row, as it does on the options rows. */}
        <label style={radioRow} className="ui-settings-row">
          <input
            type="checkbox"
            checked={skipExisting}
            disabled={replaceAll}
            onChange={(event) => onSkipExistingChange(event.target.checked)}
            style={{ accentColor: "var(--ui-primary)" }}
          />
          <Typography variant="body-sm" as="span">
            {t("importExport.skipExistingLabel")}
          </Typography>
        </label>
        {[
          {
            label: t("importExport.appendRadio"),
            checked: !replaceAll,
            set: () => onReplaceAllChange(false),
          },
          {
            label: t("importExport.replaceRadio"),
            checked: replaceAll,
            set: () => onReplaceAllChange(true),
          },
        ].map(({ label, checked, set }) => (
          <label key={label} style={radioRow} className="ui-settings-row">
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
  );
};

export default ImportConfirmCard;
