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
import {
  RATING_OPTIONS,
  SORT_FIELDS,
  TAG_STATE,
  applyRatingPick,
  getTagState,
  hasActiveFilters,
} from "../utils/manualFilters.js";
import { Button, InputField } from "../design-system/index.js";
import { useMessages } from "../i18n/index.js";
import { ArrowIcon, SearchIcon } from "./icons.jsx";

const VISIBLE_TAG_LIMIT = 12;

// Enumerated tri-state hint: one literal key per state, never a built key string.
const HINT_KEYS = {
  [TAG_STATE.INCLUDE]: "filter.tagHint.include",
  [TAG_STATE.EXCLUDE]: "filter.tagHint.exclude",
  [TAG_STATE.OFF]: "filter.tagHint.off",
};

function TagChip({ tag, count, state, onClick }) {
  const t = useMessages();
  const states = {
    [TAG_STATE.INCLUDE]: "ui-filter-chip--include",
    [TAG_STATE.EXCLUDE]: "ui-filter-chip--exclude",
    [TAG_STATE.OFF]: "ui-filter-chip--off",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ui-filter-chip ${states[state]}`}
      // Chips are tri-state, so aria-pressed (binary) would misreport "exclude".
      // Spell the state out for screen readers instead.
      aria-label={t("filter.tagChip", {
        tag,
        count,
        hint: t(HINT_KEYS[state]),
      })}
    >
      {state === TAG_STATE.EXCLUDE ? "−" : ""}
      {tag}
      <span className="ui-filter-chip-count">{t.count(count)}</span>
    </button>
  );
}

// The design system ships no select primitive; the mockup keeps the native
// element and tokens it (the OptionsModal idiom, minus the label these
// controls carry as aria-labels instead).
const FilterSelect = ({ className, ...props }) => (
  <select className={`ui-input ui-filter-select ${className}`} {...props} />
);

// The rating filter (#53) and the sort pair — field and direction (#49) — as
// their own pieces: the shell's compact row repeats the rating control below
// `lg` (#299), and pulling them out of FilterBar keeps the bar's function
// budget for the composition rather than for two selects.
const RatingSelect = ({ filters, onChange }) => {
  const t = useMessages();
  return (
    <FilterSelect
      id="filter-rating"
      value={filters.unratedOnly ? "unrated" : filters.minRating}
      onChange={(e) => onChange(applyRatingPick(filters, e.target.value))}
      aria-label={t("filter.minRating")}
      className="ui-filter-select--rating"
    >
      {/* #286: the option ladder is shared with the shell's compact row, so
          the two controls cannot drift. */}
      {RATING_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.labelKey ? t(option.labelKey) : option.label}
        </option>
      ))}
    </FilterSelect>
  );
};

const SortControls = ({ filters, onChange }) => {
  const t = useMessages();
  return (
    <>
      <FilterSelect
        id="filter-sort"
        value={filters.sortBy}
        onChange={(e) => onChange({ ...filters, sortBy: e.target.value })}
        aria-label={t("filter.sortBy")}
        className="ui-filter-select--sort"
      >
        {SORT_FIELDS.map((field) => (
          <option key={field.value} value={field.value}>
            {t(field.labelKey)}
          </option>
        ))}
      </FilterSelect>

      <Button
        type="button"
        intent="outlined"
        onClick={() => onChange({ ...filters, order: filters.order === "asc" ? "desc" : "asc" })}
        disabled={!filters.sortBy}
        leadingIcon={<ArrowIcon up={filters.order === "asc"} />}
        aria-label={t(
          filters.order === "asc" ? "filter.sortDirectionAsc" : "filter.sortDirectionDesc"
        )}
      >
        {filters.order === "asc" ? t("filter.asc") : t("filter.desc")}
      </Button>
    </>
  );
};

const FilterBar = React.memo(function FilterBar({
  filters,
  tagFacets,
  onChange,
  onCycleTag,
  onClear,
  summary,
  style,
  // #299: below `lg` the shell's compact row owns rating and sort, so this
  // bar hides its own rather than offering the same control twice on screen.
  showSortControls = true,
}) {
  const t = useMessages();
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
      aria-label={t("filter.barLabel")}
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
            placeholder={t("filter.textPlaceholder")}
            aria-label={t("filter.textAria")}
            trailing={
              filters.text ? (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, text: "" })}
                  className="ui-filter-clear"
                  aria-label={t("filter.clearText")}
                >
                  ✕
                </button>
              ) : undefined
            }
          />
        </div>

        <div className="ui-filter-controls flex items-center gap-2 flex-wrap">
          {showSortControls && <RatingSelect filters={filters} onChange={onChange} />}

          {/* #47: what the sweep found, as a filter — the status it reads is written
            by the link check, so this stays useful with no LLM and no network. */}
          <Button
            type="button"
            intent={filters.brokenOnly ? "primary" : "outlined"}
            onClick={() => onChange({ ...filters, brokenOnly: !filters.brokenOnly })}
            aria-pressed={Boolean(filters.brokenOnly)}
          >
            {t("filter.brokenOnly")}
          </Button>

          {/* #50: the other filter that reads something the app observed rather than
            something a user typed. */}
          <Button
            type="button"
            intent={filters.neverOpened ? "primary" : "outlined"}
            onClick={() => onChange({ ...filters, neverOpened: !filters.neverOpened })}
            aria-pressed={Boolean(filters.neverOpened)}
          >
            {t("filter.neverOpened")}
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
            {t("filter.untagged")}
          </Button>

          {showSortControls && <SortControls filters={filters} onChange={onChange} />}

          {active && (
            <Button type="button" intent="secondary" onClick={onClear}>
              {t("filter.clear")}
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
              {t("filter.moreTags", { count: hiddenCount })}
            </button>
          )}
          {showAllTags && tagFacets.length > VISIBLE_TAG_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAllTags(false)}
              className="ui-filter-chip ui-filter-chip--off"
            >
              {t("filter.showFewer")}
            </button>
          )}
        </div>
      )}

      {summary && (
        // #286: the mockup's live count — the summary announces its changes
        // (role="status" is polite by definition; spelled out beside it) and
        // the digits wear the tabular reading.
        <div
          role="status"
          aria-live="polite"
          className="ui-numeric mt-2 pt-2 border-t border-[var(--ui-outline-variant)] text-sm text-[var(--ui-on-surface-variant)]"
        >
          {summary}
        </div>
      )}
    </div>
  );
});

export default FilterBar;
