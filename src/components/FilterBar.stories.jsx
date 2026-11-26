import FilterBar from "./FilterBar.jsx";
import { UiScope } from "../design-system/story-decorator.jsx";
import { EMPTY_FILTERS } from "../utils/manualFilters.js";

// The filter bar is migrated to the unified design system (#250), so its
// stories render under the same [data-ui-theme] scope root the app gets from
// the theme bridge. Flip the UI theme and Direction toolbars for the light,
// dark and RTL checks. The stories pin the bar's three readings: at rest, a
// working filter set with its tri-state tag chips and summary line, and the
// shell's compact reading below `lg` (#299) where rating and sort move into
// the shell's own row.

const noop = () => undefined;

const tagFacets = [
  { tag: "docs", count: 12 },
  { tag: "rust", count: 7 },
  { tag: "terminal", count: 5 },
  { tag: "cooking", count: 4 },
  { tag: "llm", count: 3 },
];

const meta = {
  title: "BookmarkIt/Application/Filter bar",
  component: FilterBar,
  decorators: [UiScope],
  parameters: { layout: "fullscreen" },
  args: {
    tagFacets,
    onChange: noop,
    onCycleTag: noop,
    onClear: noop,
  },
};

export default meta;

export const AtRest = {
  args: { filters: EMPTY_FILTERS },
};

export const WorkingFilters = {
  args: {
    filters: {
      ...EMPTY_FILTERS,
      text: "rust",
      includeTags: ["rust"],
      excludeTags: ["cooking"],
      minRating: 4,
      sortBy: "title",
    },
    summary: "3 of 42 bookmarks match",
  },
};

export const CompactShellRow = {
  args: {
    filters: { ...EMPTY_FILTERS, text: "docs", untagged: true },
    showSortControls: false,
  },
};
