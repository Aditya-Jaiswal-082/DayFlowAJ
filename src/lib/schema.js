import { storage } from "./storage.js";
import { DEFAULT_TASKS, SCHEMA_VERSION, STORAGE_KEYS, TASK_CATS } from "./constants.js";

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
  schedule: [STORAGE_KEYS.schedule, null],   // legacy Plan tab (v3); folded into tasks by v4
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

  if (v < 4) {
    // The standalone Plan tab merged into Today: a timed block is now just a
    // regular task that happens to have a time. Blocks become tasks (keeping
    // their repeat rule and lifecycle) and their ticks move into `checks`, so
    // nothing already recorded is lost. Ids that would collide with an existing
    // task are given a fresh one, and the ticks follow.
    const blocks = Array.isArray(out.schedule) ? out.schedule : [];
    if (blocks.length) {
      const base = Array.isArray(out.regular) ? out.regular : DEFAULT_TASKS.map((t) => ({ ...t }));
      const taken = new Set(base.map((t) => t.id));
      const idMap = new Map();
      let next = Date.now();
      const converted = blocks.map((b) => {
        let id = b.id;
        while (taken.has(id)) id = next++;
        taken.add(id);
        idMap.set(b.id, id);
        return {
          id,
          text: b.text,
          cat: b.cat || TASK_CATS.find((c) => c === "Personal") || TASK_CATS[0],
          priority: "normal",
          start: b.start,
          end: b.end ?? null,
          days: b.days || "all",
          createdAt: b.createdAt ?? null,
          archivedAt: b.archivedAt ?? null,
        };
      });
      out.regular = [...base, ...converted];

      if (out.dayData && typeof out.dayData === "object") {
        const days = {};
        for (const [key, day] of Object.entries(out.dayData)) {
          const { scheduleChecks, ...rest } = day || {};
          if (scheduleChecks && typeof scheduleChecks === "object") {
            const moved = {};
            for (const [oldId, ticked] of Object.entries(scheduleChecks)) {
              const newId = idMap.get(Number.isNaN(Number(oldId)) ? oldId : Number(oldId));
              if (newId !== undefined) moved[newId] = ticked;
            }
            days[key] = { ...rest, checks: { ...(rest.checks || {}), ...moved } };
          } else {
            days[key] = day;
          }
        }
        out.dayData = days;
      }
    } else if (out.dayData && typeof out.dayData === "object") {
      // No blocks, but strip any stray empty tick maps so the shape stays clean.
      out.dayData = Object.fromEntries(Object.entries(out.dayData).map(([key, day]) => {
        const { scheduleChecks, ...rest } = day || {};
        return [key, day && scheduleChecks ? rest : day];
      }));
    }
    delete out.schedule;
    v = 4;
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
