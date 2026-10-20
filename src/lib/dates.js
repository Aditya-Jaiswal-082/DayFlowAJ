import { DAYS, MONTHS } from "./constants.js";

/**
 * Days are keyed "YYYY-MM-DD" in local time.
 * Don't switch to toISOString() — it converts to UTC and can land on the wrong day.
 */
export function keyOf(date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function getTodayKey() {
  return keyOf(new Date());
}

export function parseKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** "Mon, 10 Aug 2026" */
export function formatDate(key) {
  const date = parseKey(key);
  if (Number.isNaN(date.getTime())) return String(key);
  return `${DAYS[date.getDay()]}, ${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "10 Aug" — chart axis labels. */
export function shortLabel(key) {
  const date = parseKey(key);
  if (Number.isNaN(date.getTime())) return String(key);
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]}`;
}

/** Key for n days before today (0 = today). Midnight-normalised so DST can't duplicate a day. */
export function daysAgoKey(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return keyOf(d);
}

/** Last n days, oldest first, ending today. */
export function getPastDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(daysAgoKey(i));
  return out;
}

/** Last n days, oldest first, ending at anchorKey instead of today — lets a
 *  "last 7 days" style stat be computed as of whatever day is being viewed. */
export function getPastDaysEndingAt(anchorKey, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(anchorKey, -i));
  return out;
}

/** Step a day key forward or back (n can be negative). Used by the day navigator. */
export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}

/** 0 (Sun) – 6 (Sat) for a day key. */
export function dayOfWeek(key) {
  return parseKey(key).getDay();
}

/** Saturday or Sunday. */
export function isWeekendKey(key) {
  const dow = dayOfWeek(key);
  return dow === 0 || dow === 6;
}

/** 0 (Sun) – 6 (Sat) for the 1st of a "YYYY-MM" month key. */
export function firstWeekdayOfMonth(monthKey) {
  const [y, m] = String(monthKey).split("-").map(Number);
  return new Date(y, m - 1, 1).getDay();
}

/** Step a "YYYY-MM" month key forward or back (n can be negative). */
export function addMonths(monthKey, n) {
  const [y, m] = String(monthKey).split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}