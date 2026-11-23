// #53: Deterministic filter controls — the LLM-free path to filtering/sorting.
// Everything here is local: no network, no provider, no API key. The agent bar is a
// convenience layer on top of these same primitives, not a prerequisite for them.
//
// #250: the design system's vocabulary — the text filter is an input-field-icon
// (40px, leading search icon, clear button on the trailing slot), the selects
// are the tokenized native element (the design system ships no select
// primitive), the toggles wear the mockup's pressed-state reading, and the
// sort direction is button-with-icon. The dark on-container text swaps live in
// index.css beside the app's other chrome compositions.

import React, { useMemo, useState } from "react";
import { SORT_FIELDS, TAG_STATE, getTagState, hasActiveFilters } from "../utils/manualFilters.js";
import { Button, InputField } from "../design-system/index.js";
import { ArrowIcon, SearchIcon } from "./icons.jsx";

const VISIBLE_TAG_LIMIT = 12;

function TagChip({ tag, count, state, onClick }) {
  const states = {
    [TAG_STATE.INCLUDE]: "ui-filter-chip--include",
    [TAG_STATE.EXCLUDE]: "ui-filter-chip--exclude",
    [TAG_STATE.OFF]: "ui-filter-chip--off",
  };
  const hint = {
    [TAG_STATE.INCLUDE]: "including",
    [TAG_STATE.EXCLUDE]: "excluding",
    [TAG_STATE.OFF]: "not filtered",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ui-filter-chip ${states[state]}`}
      // Chips are tri-state, so aria-pressed (binary) would misreport "exclude".
      // Spell the state out for screen readers instead.
      aria-label={`Tag ${tag}, ${count} bookmark${count === 1 ? "" : "s"}, ${hint[state]}. Activate to cycle include, exclude, off.`}
    >
      {state === TAG_STATE.EXCLUDE ? "−" : ""}
      {tag}
      <span className="ui-filter-chip-count">{count}</span>
    </button>
  );
}

// The design system ships no select primitive; the mockup keeps the native
// element and tokens it (the OptionsModal idiom, minus the label these
// controls carry as aria-labels instead).
const FilterSelect = ({ className, ...props }) => (
  <select className={`ui-input ui-filter-select ${className}`} {...props} />
);

const FilterBar = React.memo(function FilterBar({
  filters,
  tagFacets,
  onChange,
  onCycleTag,
  onClear,
  summary,
  style,
}) {
  const [showAllTags, setShowAllTags] = useState(false);

  const visibleTags = useMemo(
    () => (showAllTags ? tagFacets : tagFacets.slice(0, VISIBLE_TAG_LIMIT)),
    [tagFacets, showAllTags]
  );

  const active = hasActiveFilters(filters);
  const hiddenCount = tagFacets.length - visibleTags.length;

  return (
    <div
      className="ui-filter-bar mb-4 p-2"
      style={style}
      role="search"
      aria-label="Filter bookmarks"
    >
      <div className="flex items-center gap-2 flex-wrap">
        {/* The text filter is grouped apart from the discrete controls: below
            40rem it takes a full row and the controls scroll as one strip
            (see the media query in index.css), instead of six wrapped lines. */}
        <div className="ui-filter-text relative flex-1 min-w-[13.75rem]">
          <InputField
            id="filter-text"
            type="text"
            icon={<SearchIcon />}
            value={filters.text}
            onChange={(e) => onChange({ ...filters, text: e.target.value })}
            placeholder="Filter instantly (no AI)…"
            aria-label="Filter bookmarks by text"
            trailing={
              filters.text ? (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, text: "" })}
                  className="ui-filter-clear"
                  aria-label="Clear text filter"
                >
                  ✕
                </button>
              ) : undefined
            }
          />
        </div>

        <div className="ui-filter-controls flex items-center gap-2 flex-wrap">
          <FilterSelect
            id="filter-rating"
            value={filters.minRating}
            onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
            aria-label="Minimum rating"
            className="w-[9.375rem]"
          >
            <option value={0}>Any rating</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {`${"★".repeat(n)}+`}
              </option>
            ))}
          </FilterSelect>

          {/* #47: what the sweep found, as a filter — the status it reads is written
            by the link check, so this stays useful with no LLM and no network. */}
          <Button
            type="button"
            intent={filters.brokenOnly ? "primary" : "outlined"}
            onClick={() => onChange({ ...filters, brokenOnly: !filters.brokenOnly })}
            aria-pressed={Boolean(filters.brokenOnly)}
          >
            Broken only
          </Button>

          {/* #50: the other filter that reads something the app observed rather than
            something a user typed. */}
          <Button
            type="button"
            intent={filters.neverOpened ? "primary" : "outlined"}
            onClick={() => onChange({ ...filters, neverOpened: !filters.neverOpened })}
            aria-pressed={Boolean(filters.neverOpened)}
          >
            Never opened
          </Button>

          {/* #283: the third filter that reads something the app observed —
            saved without a tag. The navigation sidebar's Untagged view sets
            this same flag. */}
          <Button
            type="button"
            intent={filters.untagged ? "primary" : "outlined"}
            onClick={() => onChange({ ...filters, untagged: !filters.untagged })}
            aria-pressed={Boolean(filters.untagged)}
          >
            Untagged
          </Button>

          <FilterSelect
            id="filter-sort"
            value={filters.sortBy}
            onChange={(e) => onChange({ ...filters, sortBy: e.target.value })}
            aria-label="Sort by"
            className="w-[10.625rem]"
          >
            {SORT_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </FilterSelect>

          <Button
            type="button"
            intent="outlined"
            onClick={() =>
              onChange({ ...filters, order: filters.order === "asc" ? "desc" : "asc" })
            }
            disabled={!filters.sortBy}
            leadingIcon={<ArrowIcon up={filters.order === "asc"} />}
            aria-label={`Sort direction: ${filters.order === "asc" ? "ascending" : "descending"}. Activate to reverse.`}
          >
            {filters.order === "asc" ? "Asc" : "Desc"}
          </Button>

          {active && (
            <Button type="button" intent="secondary" onClick={onClear}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {tagFacets.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {visibleTags.map(({ tag, count }) => (
            <TagChip
              key={tag}
              tag={tag}
              count={count}
              state={getTagState(filters, tag)}
              onClick={() => onCycleTag(tag)}
            />
          ))}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllTags(true)}
              className="ui-filter-chip ui-filter-chip--off"
            >
              +{hiddenCount} more
            </button>
          )}
          {showAllTags && tagFacets.length > VISIBLE_TAG_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAllTags(false)}
              className="ui-filter-chip ui-filter-chip--off"
            >
              Show fewer
            </button>
          )}
        </div>
      )}

      {summary && (
        <div className="mt-2 pt-2 border-t border-[var(--ui-outline-variant)] text-sm text-[var(--ui-on-surface-variant)]">
          {summary}
        </div>
      )}
    </div>
  );
});

export default FilterBar;
