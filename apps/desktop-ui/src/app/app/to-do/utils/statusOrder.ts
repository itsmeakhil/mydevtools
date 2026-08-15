/**
 * Position of a card within its board column.
 *
 * Cards are spaced `ORDER_STEP` apart so that dropping one between two neighbours is a
 * single PATCH of the moved card instead of a renumber of the whole column. When the gap
 * between two neighbours is used up, the column is respread — see `needsRespread`.
 *
 * Integers only: the Rust handler reads `statusOrder` with `as_i64` inside a `filter_map`,
 * so a fractional value is silently skipped when it computes the next order on create.
 */
export const ORDER_STEP = 1000;

/**
 * The `statusOrder` for a card inserted at `index` of a column whose existing cards have
 * `orders` (ascending, excluding the card being moved).
 */
export function insertOrder(orders: number[], index: number): number {
  const at = Math.max(0, Math.min(index, orders.length));
  const prev = orders[at - 1];
  const next = orders[at];

  if (prev === undefined && next === undefined) return 0;
  if (prev === undefined) return next - ORDER_STEP;
  if (next === undefined) return prev + ORDER_STEP;
  return Math.floor((prev + next) / 2);
}

/**
 * True when `insertOrder` could not find room between the neighbours, so the column has to
 * be respread at even intervals before the position is meaningful.
 */
export function needsRespread(orders: number[], index: number, order: number): boolean {
  const at = Math.max(0, Math.min(index, orders.length));
  const prev = orders[at - 1];
  return prev !== undefined && order <= prev;
}
