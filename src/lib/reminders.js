import { MONTHS } from "./constants.js";
import { keyOf, parseKey } from "./dates.js";

/** Scheduling maths for reminders. Pure — no timers, no React. */

const pad = (n) => String(n).padStart(2, "0");

/** "HH:MM" from a timestamp. */
export function timeOf(ms) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Split a timestamp into the two values the date/time inputs need. */
export function splitWhen(ms) {
  return { date: keyOf(new Date(ms)), time: timeOf(ms) };
}

/** Combine a "YYYY-MM-DD" key and "HH:MM" into a timestamp. */
export function atOn(dayKey, hhmm) {
  const d = parseKey(dayKey);
  const [h, m] = String(hhmm || "09:00").split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime();
}

/** Next whole hour — a sane default for the time picker. */
export function defaultTime(now = Date.now()) {
  const d = new Date(now + 3600000);
  d.setMinutes(0, 0, 0);
  return timeOf(d.getTime());
}

/**
 * One-tap options. `minutes` is relative to now; `time` is a clock time today
 * (or tomorrow, if `tomorrow` is set or that time has already passed).
 */
export const QUICK_PRESETS = [
  { id: "15m", label: "In 15 min", minutes: 15 },
  { id: "1h", label: "In 1 hour", minutes: 60 },
  { id: "evening", label: "This evening", time: "18:00" },
  { id: "tomorrow", label: "Tomorrow 9am", time: "09:00", tomorrow: true },
];

export function presetTime(preset, now = Date.now()) {
  if (preset.minutes) return now + preset.minutes * 60000;

  // The day comes from `now`, never from the clock, so this stays pure.
  const todayAt = atOn(keyOf(new Date(now)), preset.time);
  if (!preset.tomorrow && todayAt > now) return todayAt;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return atOn(keyOf(tomorrow), preset.time);
}

/** "Today 18:30" · "Tomorrow 09:00" · "12 Aug 09:00" */
export function formatWhen(ms, now = Date.now()) {
  const when = new Date(ms);
  const today = new Date(now);
  const dayDiff = Math.round(
    (new Date(when).setHours(0, 0, 0, 0) - new Date(today).setHours(0, 0, 0, 0)) / 86400000,
  );

  const clock = timeOf(ms);
  if (dayDiff === 0) return `Today ${clock}`;
  if (dayDiff === 1) return `Tomorrow ${clock}`;
  if (dayDiff === -1) return `Yesterday ${clock}`;
  return `${pad(when.getDate())} ${MONTHS[when.getMonth()]} ${clock}`;
}

/** "in 25 min" / "in 3 h" / "overdue" — for the pending list. */
export function relativeWhen(ms, now = Date.now()) {
  const mins = Math.round((ms - now) / 60000);
  if (mins < 0) return "overdue";
  if (mins < 1) return "now";
  if (mins < 60) return `in ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs} h`;
  return `in ${Math.round(hrs / 24)} d`;
}

export function makeReminder({ text, at, taskId = null }) {
  return { id: `${at}-${Math.random().toString(36).slice(2, 7)}`, text, at, taskId, firedAt: null };
}

/** Not yet fired and the time has arrived (includes any missed while away). */
export function due(list, now = Date.now()) {
  return list.filter((r) => !r.firedAt && r.at <= now);
}

export function pending(list, now = Date.now()) {
  return list.filter((r) => !r.firedAt && r.at > now).sort((a, b) => a.at - b.at);
}

export function fired(list) {
  return list.filter((r) => r.firedAt).sort((a, b) => b.firedAt - a.firedAt);
}

export function nextUp(list, now = Date.now()) {
  return pending(list, now)[0] || null;
}

/** True when a reminder fired more than a minute late — i.e. the app was closed. */
export function wasMissed(reminder, graceMs = 60000) {
  return Boolean(reminder.firedAt && reminder.firedAt - reminder.at > graceMs);
}
