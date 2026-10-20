import { CURRENCY } from "./constants.js";

/** NaN-safe: money(undefined) → "₹0". */
export function money(n) {
  const v = Number(n) || 0;
  return CURRENCY.symbol + v.toLocaleString(CURRENCY.locale, { maximumFractionDigits: 2 });
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number(n) || 0));
}

export function sumBy(rows, field = "amount") {
  return rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);
}
