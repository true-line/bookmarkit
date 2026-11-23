// #198: Chooses how the bookmark list lays out — one card per row, the
// responsive flow of columns (#193), or the denser grid. A pressed-state
// group in the header strip, following the FilterBar toggle idiom.
//
// #250: the mockup's segmented view-mode control — a bordered container on
// surface-container whose buttons carry the pressed state with aria-pressed
// (the dark on-container text swap lives in index.css beside the app's other
// chrome compositions).

import React from "react";
import { VIEW_MODES } from "../utils/listView.js";
import { useMessages } from "../i18n/index.js";

// One literal key per mode, resolved at render time — never a built key string.
const LABEL_KEYS = {
  single: "viewSelector.single",
  flow: "viewSelector.flow",
  grid: "viewSelector.grid",
};

const ViewSelector = React.memo(function ViewSelector({ value, onChange }) {
  const t = useMessages();
  return (
    <div className="ui-segmented" role="group" aria-label={t("viewSelector.groupLabel")}>
      {VIEW_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange?.(mode)}
          aria-pressed={mode === value}
          aria-label={t("viewSelector.modeAria", { label: t(LABEL_KEYS[mode]) })}
        >
          {t(LABEL_KEYS[mode])}
        </button>
      ))}
    </div>
  );
});

export default ViewSelector;
