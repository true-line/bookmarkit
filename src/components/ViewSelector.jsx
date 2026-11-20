// #198: Chooses how the bookmark list lays out — one card per row, the
// responsive flow of columns (#193), or the denser grid. A pressed-state
// group in the header strip, following the FilterBar toggle idiom.

import React from "react";
import { Button } from "./DesignSystem.jsx";
import { VIEW_MODES } from "../utils/listView.js";

const LABELS = {
  single: "Single column",
  flow: "Flow columns",
  grid: "Grid",
};

const ViewSelector = React.memo(function ViewSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Bookmark list view">
      {VIEW_MODES.map((mode) => (
        <Button
          key={mode}
          type="button"
          size="sm"
          intent={mode === value ? "primary" : "secondary"}
          onClick={() => onChange?.(mode)}
          aria-pressed={mode === value}
          aria-label={`${LABELS[mode]} view`}
        >
          {LABELS[mode]}
        </Button>
      ))}
    </div>
  );
});

export default ViewSelector;
