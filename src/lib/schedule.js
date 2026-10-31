/**
 * The time manager. It is not a separate list: a regular task may *optionally*
 * carry a time — `{ start, end, days }` with `start`/`end` as minutes since
 * midnight, `end: null` for a single moment, and `days` one of REPEAT_OPTIONS.
 * An `end` at or before `start` means the task runs past midnight. A task with
 * no `start` is "anytime". Lifecycle (createdAt / archivedAt) and completion
 * are the ordinary task ones, so a timed task counts toward the same
 * percentage, streak and Insights as every other.
 *
 * Pure — no React, no storage — so the parser and the status maths are
 * testable in plain Node.
 */

export const DAY_MIN = 1440;

export const REPEAT_OPTIONS = [
  { value: "all", label: "Every day" },
  { value: "weekdays", label: "Weekdays only" },
  { value: "weekends", label: "Weekends only" },
];

export const repeatLabel = (days) => (REPEAT_OPTIONS.find((o) => o.value === days) || REPEAT_OPTIONS[0]).label;
export const repeatValue = (label) => (REPEAT_OPTIONS.find((o) => o.label === label) || REPEAT_OPTIONS[0]).value;

/* ── clock helpers ─────────────────────────────────────────────────────── */

/** "06:30" (an <input type="time"> value) → 390, or null if unreadable. */
export function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 390 → "06:30", for an <input type="time">. */
export function toHHMM(minutes) {
  const m = ((Math.round(minutes) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 390 → "6:30 AM". */
export function formatClock(minutes) {
  const m = ((Math.round(minutes) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  const h24 = Math.floor(m / 60);
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m % 60).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
}

/** 90 → "1h 30m", 45 → "45m", 120 → "2h". */
export function formatDuration(mins) {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r}m`;
  return r ? `${h}h ${r}m` : `${h}h`;
}

/** "6:30 AM – 7:15 AM", or just "6:30 AM" for a single moment. */
export function formatRange(item) {
  return item.end == null ? formatClock(item.start) : `${formatClock(item.start)} – ${formatClock(item.end)}`;
}

/** Minutes a block lasts (0 for a single moment). Wraps past midnight. */
export function spanOf(item) {
  if (item.end == null) return 0;
  return item.end > item.start ? item.end - item.start : item.end + DAY_MIN - item.start;
}

/* ── parsing "6 30 wakeup" / "7 to 9 gym" ──────────────────────────────── */

const TIME_RE = /^(\d{1,2})(?:[:.](\d{2})|\s(\d{2})(?!\d))?(?:\s*(a\.?m\.?|p\.?m\.?)(?![a-z]))?/i;
const SEP_RE = /^\s*(?:to\b|till\b|until\b|[-–—→])\s*/i;

function readTime(s) {
  const m = TIME_RE.exec(s);
  if (!m) return null;
  return {
    h: Number(m[1]),
    min: Number(m[2] ?? m[3] ?? 0),
    mer: m[4] ? (m[4][0].toLowerCase() === "p" ? "pm" : "am") : null,
    length: m[0].length,
  };
}

/**
 * Every clock value a typed time could mean, most likely first. With no
 * am/pm, 1–11 is morning first (afternoon is the alternative), 12 is noon, and
 * 13–23 / 0 are already unambiguous. As the first line of a list, 1–3 reads
 * as afternoon — nobody starts a routine at 2 am.
 */
function candidates({ h, min, mer }, leading) {
  if (min > 59) return null;
  if (mer) {
    if (h < 1 || h > 12) return null;
    return [(h % 12) * 60 + min + (mer === "pm" ? 720 : 0)];
  }
  if (h > 23) return null;
  if (h === 0 || h >= 13) return [h * 60 + min];
  if (h === 12) return [720 + min, min];
  const am = h * 60 + min;
  return leading && h <= 3 ? [am + 720, am] : [am, am + 720];
}

/**
 * Choose am/pm for a line from context: a schedule runs forward through the
 * day, so each start is the earliest reading that isn't before the previous
 * line's start, and an end is the earliest reading after its start. That is
 * how "9 to 11" after "7 to 9" stays morning while "1 to 2" after it becomes
 * the afternoon. If nothing fits the end, the block runs past midnight.
 */
function pickPair(startC, endC, prev) {
  const attempt = (usePrev) => {
    for (const s of startC) {
      if (usePrev && prev != null && s < prev) continue;
      if (!endC) return { start: s, end: null };
      const e = endC.find((c) => c > s);
      if (e != null) return { start: s, end: e };
    }
    return null;
  };
  return attempt(true) || attempt(false) || { start: startC[0], end: endC ? endC[0] : null };
}

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * One block per line, as people actually type them:
 *   "6:30 wake up"   "6 30 wakeup"   "6.30am wake up"
 *   "7 to 9 gym"     "7-9 gym"       "9 - 11:30 prepare"
 * Returns `{ items: [{ start, end, text }], errors: [line, …] }` — a line that
 * can't be read is reported rather than guessed at. With `allowUntimed`, a line
 * that doesn't begin with a number becomes an anytime task (`start: null`).
 */
export function parseScheduleText(text, { allowUntimed = false } = {}) {
  const items = [];
  const errors = [];
  let prev = null;

  String(text || "").split(/\r?\n/).forEach((raw) => {
    const line = raw.trim().replace(/^[-*•]\s+/, "");
    if (!line) return;

    const a = readTime(line);
    if (!a) {
      if (allowUntimed) items.push({ start: null, end: null, text: capitalise(line) });
      else errors.push(raw.trim());
      return;
    }

    let rest = line.slice(a.length);
    let b = null;
    const sep = SEP_RE.exec(rest);
    if (sep) {
      const afterSep = rest.slice(sep[0].length);
      b = readTime(afterSep);
      if (b) rest = afterSep.slice(b.length);
    }

    const name = rest.replace(/^[\s:–—-]+/, "").trim();
    const startC = candidates(a, prev == null);
    const endC = b ? candidates(b, false) : null;
    if (!name || !startC || (b && !endC)) { errors.push(raw.trim()); return; }

    const { start, end } = pickPair(startC, endC, prev);
    items.push({ start, end: end === start ? null : end, text: capitalise(name) });
    prev = start;
  });

  return { items, errors };
}

/* ── a day's timeline ──────────────────────────────────────────────────── */

/** True when a task has a time of day (otherwise it is "anytime"). */
export function isTimed(task) {
  return Number.isFinite(task?.start);
}

/** A day's tasks split into the timeline (sorted by clock) and the anytime list (order kept). */
export function splitTimed(dayTasks) {
  return {
    timed: sortSchedule(dayTasks.filter(isTimed)),
    anytime: dayTasks.filter((t) => !isTimed(t)),
  };
}

export function sortSchedule(items) {
  return [...items].sort((a, b) => a.start - b.start || (a.end ?? a.start) - (b.end ?? b.start));
}

/**
 * When a block stops counting as "now". A single moment lasts until the next
 * block starts (or half an hour); one that runs past midnight is capped at
 * midnight, since the far side belongs to the next day.
 */
export function effectiveEnd(item, sorted) {
  if (item.end != null) return item.end > item.start ? item.end : DAY_MIN;
  const next = sorted.find((o) => o.start > item.start);
  return next ? next.start : Math.min(item.start + 30, DAY_MIN);
}

/** "done" | "active" | "upcoming" | "missed" for one block on one day. */
export function blockStatus({ item, sorted, nowMin, dayKey, todayKey, done }) {
  if (done) return "done";
  if (dayKey < todayKey) return "missed";
  if (dayKey > todayKey) return "upcoming";
  if (nowMin >= effectiveEnd(item, sorted)) return "missed";
  return nowMin >= item.start ? "active" : "upcoming";
}

/** Done / missed / left counts plus planned vs finished time for a day. */
export function daySummary({ items, checks, dayKey, todayKey, nowMin }) {
  let done = 0;
  let missed = 0;
  let plannedMin = 0;
  let doneMin = 0;
  items.forEach((item) => {
    const status = blockStatus({ item, sorted: items, nowMin, dayKey, todayKey, done: !!checks?.[item.id] });
    const span = spanOf(item);
    plannedMin += span;
    if (status === "done") { done += 1; doneMin += span; }
    else if (status === "missed") missed += 1;
  });
  const total = items.length;
  return {
    total, done, missed, left: total - done - missed,
    pct: total ? Math.round((done / total) * 100) : 0,
    plannedMin, doneMin,
  };
}

/** Open stretches between blocks — a single moment is treated as taking 15 minutes. */
export function freeGaps(sorted, minGap = 30) {
  const gaps = [];
  let cursor = null;
  sorted.forEach((item) => {
    if (cursor != null && item.start - cursor >= minGap) {
      gaps.push({ from: cursor, to: item.start, minutes: item.start - cursor });
    }
    const end = item.end != null && item.end > item.start ? item.end : item.start + 15;
    cursor = cursor == null ? end : Math.max(cursor, end);
  });
  return gaps;
}

/** Ids of timed blocks whose hours collide with another block. */
export function overlappingIds(sorted) {
  const ids = new Set();
  const timed = sorted.filter((i) => i.end != null && i.end > i.start);
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      if (timed[j].start >= timed[i].end) break;
      ids.add(timed[i].id);
      ids.add(timed[j].id);
    }
  }
  return ids;
}
