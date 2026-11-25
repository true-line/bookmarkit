// #299: the mobile manager's compact filter row (design/mockups
// /bookmarkit_mobile_manager/code.html 205–226): the rating filter, the date
// quick sort, and the select-mode toggle in one row under the search bar.
// Below `lg` it owns rating and sort — the list's FilterBar hides its own
// (showSortControls={false}) so no control is on screen twice. Select mode
// is the touch path into the multi-selection (useBookmarkSelection); what
// acts on that selection lives in the bar SelectionBar pins to the bottom.

import React from "react";
import { keepsSelectionProps } from "../hooks/useBookmarkSelection.js";
import { Button } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import { RATING_VALUES } from "../utils/manualFilters.js";
import { SelectionIcon, SortIcon } from "./icons.jsx";

const MobileFilterRow = React.memo(function MobileFilterRow({
  filters,
  onChange,
  selectMode = false,
  selectedCount = 0,
  onToggleSelectMode,
}) {
  const t = useMessages();
  // "Newest" is the date sort reading descending. Off the date sort, the
  // button is the switch to it, so it reads "Newest" as the press's promise.
  const dateSorted = filters.sortBy === "createdAt";
  const newest = dateSorted && filters.order !== "asc";

  const quickSort = () =>
    onChange(
      dateSorted
        ? { ...filters, order: newest ? "asc" : "desc" }
        : { ...filters, sortBy: "createdAt", order: "desc" }
    );

  return (
    <div className="ui-shell-filter-row">
      <select
        id="shell-rating"
        className="ui-input ui-filter-select ui-filter-select--rating"
        value={filters.minRating}
        onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
        aria-label={t("filter.minRating")}
      >
        <option value={0}>{t("filter.anyRating")}</option>
        {RATING_VALUES.map((n) => (
          <option key={n} value={n}>
            {`${"★".repeat(n)}+`}
          </option>
        ))}
      </select>

      <Button
        type="button"
        intent="outlined"
        onClick={quickSort}
        leadingIcon={<SortIcon />}
        aria-label={t(
          !dateSorted ? "shell.switchToDateAria" : newest ? "shell.newestAria" : "shell.oldestAria"
        )}
      >
        {dateSorted && !newest ? t("shell.oldest") : t("shell.newest")}
      </Button>

      {/* Clicking it must not dismiss the selection its count is about. */}
      <Button
        type="button"
        intent={selectMode ? "primary" : "outlined"}
        onClick={onToggleSelectMode}
        leadingIcon={<SelectionIcon size={16} />}
        aria-pressed={selectMode}
        aria-label={t("shell.selectModeAria")}
        className="ui-shell-select-mode"
        {...keepsSelectionProps}
      >
        <span className="ui-shell-select-mode-count">
          {selectedCount > 0 ? selectedCount : t("shell.selectMode")}
        </span>
      </Button>
    </div>
  );
});

export default MobileFilterRow;
