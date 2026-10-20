import { EXPENSE_CATS, TASK_CATS } from "./constants.js";
import { ME, buildSplit, makePerson } from "./splits.js";

/**
 * The original app (before the rewrite this app is based on) exported a flat
 * dump of its own state — no `{app, version, data}` wrapper, tasks with no
 * category or priority, one shared `checks` map per day, notes shaped
 * differently, and a simple "split 50/50 with a named person" instead of a
 * real khata. None of that is a reason to refuse the file: this module turns
 * it into the current shape so the import goes through import/backup.js's
 * usual validation, defaulting anything the old app never recorded.
 */

/** A legacy export has no `app` tag but does have the old flat task list + day map. */
export function looksLikeLegacyDayflow(bundle) {
  return !!bundle && typeof bundle === "object" && !bundle.app
    && Array.isArray(bundle.tasks) && bundle.dayData && typeof bundle.dayData === "object";
}

const titleCase = (s) => {
  const clean = String(s || "").trim();
  return clean ? clean[0].toUpperCase() + clean.slice(1) : "";
};

/** Old tasks were just `{id, text}` — no category, priority or lifecycle. */
function upgradeTask(t, fallbackCat) {
  return {
    id: t?.id ?? Date.now() + Math.floor(Math.random() * 1000),
    text: String(t?.text || "").trim() || "Untitled",
    cat: TASK_CATS.includes(t?.cat) ? t.cat : fallbackCat,
    priority: ["high", "normal", "low"].includes(t?.priority) ? t.priority : "normal",
    createdAt: t?.createdAt ?? null,
    archivedAt: t?.archivedAt ?? null,
  };
}

/** One shared `checks` map per day → bucketed by which list each id belongs to. */
function upgradeDayData(rawDayData, holidayIds, weekendIds) {
  const dayData = {};
  for (const [key, raw] of Object.entries(rawDayData || {})) {
    const checks = {};
    const holidayChecks = {};
    const weekendChecks = {};
    for (const [id, done] of Object.entries(raw?.checks || {})) {
      const numId = Number(id);
      if (holidayIds.has(numId)) holidayChecks[numId] = done;
      else if (weekendIds.has(numId)) weekendChecks[numId] = done;
      else checks[numId] = done;
    }
    dayData[key] = {
      checks,
      holidayChecks,
      weekendChecks,
      extra: Array.isArray(raw?.extra) ? raw.extra : [],
      special: Array.isArray(raw?.special) ? raw.special : [],
      mood: raw?.mood || "",
      note: raw?.note || "",
    };
  }
  return dayData;
}

/** Old notes were `{id, title, body, color, pinned, created, tags}`. */
function upgradeNotes(rawNotes) {
  return (rawNotes || []).map((n) => ({
    id: n?.id ?? Date.now() + Math.floor(Math.random() * 1000),
    title: String(n?.title || "").trim() || "Untitled",
    text: String(n?.body ?? n?.text ?? ""),
    date: n?.created || n?.date || "",
    color: n?.color || "#6366f1",
    tags: Array.isArray(n?.tags) ? n.tags : [],
    pinned: !!n?.pinned,
  }));
}

/**
 * Old expenses recorded `split: true` + `splitWith: "Name"` — a flat flag,
 * not a person record. This creates one khata person per unique name and
 * rebuilds the bill as an equal 50/50 split with you as the payer, which is
 * exactly what the old app meant by "split with someone".
 */
function upgradeExpenses(rawExpenses) {
  const people = [];
  const byName = new Map();
  const personFor = (name) => {
    const key = String(name || "").trim().toLowerCase();
    if (!key) return null;
    if (!byName.has(key)) {
      const person = makePerson(name);
      byName.set(key, person);
      people.push(person);
    }
    return byName.get(key);
  };

  const expenses = (rawExpenses || []).map((e) => {
    const matched = EXPENSE_CATS.find((c) => c.toLowerCase() === String(e?.cat || "").toLowerCase());
    const cat = matched || (EXPENSE_CATS.includes(titleCase(e?.cat)) ? titleCase(e.cat) : "Other");
    const amount = Number(e?.amount) || 0;
    const base = {
      id: e?.id ?? Date.now() + Math.floor(Math.random() * 1000),
      amount,
      desc: String(e?.desc || "").trim() || cat,
      cat,
      date: e?.date || "",
    };
    if (e?.split && e?.splitWith) {
      const person = personFor(e.splitWith);
      const split = person
        ? buildSplit({ total: amount, payerId: ME, participantIds: [ME, person.id], mode: "equal" })
        : null;
      if (split) return { ...base, split };
    }
    return base;
  });

  return { expenses, people };
}

/**
 * Upgrade a legacy export into the shape `parseBackup` / `importData` expect.
 * Best-effort throughout: fields the old app never had (task categories,
 * priorities, a real people/khata model) get sensible defaults instead of
 * blocking the import.
 */
export function convertLegacyDayflow(raw) {
  const regular = (raw.tasks || []).map((t) => upgradeTask(t, "Other"));
  const holidayTasks = (raw.holidayTasks || []).map((t) => upgradeTask(t, "Personal"));
  const weekendTasks = (raw.weekendTasks || []).map((t) => upgradeTask(t, "Personal"));

  const holidayIds = new Set(holidayTasks.map((t) => t.id));
  const weekendIds = new Set(weekendTasks.map((t) => t.id));

  const { expenses, people } = upgradeExpenses(raw.expenses);

  return {
    dark: !!raw.dark,
    regular,
    dayData: upgradeDayData(raw.dayData, holidayIds, weekendIds),
    notes: upgradeNotes(raw.notes),
    expenses,
    reminders: [],
    budgets: {},
    people,
    settlements: [],
    holidayTasks,
    holidays: raw.holidays && typeof raw.holidays === "object" ? raw.holidays : {},
    weekendTasks,
  };
}
