// #193: Fit-based responsive columns for the virtualized bookmark list. The
// list measures its own width and shows as many equal-width columns of cards
// as fit, so the shelf fills large monitors instead of stretching one card.
// #198: The view modes share this one fit engine — a mode only changes how
// wide a card must be and how many columns are allowed.

// A card narrower than this stops earning the horizontal space it takes; below
// the two-card footprint the row is one full-width card, as the list always was.
export const MIN_CARD_WIDTH = 520;
// Five even shelves is the ceiling — past it the list centers instead of
// stretching cards across a 4K viewport.
export const MAX_COLUMNS = 5;
// Gutter between the cards of a row, so a card is never counted without the
// space beside it. Vertical rhythm stays the row's paddingBottom.
export const COLUMN_GAP = 16;
// #198: The grid view lays the same cards out denser — a smaller minimum
// footprint and a higher ceiling — so it reads as many small tiles.
export const GRID_MIN_CARD_WIDTH = 280;
export const GRID_MAX_COLUMNS = 8;
// #294: a phone-width list is one column in every mode. Below 40rem the mobile
// manager's feed is single-column; the grid's small tiles would otherwise
// squeeze two into the width a phone has. The list is the viewport's width.
export const SINGLE_COLUMN_MAX_WIDTH = 640; // 40rem

/**
 * How many equal columns fit `width` px of list in `mode`. "single" is always
 * one full-width row; "flow" (the default, the #193 behavior) and "grid" fit
 * whole cards — each needing the mode's minimum width and every gutter
 * between them COLUMN_GAP — capped by the mode's ceiling, never below one.
 */
export function columnsForWidth(width, mode = "flow") {
  if (mode === "single") return 1;
  if (width < SINGLE_COLUMN_MAX_WIDTH) return 1;
  const minCardWidth = mode === "grid" ? GRID_MIN_CARD_WIDTH : MIN_CARD_WIDTH;
  const maxColumns = mode === "grid" ? GRID_MAX_COLUMNS : MAX_COLUMNS;
  if (!Number.isFinite(width) || width <= 0) return 1;
  const fit = Math.floor((width + COLUMN_GAP) / (minCardWidth + COLUMN_GAP));
  return Math.max(1, Math.min(maxColumns, fit));
}

/**
 * Consecutive rows of at most `columns` items, in order — the virtualizer's
 * unit of work: one row renders its cards side by side and measures as one.
 */
export function chunkIntoRows(items, columns) {
  const rows = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }
  return rows;
}

/**
 * A measured row height belongs to its content and its column count together:
 * the same first card measures differently at two and three across. Keying by
 * both means a reflow never reads a height from the previous layout.
 */
export function rowKeyFor(columns, row) {
  return `${columns}:${row[0].id}`;
}
