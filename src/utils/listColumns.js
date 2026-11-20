// #193: Fit-based responsive columns for the virtualized bookmark list. The
// list measures its own width and shows as many equal-width columns of cards
// as fit, so the shelf fills large monitors instead of stretching one card.

// A card narrower than this stops earning the horizontal space it takes; below
// the two-card footprint the row is one full-width card, as the list always was.
export const MIN_CARD_WIDTH = 520;
// Five even shelves is the ceiling — past it the list centers instead of
// stretching cards across a 4K viewport.
export const MAX_COLUMNS = 5;
// Gutter between the cards of a row, so a card is never counted without the
// space beside it. Vertical rhythm stays the row's paddingBottom.
export const COLUMN_GAP = 16;

/**
 * How many equal columns fit `width` px of list. Each card needs
 * MIN_CARD_WIDTH and every gutter between cards COLUMN_GAP, so the answer is
 * capped by both the fit and MAX_COLUMNS, and never below one.
 */
export function columnsForWidth(width) {
  if (!Number.isFinite(width) || width <= 0) return 1;
  const fit = Math.floor((width + COLUMN_GAP) / (MIN_CARD_WIDTH + COLUMN_GAP));
  return Math.max(1, Math.min(MAX_COLUMNS, fit));
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
