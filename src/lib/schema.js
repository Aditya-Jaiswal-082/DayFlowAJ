import { storage } from "./storage.js";
import { SCHEMA_VERSION, STORAGE_KEYS } from "./constants.js";

/**
 * Stored-data versioning.
 *
 * Every logical piece of state maps to one localStorage key. When a shape
 * changes, bump SCHEMA_VERSION in constants.js and add a step below — old data
 * is upgraded on boot instead of being silently misread.
 */

const LEGACY_REMINDER_KEY = "rt_reminder";   // v1 held a single reminder object

/** Logical name → storage key, and the fallback if nothing is stored. */
const DATA_MAP = {
  dark: [STORAGE_KEYS.dark, false],
  regular: [STORAGE_KEYS.regular, null],
  dayData: [STORAGE_KEYS.dayData, {}],
  notes: [STORAGE_KEYS.notes, []],
  expenses: [STORAGE_KEYS.expenses, []],
  reminders: [STORAGE_KEYS.reminders, []],
  budgets: [STORAGE_KEYS.budgets, {}],
  people: [STORAGE_KEYS.people, []],
  settlements: [STORAGE_KEYS.settlements, []],
};

function readState() {
  const data = {};
  for (const [name, [key, fallback]] of Object.entries(DATA_MAP)) {
    data[name] = storage.readJSON(key, fallback);
  }
  return data;
}

/** null/undefined means "was never stored" — don't create a key for it. */
function writeState(data) {
  for (const [name, [key]] of Object.entries(DATA_MAP)) {
    if (data[name] !== undefined && data[name] !== null) storage.writeJSON(key, data[name]);
  }
}

/** True on a first-ever run, so migrations can't overwrite the defaults. */
function isFirstRun() {
  return Object.values(DATA_MAP).every(([key]) => storage.read(key) === null);
}

/**
 * Pure upgrade of a data bundle. Used on boot and when importing a backup.
 * @returns {{version:number, data:object}}
 */
export function migrateBundle({ version = 1, data = {} }) {
  const out = { ...data };
  let v = Number(version) || 1;

  if (v < 2) {
    // Tasks gained priority + a lifecycle so past days stay accurate.
    // Missing entirely (fresh install) is left alone so defaults still apply.
    if (Array.isArray(out.regular)) {
      out.regular = out.regular.map((t) => ({
        priority: "normal",
        createdAt: null,
        archivedAt: null,
        ...t,
      }));
    }

    // One "remind me in N hours" object became a list of scheduled reminders.
    const legacy = out.reminder;
    out.reminders = Array.isArray(out.reminders) ? out.reminders : [];
    if (legacy && legacy.active && legacy.fireAt) {
      out.reminders.push({
        id: legacy.fireAt,
        text: legacy.task || "Reminder",
        at: legacy.fireAt,
        taskId: null,
        firedAt: null,
      });
    }
    delete out.reminder;

    out.budgets = out.budgets && typeof out.budgets === "object" ? out.budgets : {};
    v = 2;
  }

  if (v < 3) {
    // The khata arrived: people you split with, and payments between you.
    // Existing expenses simply carry no `split` block, which reads as "not shared".
    out.people = Array.isArray(out.people) ? out.people : [];
    out.settlements = Array.isArray(out.settlements) ? out.settlements : [];
    v = 3;
  }

  return { version: v, data: out };
}

/** Runs once before React mounts. Safe to call repeatedly. */
export function runMigrations() {
  const stored = Number(storage.readJSON(STORAGE_KEYS.version, 1)) || 1;
  if (stored >= SCHEMA_VERSION) return false;

  // Nothing to upgrade on a first run — just stamp the version.
  if (isFirstRun()) {
    storage.writeJSON(STORAGE_KEYS.version, SCHEMA_VERSION);
    return false;
  }

  const data = readState();
  data.reminder = storage.readJSON(LEGACY_REMINDER_KEY, null);

  const { data: upgraded } = migrateBundle({ version: stored, data });
  writeState(upgraded);
  storage.writeJSON(STORAGE_KEYS.version, SCHEMA_VERSION);
  return true;
}
