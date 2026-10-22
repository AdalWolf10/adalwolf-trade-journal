/**
 * @param {string} key
 * @param {number} offset
 */
export function shiftMonthKey(key, offset) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Returns a seven-month window with the selected month in the center.
 *
 * @param {string} selectedMonth
 */
export function buildMonthWindow(selectedMonth) {
  return Array.from({ length: 7 }, (_, index) => shiftMonthKey(selectedMonth, index - 3));
}
