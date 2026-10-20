import { SCHEMA_VERSION } from "./constants.js";
import { getTodayKey } from "./dates.js";
import { migrateBundle } from "./schema.js";
import { convertLegacyDayflow, looksLikeLegacyDayflow } from "./legacyImport.js";
import { hasDaySignal } from "./stats.js";

/**
 * Export / import. Everything lives in one browser's localStorage, so a JSON
 * round-trip is the only thing standing between you and "cleared site data".
 */

const APP_TAG = "routine-tracker";

export function buildBackup(data) {
  return { app: APP_TAG, version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data };
}

export function backupFilename() {
  return `${APP_TAG}-${getTodayKey()}.json`;
}

/**
 * Validate and upgrade a backup file.
 * Throws an Error with a message worth showing to the user.
 */
export function parseBackup(text) {
  let bundle;
  try {
    bundle = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  if (!bundle || typeof bundle !== "object") throw new Error("That file is empty.");

  if (bundle.app !== APP_TAG) {
    // Not this app's own format — but a plain export from the version this
    // app grew out of still carries real data, so upgrade it rather than
    // refuse it outright. Anything else really is a different app's file.
    if (!looksLikeLegacyDayflow(bundle)) throw new Error("That backup was made by a different app.");
    bundle = { app: APP_TAG, version: SCHEMA_VERSION, data: convertLegacyDayflow(bundle) };
  }

  if (Number(bundle.version) > SCHEMA_VERSION) {
    throw new Error("That backup is from a newer version of this app.");
  }

  const { data } = bundle;
  if (!data || typeof data !== "object") throw new Error("That backup has no data in it.");

  const checks = {
    regular: Array.isArray,
    notes: Array.isArray,
    expenses: Array.isArray,
    reminders: Array.isArray,
    people: Array.isArray,
    settlements: Array.isArray,
    holidayTasks: Array.isArray,
    weekendTasks: Array.isArray,
    schedule: Array.isArray,
    dayData: (v) => v && typeof v === "object" && !Array.isArray(v),
    budgets: (v) => v && typeof v === "object" && !Array.isArray(v),
    holidays: (v) => v && typeof v === "object" && !Array.isArray(v),
  };
  for (const [field, ok] of Object.entries(checks)) {
    if (data[field] !== undefined && !ok(data[field])) {
      throw new Error(`The "${field}" section of that backup looks corrupted.`);
    }
  }

  return migrateBundle(bundle).data;
}

/** Counts for the "restored N tasks, M expenses…" confirmation. */
export function summarise(data) {
  return {
    tasks: (data.regular || []).length,
    days: Object.keys(data.dayData || {}).length,
    notes: (data.notes || []).length,
    expenses: (data.expenses || []).length,
    reminders: (data.reminders || []).length,
    people: (data.people || []).length,
    holidayTasks: (data.holidayTasks || []).length,
    holidays: Object.keys(data.holidays || {}).length,
    weekendTasks: (data.weekendTasks || []).length,
    schedule: (data.schedule || []).length,
  };
}

/**
 * Where to land — and what to anchor Analysis's "last 7 days" style stats
 * on — right after a restore. Picking the literal latest key in `dayData` is
 * a trap: an old app often leaves one last, blank day behind (opened once,
 * nothing ticked, never used again), and every "recent" stat would anchor on
 * that dead stub instead of the real block of history right before it. So
 * this prefers the latest day that actually has something in it (see
 * `hasDaySignal`) over a day that merely exists, and only falls back to
 * "today" when the backup has no day-level data to land on at all.
 */
export function landingDay(data, todayKey = getTodayKey()) {
  const dayData = data.dayData || {};
  const meaningfulDays = Object.keys(dayData).filter((key) => hasDaySignal(dayData[key])).sort();
  const expenseDates = (data.expenses || []).map((e) => e.date).filter(Boolean).sort();
  const anyDayKey = Object.keys(dayData).sort();

  const latest = meaningfulDays.pop() || expenseDates.pop() || anyDayKey.pop();
  return latest && latest <= todayKey ? latest : todayKey;
}

export function downloadJSON(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsText(file);
  });
}