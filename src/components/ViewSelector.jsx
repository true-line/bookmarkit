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

const LABELS = {
  single: "Single column",
  flow: "Flow columns",
  grid: "Grid",
};

const ViewSelector = React.memo(function ViewSelector({ value, onChange }) {
  return (
    <div className="ui-segmented" role="group" aria-label="Bookmark list view">
      {VIEW_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange?.(mode)}
          aria-pressed={mode === value}
          aria-label={`${LABELS[mode]} view`}
        >
          {LABELS[mode]}
        </button>
      ))}
    </div>
  );
});

export default ViewSelector;
