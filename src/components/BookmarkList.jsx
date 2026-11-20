// ARCH-06, PERF-06: Virtualized bookmark list using react-window FixedSizeList.
// Only renders visible rows, allowing 1000+ bookmarks without DOM bloat.
// #193: A row is as many equal-width cards as the list's width can fit (up to
// five), so the shelf reflows from one column on small screens to five on
// large ones while the virtualizer keeps its row-based arithmetic.
// #198: The view mode selects how that fit math lays out — single column,
// the responsive flow, or the denser grid.
// ARCH-10: Renders contextual empty states depending on loading/search/results state.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VariableSizeList } from "react-window";
import BookmarkCard from "./BookmarkCard.jsx";
import FilterBar from "./FilterBar.jsx";
import EmptyStack from "./effects/EmptyStack.jsx";
import { Button, EmptyState as DesignEmptyState } from "./DesignSystem.jsx";
import { chunkIntoRows, columnsForWidth, rowKeyFor, COLUMN_GAP } from "../utils/listColumns.js";

const ITEM_HEIGHT = 104; // px — initial card-row estimate before measurement
const FILTER_ROW_GAP = 16; // px — mirrors the filter panel's mb-4 spacing
const ROW_GAP = 8; // px — vertical gap under a card row, as the single-column list had

// ARCH-10: Three distinct empty states
function EmptyState({
  isLoading,
  bookmarksTotal,
  searchActive,
  lastAction,
  searchQuery,
  onClear,
  onAddNew,
  onImport,
  effectsEnabled = true,
}) {
  if (isLoading) return null;

  if (bookmarksTotal === 0) {
    return (
      <DesignEmptyState
        icon={<EmptyStack enabled={effectsEnabled} />}
        title="Your shelf is empty."
        description="Add your first bookmark, or import a browser export."
        actions={
          <>
            <Button onClick={onAddNew}>Add New</Button>
            <Button intent="secondary" onClick={onImport}>
              Import
            </Button>
          </>
        }
      />
    );
  }

  if (lastAction) {
    return (
      <DesignEmptyState
        icon={
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        }
        title="No bookmarks match your request."
        actions={
          <Button intent="ghost" onClick={onClear}>
            Clear search
          </Button>
        }
      />
    );
  }

  if (searchActive) {
    return (
      <DesignEmptyState
        icon={
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        }
        title={`No bookmarks match${searchQuery ? ` "${searchQuery}"` : " your search"}.`}
        actions={
          <Button intent="ghost" onClick={onClear}>
            Clear search
          </Button>
        }
      />
    );
  }

  return null;
}

// renderRow is defined outside the component so its reference is always stable.
// react-window uses the children prop as the component *type* via createElement —
// if the function reference changes between clicks React unmounts/remounts the row
// DOM nodes, which causes the browser to lose double-click tracking. By keeping
// renderRow stable and passing all changing state through itemData we avoid this.
function FilterRow({ style, data }) {
  const measureRef = useRef(null);
  const { onFilterHeightChange } = data;

  useEffect(() => {
    const element = measureRef.current;
    if (!element) return;
    const updateHeight = () => onFilterHeightChange(Math.ceil(element.scrollHeight));
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [onFilterHeightChange]);

  return (
    <div style={style} role="presentation">
      <div ref={measureRef} style={{ paddingBottom: FILTER_ROW_GAP }}>
        <FilterBar
          filters={data.filters}
          tagFacets={data.tagFacets}
          onChange={data.onFilterChange}
          onCycleTag={data.onCycleTag}
          onClear={data.onClearFilters}
          summary={data.filterSummary}
          style={{ marginBottom: 0 }}
        />
      </div>
    </div>
  );
}

// #193: A row is `columns` cards in an equal-width grid — the virtualizer's
// unit of measurement is the row, so its height is the tallest card in it.
// Grid stretch keeps the row's cards even, and the full column count (not the
// row's size) keeps a short last row as wide as every other card.
function BookmarkRow({ index, style, data }) {
  const measureRef = useRef(null);
  const {
    rows,
    columns,
    selectedBookmarkId,
    multiSelectedBookmarkIds,
    bookmarksToDelete,
    onBookmarkClick,
    onBookmarkDoubleClick,
    onBookmarkKeyDown,
    onBookmarkDragStart,
    onRowHeightChange,
    remoteFavicons,
  } = data;
  const row = rows[index - 1];
  const key = rowKeyFor(columns, row);

  useEffect(() => {
    const element = measureRef.current;
    if (!element) return;
    const updateHeight = () => onRowHeightChange(index, key, Math.ceil(element.scrollHeight));
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [key, index, onRowHeightChange]);

  return (
    <div style={style}>
      <div ref={measureRef} style={{ paddingBottom: ROW_GAP }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            columnGap: COLUMN_GAP,
          }}
        >
          {row.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              isSelected={selectedBookmarkId === bookmark.id}
              isMultiSelected={multiSelectedBookmarkIds.includes(bookmark.id)}
              isPendingDelete={bookmarksToDelete.includes(bookmark.id)}
              remoteFavicons={remoteFavicons}
              onClick={(e) => onBookmarkClick(bookmark, e)}
              onDoubleClick={(e) => onBookmarkDoubleClick(bookmark, e)}
              onKeyDown={(e) => onBookmarkKeyDown(e, bookmark)}
              onDragStart={onBookmarkDragStart && ((e) => onBookmarkDragStart(e, bookmark))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function renderRow({ index, style, data }) {
  return index === 0 ? (
    <FilterRow style={style} data={data} />
  ) : (
    <BookmarkRow index={index} style={style} data={data} />
  );
}

const VirtualizedListInner = React.forwardRef(function VirtualizedListInner(
  { children, style },
  ref
) {
  const rows = React.Children.toArray(children);
  const filterRow = rows.find((row) => row.props.index === 0);
  const bookmarkRows = rows.filter((row) => row.props.index !== 0);

  return (
    <div ref={ref} style={style}>
      {filterRow}
      <div role="list" aria-label="Bookmarks">
        {bookmarkRows}
      </div>
    </div>
  );
});

const BookmarkList = React.memo(function BookmarkList({
  bookmarks,
  selectedBookmarkId,
  multiSelectedBookmarkIds,
  bookmarksToDelete,
  onBookmarkClick,
  onBookmarkDoubleClick,
  onBookmarkKeyDown,
  onBookmarkDragStart,
  // empty state props
  isLoading,
  bookmarksTotal,
  searchActive,
  lastAction,
  searchQuery,
  onClearSearch,
  onAddNew,
  onImport,
  filters,
  tagFacets,
  onFilterChange,
  onCycleTag,
  onClearFilters,
  filterSummary,
  remoteFavicons,
  effectsEnabled,
  viewMode = "flow",
}) {
  const listRef = useRef(null);
  const containerRef = useRef(null);
  const rowHeightsRef = useRef(new Map());
  const [listHeight, setListHeight] = useState(500);
  const [filterHeight, setFilterHeight] = useState(136);
  // #193: how many cards a row holds, decided by the list's own width and,
  // since #198, by the view mode.
  const [columns, setColumns] = useState(1);
  const bookmarkOrder = useMemo(
    () => bookmarks.map((bookmark) => bookmark.id).join("\u0000"),
    [bookmarks]
  );

  // Measure container height so FixedSizeList fills the available space — and
  // its width, which decides how many columns of cards the shelf can hold.
  // Re-running on a view-mode change re-derives the count from the same width:
  // observing fires once immediately, so a toggle reflows without a resize.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      if (h > 0) setListHeight(h);
      const w = entry.contentRect.width;
      if (w > 0) setColumns(columnsForWidth(w, viewMode));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode]);

  // A reflow re-chunks the bookmarks, so every row re-estimates and re-measures
  // under its new key (rowKeyFor folds the column count into the key).
  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [bookmarkOrder, filterHeight, columns]);

  // #193: the virtualizer's rows are chunks of cards, not single cards.
  const bookmarkRows = useMemo(() => chunkIntoRows(bookmarks, columns), [bookmarks, columns]);

  const handleFilterHeightChange = useCallback((height) => {
    setFilterHeight((current) => (current === height ? current : height));
  }, []);

  const handleRowHeightChange = useCallback((index, key, height) => {
    if (rowHeightsRef.current.get(key) === height) return;
    rowHeightsRef.current.set(key, height);
    listRef.current?.resetAfterIndex(index);
  }, []);

  // Pack all row-level state into itemData so renderRow (stable ref) can read it.
  const itemData = useMemo(
    () => ({
      rows: bookmarkRows,
      columns,
      selectedBookmarkId,
      multiSelectedBookmarkIds,
      bookmarksToDelete,
      onBookmarkClick,
      onBookmarkDoubleClick,
      onBookmarkKeyDown,
      onBookmarkDragStart,
      filters,
      tagFacets,
      onFilterChange,
      onCycleTag,
      onClearFilters,
      filterSummary,
      remoteFavicons,
      onFilterHeightChange: handleFilterHeightChange,
      onRowHeightChange: handleRowHeightChange,
    }),
    [
      bookmarkRows,
      columns,
      selectedBookmarkId,
      multiSelectedBookmarkIds,
      bookmarksToDelete,
      onBookmarkClick,
      onBookmarkDoubleClick,
      onBookmarkKeyDown,
      onBookmarkDragStart,
      filters,
      tagFacets,
      onFilterChange,
      onCycleTag,
      onClearFilters,
      filterSummary,
      remoteFavicons,
      handleFilterHeightChange,
      handleRowHeightChange,
    ]
  );

  if (bookmarks.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <FilterBar
          filters={filters}
          tagFacets={tagFacets}
          onChange={onFilterChange}
          onCycleTag={onCycleTag}
          onClear={onClearFilters}
          summary={filterSummary}
        />
        <EmptyState
          isLoading={isLoading}
          bookmarksTotal={bookmarksTotal}
          searchActive={searchActive}
          lastAction={lastAction}
          searchQuery={searchQuery}
          onClear={onClearSearch}
          onAddNew={onAddNew}
          onImport={onImport}
          effectsEnabled={effectsEnabled}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height: "100%" }}>
      <VariableSizeList
        ref={listRef}
        height={listHeight}
        innerElementType={VirtualizedListInner}
        itemCount={bookmarkRows.length + 1}
        itemSize={(index) =>
          index === 0
            ? filterHeight
            : rowHeightsRef.current.get(rowKeyFor(columns, bookmarkRows[index - 1])) || ITEM_HEIGHT
        }
        itemData={itemData}
        itemKey={(index, data) =>
          index === 0 ? "bookmark-filters" : rowKeyFor(data.columns, data.rows[index - 1])
        }
        width="100%"
        overscanCount={5}
        style={{ overflowX: "hidden" }}
      >
        {renderRow}
      </VariableSizeList>
    </div>
  );
});

export default BookmarkList;
