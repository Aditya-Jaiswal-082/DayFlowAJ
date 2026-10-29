/**
 * Tests for src/lib — plain node, no build step, no browser.
 *
 *   npm test
 */

/* A fake, throwing localStorage proves the storage shim never crashes.
   Swapped for a working one later to test migrations. */
const throwingStore = {
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); },
};
globalThis.window = { localStorage: throwingStore };

const { keyOf, getTodayKey, parseKey, formatDate, shortLabel, getPastDays, getPastDaysEndingAt, daysAgoKey, addDays, dayOfWeek, isWeekendKey, firstWeekdayOfMonth, addMonths } =
  await import("../src/lib/dates.js");
const { money, clamp, sumBy } = await import("../src/lib/format.js");
const { storage } = await import("../src/lib/storage.js");
const {
  dayOf, countsFor, completionPct, buildTrend, buildMood, buildRadar, currentStreak,
  tasksActiveOn, sortByPriority, expenseTotals, expensesByCategory, expensesByDay,
  budgetRows, budgetSummary, historyKeys, hasDaySignal, groupExpensesByMonth,
} = await import("../src/lib/stats.js");
const {
  atOn, defaultTime, formatWhen, relativeWhen, presetTime, splitWhen, timeOf,
  makeReminder, due, pending, fired, nextUp, wasMissed, QUICK_PRESETS,
} = await import("../src/lib/reminders.js");
const { migrateBundle } = await import("../src/lib/schema.js");
const { buildBackup, parseBackup, summarise, backupFilename, landingDay } = await import("../src/lib/backup.js");
const { looksLikeLegacyDayflow, convertLegacyDayflow } = await import("../src/lib/legacyImport.js");
const {
  toMinutes, toHHMM, formatClock, formatDuration, formatRange, spanOf, parseScheduleText, sortSchedule,
  isTimed, splitTimed, repeatLabel, repeatValue, effectiveEnd, blockStatus, daySummary, freeGaps, overlappingIds,
} = await import("../src/lib/schedule.js");
const {
  change, monthKeyOf, monthLabel, monthDays, recentMonths, anchorDayInMonth, completionTrend, spendTrend,
  streakInfo, weekdayPattern, dayInsight, categoryInsight, monthInsight, taskInsight,
} = await import("../src/lib/insights.js");
const {
  ME, splitEqually, buildSplit, splitTotal, splitDifference, shareOf, isSplit, splitExpenses,
  perHead, balanceWith, ledger, owedBetween, payersOf, paidOf, paidDifference, involves, ledgerTotals, settleSuggestion, makeSettlement, makePerson,
  initialsOf, nameOf, personInsight, personColor,
} = await import("../src/lib/splits.js");
const {
  MOOD_OPTS, MOOD_SCORE, WEATHER_CODES, WEATHER_ICONS, emptyDay,
  TASK_CATS, EXPENSE_CATS, PRIORITIES, PRIORITY_ORDER, SCHEMA_VERSION, DEFAULT_TASKS,
} = await import("../src/lib/constants.js");

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.error(`  FAIL ${label}`); }
};
const group = (name) => console.log(`\n${name}`);
const MIN = 60000;
const HOUR = 3600000;

/* ── dates ─────────────────────────────────────────────────────────────── */
group("dates");
check("keyOf zero-pads", keyOf(new Date(2026, 7, 5)) === "2026-08-05");
check("keyOf uses local time, not UTC", keyOf(new Date(2026, 0, 1, 0, 30)) === "2026-01-01");
check("parseKey round-trips", keyOf(parseKey("2026-08-10")) === "2026-08-10");
check("formatDate is human", formatDate("2026-08-10") === "Mon, 10 Aug 2026");
check("formatDate survives junk", typeof formatDate("nonsense") === "string");
check("shortLabel for axes", shortLabel("2026-01-05") === "05 Jan");
check("daysAgoKey(0) is today", daysAgoKey(0) === getTodayKey());
check("getPastDays length + order", getPastDays(7).length === 7 && getPastDays(7)[6] === getTodayKey());
check("getPastDays has no DST duplicates", new Set(getPastDays(365)).size === 365);
check("addDays steps forward", addDays("2026-08-10", 1) === "2026-08-11");
check("addDays steps backward", addDays("2026-08-10", -1) === "2026-08-09");
check("addDays crosses a month boundary", addDays("2026-08-31", 1) === "2026-09-01");
check("dayOfWeek matches Date#getDay", dayOfWeek("2026-08-10") === new Date(2026, 7, 10).getDay());
check("isWeekendKey is true on Saturday", isWeekendKey("2026-08-08"));
check("isWeekendKey is true on Sunday", isWeekendKey("2026-08-09"));
check("isWeekendKey is false on a weekday", !isWeekendKey("2026-08-10"));
check("firstWeekdayOfMonth matches Date#getDay for the 1st", firstWeekdayOfMonth("2026-08") === new Date(2026, 7, 1).getDay());
check("addMonths steps forward", addMonths("2026-08", 1) === "2026-09");
check("addMonths steps backward", addMonths("2026-08", -1) === "2026-07");
check("addMonths crosses a year boundary", addMonths("2026-12", 1) === "2027-01");
check("getPastDaysEndingAt ends on the anchor, not today", getPastDaysEndingAt("2026-06-15", 7).slice(-1)[0] === "2026-06-15");
check("getPastDaysEndingAt matches getPastDays when anchored on today", getPastDaysEndingAt(getTodayKey(), 7).join() === getPastDays(7).join());

/* ── format ────────────────────────────────────────────────────────────── */
group("format");
check("money is NaN-safe", money(undefined) === "₹0" && money("abc") === "₹0");
check("money groups thousands", money(1234.5).includes("1,234.5"));
check("clamp bounds", clamp(150, 0, 100) === 100 && clamp(-5, 0, 100) === 0 && clamp("x", 0, 100) === 0);
check("sumBy ignores bad values", sumBy([{ amount: 5 }, { amount: "x" }, {}]) === 5);
check("sumBy reads any field", sumBy([{ cap: 10 }, { cap: 5 }], "cap") === 15);

/* ── storage (localStorage throwing) ───────────────────────────────────── */
group("storage");
storage.writeJSON("k", { a: 1 });
check("falls back to memory", storage.readJSON("k", null).a === 1);
check("missing key returns fallback", storage.readJSON("nope", "fb") === "fb");
storage.write("bad", "{not json");
check("corrupt JSON returns fallback", storage.readJSON("bad", "fb") === "fb");
storage.writeJSON("null", null);
check("stored null returns fallback", storage.readJSON("null", "fb") === "fb");

/* ── task lifecycle ────────────────────────────────────────────────────── */
group("task lifecycle");
const lifecycle = [
  { id: 1, cat: "Health", priority: "normal", createdAt: null, archivedAt: null },
  { id: 2, cat: "Work", priority: "high", createdAt: "2026-08-05", archivedAt: null },
  { id: 3, cat: "Work", priority: "low", createdAt: "2026-08-01", archivedAt: "2026-08-06" },
];
check("null createdAt means always existed", tasksActiveOn(lifecycle, "2020-01-01").some((t) => t.id === 1));
check("a task added later isn't counted earlier", !tasksActiveOn(lifecycle, "2026-08-04").some((t) => t.id === 2));
check("a task is counted from its creation day", tasksActiveOn(lifecycle, "2026-08-05").some((t) => t.id === 2));
check("an archived task still counts before archiving", tasksActiveOn(lifecycle, "2026-08-05").some((t) => t.id === 3));
check("an archived task stops counting after", !tasksActiveOn(lifecycle, "2026-08-06").some((t) => t.id === 3));
check("high priority sorts first", sortByPriority(lifecycle)[0].priority === "high");
check("unknown priority sorts as normal", sortByPriority([{ priority: "??" }, { priority: "low" }])[0].priority === "??");
check("every priority has a sort weight", PRIORITIES.every((p) => PRIORITY_ORDER[p.val] !== undefined));
check("default tasks carry a lifecycle", DEFAULT_TASKS.every((t) => "createdAt" in t && "archivedAt" in t));

/* ── stats ─────────────────────────────────────────────────────────────── */
group("stats");
const tasks = [
  { id: 1, cat: "Health", priority: "normal", createdAt: null, archivedAt: null },
  { id: 2, cat: "Work", priority: "normal", createdAt: null, archivedAt: null },
];
const data = {
  "2026-08-09": { checks: { 1: true, 2: true } },
  "2026-08-10": { checks: { 1: true }, extra: [{ done: true }], special: [{ done: false }], mood: "good" },
};

check("emptyDay returns independent objects", emptyDay().checks !== emptyDay().checks);
check("dayOf fills every field", Object.keys(dayOf({}, "x")).sort().join() === "checks,extra,holidayChecks,mood,note,special,weekendChecks");
check("dayOf copies arrays", (dayOf(data, "2026-08-10").extra.push(1), data["2026-08-10"].extra.length === 1));
check("dayOf copies checks", (dayOf(data, "2026-08-10").checks[9] = true, !data["2026-08-10"].checks[9]));
check("dayOf copies holidayChecks", (dayOf(data, "2026-08-10").holidayChecks[9] = true, !data["2026-08-10"].holidayChecks?.[9]));
check("dayOf copies weekendChecks", (dayOf(data, "2026-08-10").weekendChecks[9] = true, !data["2026-08-10"].weekendChecks?.[9]));
check("pct with no tasks is 0 not NaN", completionPct({}, "2026-08-10", []) === 0);
check("pct counts regular tasks", completionPct(data, "2026-08-09", tasks) === 100);
check("pct blends extra + special", completionPct(data, "2026-08-10", tasks) === 50);
check("pct ignores tasks not yet created", completionPct(data, "2026-08-09", [
  ...tasks, { id: 9, cat: "Work", createdAt: "2026-09-01", archivedAt: null },
]) === 100);
check("countsFor totals", countsFor(dayOf(data, "2026-08-10"), tasks).total === 4);
check("trend length matches keys", buildTrend(data, getPastDays(7), tasks).length === 7);
check("mood scores map through", buildMood(data, ["2026-08-10"])[0].score === MOOD_SCORE.good);
check("mood defaults to 0 when unlogged", buildMood({}, ["2026-08-01"])[0].score === 0);
check("radar one row per category", buildRadar(dayOf(data, "2026-08-10"), tasks).length === 2);
check("radar pct per category", buildRadar(dayOf(data, "2026-08-10"), tasks).find((r) => r.cat === "Health").pct === 100);
check("streak is 0 with no active tasks", currentStreak(data, []) === 0);
check("streak terminates", currentStreak({}, tasks) === 0);

const exp = [
  { amount: 100, cat: "Food", date: getTodayKey() },
  { amount: "50", cat: "Food", date: "2020-01-01" },
  { amount: "oops", cat: "Bills", date: getTodayKey() },
];
check("expense totals ignore bad rows", expenseTotals(exp, getTodayKey()).all === 150);
check("month total filters by prefix", expenseTotals(exp, getTodayKey()).month === 100);
check("byCategory drops empty slices", expensesByCategory(exp).every((r) => r.value > 0));
check("byCategory sums a category", expensesByCategory(exp).find((r) => r.name === "Food").value === 150);
check("byDay aligns to keys", expensesByDay(exp, [getTodayKey()])[0].amount === 100);
check("history is newest first", historyKeys(data, [])[0] === "2026-08-10");
check("history merges recent window", historyKeys({}, getPastDays(3)).length === 3);

/* ── budgets ───────────────────────────────────────────────────────────── */
group("budgets");
const budgets = { Food: 80, Transport: 500, Bills: 0 };
const rows = budgetRows(exp, budgets, getTodayKey());
check("only capped categories appear", rows.every((r) => r.cap > 0));
check("a zero cap means no budget", !rows.some((r) => r.cat === "Bills"));
check("spend is this month only", rows.find((r) => r.cat === "Food").spent === 100);
check("pct can exceed 100", rows.find((r) => r.cat === "Food").pct === 125);
check("left goes negative when over", rows.find((r) => r.cat === "Food").left === -20);
check("worst offender sorts first", rows[0].cat === "Food");
check("summary counts overspend", budgetSummary(rows).over === 1);
check("summary totals caps", budgetSummary(rows).cap === 580);
check("no budgets means empty rows", budgetRows(exp, {}, getTodayKey()).length === 0);

/* ── reminder scheduling ───────────────────────────────────────────────── */
group("reminders");
const noon = new Date(2026, 7, 10, 12, 0, 0, 0).getTime();
check("atOn combines a day key and clock time", timeOf(atOn("2026-08-10", "07:05")) === "07:05");
check("atOn defaults to 09:00 on junk", timeOf(atOn("2026-08-10", null)) === "09:00");
check("splitWhen round-trips", atOn(...Object.values(splitWhen(noon))) === noon);
check("defaultTime is the next whole hour", defaultTime(noon) === "13:00");
check("minute presets are relative", presetTime({ minutes: 15 }, noon) === noon + 15 * MIN);
check("a clock preset later today stays today", presetTime({ time: "18:00" }, noon) === atOn("2026-08-10", "18:00"));
check("a clock preset already passed rolls to tomorrow",
  presetTime({ time: "09:00" }, noon) === atOn("2026-08-11", "09:00"));
check("an explicit tomorrow preset always rolls over",
  presetTime({ time: "18:00", tomorrow: true }, noon) === atOn("2026-08-11", "18:00"));
check("every preset resolves to a future time",
  QUICK_PRESETS.every((p) => presetTime(p, noon) > noon));
check("formatWhen says Today", formatWhen(noon + HOUR, noon).startsWith("Today"));
check("formatWhen says Tomorrow", formatWhen(noon + 20 * HOUR, noon).startsWith("Tomorrow"));
check("formatWhen dates anything further out", formatWhen(noon + 72 * HOUR, noon).startsWith("13 Aug"));
check("relativeWhen in minutes", relativeWhen(noon + 25 * MIN, noon) === "in 25 min");
check("relativeWhen in hours", relativeWhen(noon + 3 * HOUR, noon) === "in 3 h");
check("relativeWhen flags overdue", relativeWhen(noon - MIN, noon) === "overdue");

const r1 = makeReminder({ text: "Stretch", at: noon - MIN });
const r2 = makeReminder({ text: "Call back", at: noon + HOUR, taskId: 7 });
const r3 = { ...makeReminder({ text: "Old", at: noon - HOUR }), firedAt: noon - HOUR + 500 };
const list = [r1, r2, r3];
check("ids are unique", new Set(list.map((r) => r.id)).size === 3);
check("due picks up unfired past reminders", due(list, noon).length === 1 && due(list, noon)[0].id === r1.id);
check("due ignores already-fired ones", !due(list, noon).some((r) => r.firedAt));
check("pending is future only, sorted", pending(list, noon).map((r) => r.id).join() === r2.id);
check("fired is newest first", fired(list)[0].id === r3.id);
check("nextUp is the soonest pending", nextUp(list, noon).id === r2.id);
check("nextUp is null when nothing is pending", nextUp([r3], noon) === null);
check("a task reminder keeps its taskId", r2.taskId === 7);
check("wasMissed is false when on time", !wasMissed(r3));
check("wasMissed is true when the app was closed",
  wasMissed({ at: noon - HOUR, firedAt: noon }));

/* ── migrations ────────────────────────────────────────────────────────── */
group("migrations");
const v1 = {
  version: 1,
  data: {
    regular: [{ id: 1, text: "Walk", cat: "Health" }],
    dayData: { "2026-08-01": { checks: { 1: true } } },
    reminder: { active: true, task: "Old reminder", fireAt: noon },
  },
};
const upgraded = migrateBundle(v1);
check("version is bumped", upgraded.version === SCHEMA_VERSION);
check("tasks gain a priority", upgraded.data.regular[0].priority === "normal");
check("tasks gain a lifecycle", upgraded.data.regular[0].archivedAt === null);
check("existing task fields survive", upgraded.data.regular[0].text === "Walk");
check("the single legacy reminder becomes a list", upgraded.data.reminders.length === 1);
check("the legacy reminder keeps its time", upgraded.data.reminders[0].at === noon);
check("the legacy key is dropped", upgraded.data.reminder === undefined);
check("budgets are created", typeof upgraded.data.budgets === "object");
check("day records are untouched", upgraded.data.dayData["2026-08-01"].checks[1] === true);
check("migrating twice is a no-op", migrateBundle(upgraded).data.regular[0].priority === "normal");
check("an inactive legacy reminder is dropped",
  migrateBundle({ version: 1, data: { reminder: { active: false } } }).data.reminders.length === 0);
check("a missing task list is left alone (defaults still apply)",
  migrateBundle({ version: 1, data: {} }).data.regular === undefined);
check("already-current data passes straight through",
  migrateBundle({ version: SCHEMA_VERSION, data: { regular: [] } }).version === SCHEMA_VERSION);

/* ── backup ────────────────────────────────────────────────────────────── */
group("backup");
const live = {
  dark: true,
  regular: [{ id: 1, text: "Walk", cat: "Health", priority: "high", createdAt: null, archivedAt: null }],
  dayData: { "2026-08-10": { checks: { 1: true } } },
  notes: [{ id: 2, title: "Hi", text: "there", date: "2026-08-10" }],
  expenses: [{ id: 3, amount: 50, cat: "Food", desc: "Lunch", date: "2026-08-10" }],
  reminders: [r2],
  budgets: { Food: 500 },
};
const file = JSON.stringify(buildBackup(live));
const restored = parseBackup(file);

check("filename is dated", backupFilename() === `routine-tracker-${getTodayKey()}.json`);
check("a backup round-trips", restored.regular[0].text === "Walk");
check("day records round-trip", restored.dayData["2026-08-10"].checks[1] === true);
check("budgets round-trip", restored.budgets.Food === 500);
check("reminders round-trip", restored.reminders[0].id === r2.id);
check("summarise counts everything", summarise(restored).tasks === 1 && summarise(restored).notes === 1);

const rejects = [
  ["not json at all", "not json"],
  ["a backup from another app", JSON.stringify({ app: "other", data: {} })],
  ["a newer schema", JSON.stringify({ app: "routine-tracker", version: 999, data: {} })],
  ["a missing data block", JSON.stringify({ app: "routine-tracker", version: 2 })],
  ["a corrupted section", JSON.stringify({ app: "routine-tracker", version: 2, data: { notes: "nope" } })],
];
for (const [label, text] of rejects) {
  let threw = false;
  try { parseBackup(text); } catch { threw = true; }
  check(`rejects ${label}`, threw);
}
check("an old backup is upgraded on import",
  parseBackup(JSON.stringify({ app: "routine-tracker", version: 1, data: { regular: [{ id: 1 }] } }))
    .regular[0].priority === "normal");

/* ── insights ──────────────────────────────────────────────────────────── */
group("insights");

const today = getTodayKey();
const yest = daysAgoKey(1);
const iTasks = [
  { id: 1, text: "Workout", cat: "Health", priority: "high", createdAt: null, archivedAt: null },
  { id: 2, text: "Read", cat: "Learning", priority: "low", createdAt: null, archivedAt: null },
];
const iDays = {
  [today]: { checks: { 1: true }, extra: [], special: [{ text: "Dentist", done: false }], mood: "good", note: "Slept badly" },
  [yest]: { checks: { 1: true, 2: true }, extra: [], special: [], mood: "great", note: "" },
};
const iExp = [
  { id: 1, amount: 1200, cat: "Food", desc: "Groceries", date: today },
  { id: 2, amount: 300, cat: "Food", desc: "Coffee", date: yest },
  { id: 3, amount: 900, cat: "Transport", desc: "Fuel", date: today },
];

check("change handles a zero baseline", change(50, 0) === 100 && change(0, 0) === 0);
check("change is a rounded percentage", change(150, 100) === 50 && change(50, 100) === -50);
check("monthKeyOf trims to YYYY-MM", monthKeyOf("2026-08-11") === "2026-08");
check("monthLabel is readable", monthLabel("2026-08") === "Aug 2026");
check("monthDays stops at today", monthDays(monthKeyOf(today), today).slice(-1)[0] === today);
check("monthDays covers a whole past month", monthDays("2026-02", "2026-08-11").length === 28);
check("recentMonths is newest first", recentMonths(3, "2026-08-11").join() === "2026-08,2026-07,2026-06");
check("recentMonths rolls over a year", recentMonths(3, "2026-01-15")[2] === "2025-11");

const di = dayInsight({ dayData: iDays, tasks: iTasks, expenses: iExp, key: today });
check("day insight counts the day's own items", di.stats[0].value === "1/3");
check("day insight totals that day's spend", di.stats[2].value.includes("2,100"));
check("day insight lists every scheduled task", di.rows.length === 2);
check("day insight marks what was missed", di.rows.find((r) => r.label === "Read").ok === false);
check("day insight carries the note through", di.note === "Slept badly");
check("day insight names the unfinished tasks", di.facts.some((f) => f.includes("Read")));
check("day insight compares to the 7-day average", di.facts.some((f) => f.includes("average")));
check("an empty day says so", dayInsight({ dayData: {}, tasks: [], expenses: [], key: today }).facts[0].includes("No tasks"));

/* Month-scoped insights use fixed dates. Using today/yesterday would change
   answers on the 1st of a month, when "yesterday" lands in the month before. */
const fExp = [
  { id: 1, amount: 1200, cat: "Food", desc: "Groceries", date: "2026-03-05" },
  { id: 2, amount: 300, cat: "Food", desc: "Coffee", date: "2026-03-06" },
  { id: 3, amount: 900, cat: "Transport", desc: "Fuel", date: "2026-03-06" },
  { id: 4, amount: 500, cat: "Food", desc: "Takeaway", date: "2026-02-20" },
];

const ci = categoryInsight({ expenses: fExp, budgets: { Food: 1000 }, cat: "Food", monthKey: "2026-03" });
check("category insight sums the month", ci.stats[0].value.includes("1,500"));
check("category insight works out its share", ci.stats[1].value === "63%");
check("category insight counts entries", ci.stats[2].value === "2");
check("category insight finds the biggest entry", ci.facts.some((f) => f.includes("Groceries")));
check("category insight flags going over budget", ci.facts.some((f) => f.includes("Over budget")));
check("category insight exposes budget progress", ci.budget.pct === 150);
check("category insight compares with last month", ci.facts.some((f) => f.includes("Feb 2026")));
check("category insight says when there's no budget",
  categoryInsight({ expenses: fExp, budgets: {}, cat: "Transport", monthKey: "2026-03" })
    .facts.some((f) => f.includes("No budget")));
check("category spend never leaks another month",
  categoryInsight({ expenses: fExp, budgets: {}, cat: "Food", monthKey: "2020-01" }).stats[0].value === "₹0");

const mi = monthInsight({ dayData: iDays, tasks: iTasks, expenses: fExp, monthKey: "2026-03", todayKey: "2026-08-11" });
check("month insight reports average completion", mi.stats[0].value.endsWith("%"));
check("month insight totals spend", mi.stats[2].value.includes("2,400"));
check("month insight ranks categories", mi.rows[0].label === "Food");
check("month insight mentions the top category", mi.facts.some((f) => f.includes("largest share")));
check("month insight compares with the month before", mi.facts.some((f) => f.includes("Feb 2026")));
check("an empty month says so",
  monthInsight({ dayData: {}, tasks: [], expenses: [], monthKey: "2020-01", todayKey: today })
    .facts.some((f) => f.includes("No routine tracked")));

const ti = taskInsight({ dayData: iDays, tasks: iTasks, taskId: 1 });
check("task insight gives a completion rate", ti.stats[0].value.endsWith("%"));
check("task insight tracks the current run", ti.stats[1].value === "2d");
check("task insight breaks down by weekday", ti.rows.length > 0);
check("task insight notes high priority", ti.facts.some((f) => f.includes("high priority")));
check("task insight returns null for an unknown id", taskInsight({ dayData: iDays, tasks: iTasks, taskId: 99 }) === null);

check("completion trend compares two weeks", typeof completionTrend(iDays, iTasks).change === "number");
check("spend trend compares two weeks", spendTrend(iExp).now === 2400);
check("streakInfo tracks current and best", streakInfo(iDays, iTasks).best >= streakInfo(iDays, iTasks).current);
check("weekdayPattern has one row per weekday", weekdayPattern(iDays, iTasks).length === 7);
check("weekdayPattern percentages stay in range",
  weekdayPattern(iDays, iTasks).every((d) => d.pct >= 0 && d.pct <= 100));

/* A restored backup is often weeks or months old. These stats need to be
   computable "as of" that old data, not go blank just because real today
   has moved on — that was the actual bug behind an imported backup looking
   like it hadn't imported at all. */
const oldKey = "2026-06-01";
const oldPrevKey = "2026-05-31"; // exactly 1 day before oldKey
const oldTasks = [{ id: 1, text: "Walk", cat: "Health", priority: "normal", createdAt: null, archivedAt: null }];
const oldDays = {
  [oldKey]: { checks: { 1: true }, extra: [], special: [], mood: "good", note: "" },
  [oldPrevKey]: { checks: { 1: false }, extra: [], special: [], mood: "", note: "" },
};
const oldExpenses = [{ id: 1, amount: 500, cat: "Food", desc: "Lunch", date: oldKey }];

check("completionTrend anchored on today sees none of this old data",
  completionTrend(oldDays, oldTasks, getTodayKey()).now === 0);
check("completionTrend anchored on the data's own day sees it",
  completionTrend(oldDays, oldTasks, oldKey).now > 0);
check("spendTrend anchored on today misses an old expense", spendTrend(oldExpenses, getTodayKey()).now === 0);
check("spendTrend anchored on the expense's own day finds it", spendTrend(oldExpenses, oldKey).now === 500);
check("weekdayPattern anchored on today shows 0% everywhere for a month-old day",
  weekdayPattern(oldDays, oldTasks, 6, getTodayKey()).every((d) => d.pct === 0));
check("weekdayPattern anchored on the data's own day picks up real completion",
  weekdayPattern(oldDays, oldTasks, 6, oldKey).some((d) => d.pct > 0));
check("day insight's 7-day average is computed as of the inspected day, not real today",
  dayInsight({ dayData: oldDays, tasks: oldTasks, expenses: oldExpenses, key: oldKey }).facts.some((f) => f.includes("14%")));
check("task insight anchored on an old day reports a real completion rate",
  taskInsight({ dayData: oldDays, tasks: oldTasks, taskId: 1, anchorKey: oldKey, windowDays: 2 }).stats[0].value === "50%");
check("task insight defaults its anchor to today when none is given",
  taskInsight({ dayData: iDays, tasks: iTasks, taskId: 1 }).stats[1].value === "2d");


/* ── splitting a bill ──────────────────────────────────────────────────── */
group("splits");

const P = { rahul: "p_rahul", priya: "p_priya", amit: "p_amit" };
const folks = [
  { id: P.rahul, name: "Rahul Verma" },
  { id: P.priya, name: "Priya" },
  { id: P.amit, name: "Amit" },
];

const paiseSum = (parts) => Math.round(parts.reduce((a, b) => a + b, 0) * 100);
check("equal split sums to the total exactly", paiseSum(splitEqually(100, 3)) === 10000);
check("the leftover paise go to the first shares", splitEqually(100, 3).join() === "33.34,33.33,33.33");
check("a clean division stays clean", splitEqually(120, 4).join() === "30,30,30,30");
check("odd amounts still balance", paiseSum(splitEqually(0.05, 3)) === 5);
check("splitting between one person is the whole bill", splitEqually(75.5, 1).join() === "75.5");
check("splitting between nobody gives nothing", splitEqually(100, 0).length === 0);

let big = 0;
for (let n = 2; n <= 9; n++) {
  if (paiseSum(splitEqually(999.99, n)) !== 99999) big++;
}
check("every split from 2 to 9 ways adds up", big === 0);

const eq = buildSplit({ total: 900, payerId: ME, participantIds: [ME, P.rahul, P.priya] });
check("buildSplit returns one share per person", eq.shares.length === 3);
check("buildSplit shares add up to the bill", splitTotal(eq) === 900);
check("buildSplit records the payer", eq.payerId === ME);
check("buildSplit ignores duplicate participants",
  buildSplit({ total: 100, participantIds: [ME, ME, P.rahul] }).shares.length === 2);
check("buildSplit refuses a zero bill", buildSplit({ total: 0, participantIds: [ME] }) === null);
check("buildSplit refuses an empty guest list", buildSplit({ total: 100, participantIds: [] }) === null);

const custom = buildSplit({
  total: 100, payerId: ME, participantIds: [ME, P.rahul], mode: "custom",
  custom: { [ME]: 70, [P.rahul]: 30 },
});
check("custom shares are kept as given", shareOf(custom, P.rahul) === 30);
check("a balanced custom split has no difference", splitDifference(custom, 100) === 0);
check("an underassigned custom split reports the gap",
  splitDifference(buildSplit({ total: 100, participantIds: [ME, P.rahul], mode: "custom", custom: { [ME]: 40, [P.rahul]: 30 } }), 100) === 30);
check("an overassigned custom split reports negative",
  splitDifference(buildSplit({ total: 100, participantIds: [ME, P.rahul], mode: "custom", custom: { [ME]: 80, [P.rahul]: 30 } }), 100) === -10);
check("perHead previews the equal share", perHead(90, 3) === 30);
check("shareOf returns 0 for someone not in the split", shareOf(eq, P.amit) === 0);

const shared = [
  { id: 1, amount: 900, desc: "Dinner", cat: "Food", date: "2026-03-05",
    split: buildSplit({ total: 900, payerId: ME, participantIds: [ME, P.rahul, P.priya] }) },
  { id: 2, amount: 600, desc: "Cab", cat: "Transport", date: "2026-03-06",
    split: buildSplit({ total: 600, payerId: P.rahul, participantIds: [ME, P.rahul] }) },
  { id: 3, amount: 250, desc: "Solo coffee", cat: "Food", date: "2026-03-07" },
  { id: 4, amount: 400, desc: "Their lunch", cat: "Food", date: "2026-03-08",
    split: buildSplit({ total: 400, payerId: P.priya, participantIds: [P.priya, P.amit] }) },
];

check("isSplit spots a shared bill", isSplit(shared[0]) && !isSplit(shared[2]));
check("splitExpenses filters out solo spending", splitExpenses(shared).length === 3);

const bRahul = balanceWith({ expenses: shared, settlements: [], personId: P.rahul });
check("their share of a bill you paid is owed to you", bRahul.owesMe === 300);
check("your share of a bill they paid is owed by you", bRahul.iOwe === 300);
check("equal and opposite nets to zero", bRahul.net === 0);
check("the ledger lists both entries", bRahul.entries.length === 2);

const bPriya = balanceWith({ expenses: shared, settlements: [], personId: P.priya });
check("a bill you covered leaves them owing you", bPriya.net === 300);
check("a bill between two others never touches your khata", bPriya.iOwe === 0);
const bAmit = balanceWith({ expenses: shared, settlements: [], personId: P.amit });
check("someone who only splits with a third party has a zero balance", bAmit.net === 0);

const paid = [{ id: "s1", personId: P.priya, amount: 300, direction: "in", date: "2026-03-09", note: "UPI" }];
const bAfter = balanceWith({ expenses: shared, settlements: paid, personId: P.priya });
check("a full payment clears the balance", bAfter.net === 0);
check("a payment shows up in the ledger", bAfter.entries.some((e) => e.kind === "settlement"));
check("a part payment leaves the remainder open",
  balanceWith({ expenses: shared, settlements: [{ id: "s2", personId: P.priya, amount: 100, direction: "in", date: "2026-03-09" }], personId: P.priya }).net === 200);
check("paying them out swings the balance the other way",
  balanceWith({ expenses: shared, settlements: [{ id: "s3", personId: P.priya, amount: 50, direction: "out", date: "2026-03-09" }], personId: P.priya }).net === 350);

const khata = ledger({ expenses: shared, settlements: [], people: folks });
check("the ledger has a row per person", khata.length === 3);
check("the ledger sorts by the largest balance", Math.abs(khata[0].net) >= Math.abs(khata[1].net));
const khataTotals = ledgerTotals(khata);
check("totals add up what you'll get", khataTotals.youllGet === 300);
check("totals add up what you'll pay", khataTotals.youllPay === 0);
check("totals count settled people", khataTotals.settledUp === 2);

check("settle suggests collecting when they owe you", settleSuggestion(300).direction === "in");
check("settle suggests paying when you owe", settleSuggestion(-300).direction === "out");
check("settle suggests nothing at zero", settleSuggestion(0) === null);
check("makeSettlement rejects a zero amount", makeSettlement({ personId: P.rahul, amount: 0, direction: "in", date: "2026-03-09" }) === null);
check("makeSettlement rejects a bad direction", makeSettlement({ personId: P.rahul, amount: 10, direction: "sideways", date: "2026-03-09" }) === null);

check("makePerson trims and ids", makePerson("  Rahul  ").name === "Rahul");
check("makePerson refuses a blank name", makePerson("   ") === null);
check("initials use first and last name", initialsOf("Rahul Verma") === "RV");
check("a single name gives two letters", initialsOf("priya") === "PR");
check("initials survive an empty name", initialsOf("") === "?");
check("nameOf knows you", nameOf(folks, ME) === "You");
check("nameOf falls back for a stranger", nameOf(folks, "nope") === "Someone");
check("avatar colour is stable", personColor(P.rahul) === personColor(P.rahul));

const pi = personInsight({ expenses: shared, settlements: [], people: folks, personId: P.priya });
check("person insight titles the person", pi.title === "Priya");
check("person insight leads with the balance", pi.facts[0].includes("owes you"));
check("person insight counts who paid", pi.facts[1].includes("shared"));
check("person insight lists entries", pi.rows.length > 0);
check("person insight says when settled",
  personInsight({ expenses: shared, settlements: paid, people: folks, personId: P.priya }).facts[0].includes("settled up"));
check("person insight returns null for a stranger",
  personInsight({ expenses: shared, settlements: [], people: folks, personId: "nope" }) === null);

check("migration to v3 creates the khata collections",
  migrateBundle({ version: 2, data: { regular: [] } }).data.people.length === 0);
check("migration to v3 keeps existing people",
  migrateBundle({ version: 2, data: { people: [{ id: "x", name: "Old" }] } }).data.people[0].name === "Old");
check("a v3 backup round-trips people and payments", (() => {
  const file = JSON.stringify(buildBackup({ people: folks, settlements: paid, expenses: shared }));
  const back = parseBackup(file);
  return back.people.length === 3 && back.settlements[0].amount === 300 && isSplit(back.expenses[0]);
})());
check("a corrupted people section is rejected", (() => {
  try { parseBackup(JSON.stringify({ app: "routine-tracker", version: 3, data: { people: "nope" } })); return false; }
  catch { return true; }
})());
check("a backup round-trips holiday tasks and holidays", (() => {
  const file = JSON.stringify(buildBackup({
    holidayTasks: [{ id: 1, text: "Rest", cat: "Health", priority: "normal", createdAt: null, archivedAt: null }],
    holidays: { "2026-08-15": "Independence Day" },
  }));
  const back = parseBackup(file);
  return back.holidayTasks.length === 1 && back.holidays["2026-08-15"] === "Independence Day";
})());
check("a corrupted holidays section is rejected", (() => {
  try { parseBackup(JSON.stringify({ app: "routine-tracker", version: 3, data: { holidays: ["nope"] } })); return false; }
  catch { return true; }
})());
check("summarise counts holiday tasks and holidays",
  summarise({ holidayTasks: [{}, {}], holidays: { a: "x", b: "y" } }).holidayTasks === 2
  && summarise({ holidayTasks: [{}, {}], holidays: { a: "x", b: "y" } }).holidays === 2);

/* landingDay: picking where to open the app right after a restore. A real
   export can leave a dangling blank day behind — opened once, nothing
   ticked, never used again — well after the last day anything actually
   happened. That dead stub shouldn't win over real history. */
const blankStubDays = {
  "2026-05-31": { checks: { 1: true }, holidayChecks: {}, weekendChecks: {}, note: "", mood: "" },
  "2026-06-25": { checks: { 1: true, 2: false }, holidayChecks: {}, weekendChecks: {}, note: "", mood: "good" },
  "2026-08-18": { checks: { 1: false, 2: false }, holidayChecks: {}, weekendChecks: {}, note: "", mood: "" },
};
check("landingDay skips a dangling blank day for the last real one",
  landingDay({ dayData: blankStubDays, expenses: [] }, "2026-09-18") === "2026-06-25");
check("landingDay accepts a note or a mood alone as real signal",
  landingDay({ dayData: { "2026-07-01": { checks: {}, note: "rest day" } }, expenses: [] }, "2026-09-18") === "2026-07-01");
check("landingDay falls back to an expense date when no day has any signal",
  landingDay({ dayData: { "2026-08-18": { checks: { 1: false } } }, expenses: [{ date: "2026-07-10" }] }, "2026-09-18") === "2026-07-10");
check("landingDay falls back to the latest day key when nothing has any signal at all",
  landingDay({ dayData: { "2026-08-18": { checks: { 1: false } } }, expenses: [] }, "2026-09-18") === "2026-08-18");
check("landingDay falls back to today when there's nothing to land on",
  landingDay({ dayData: {}, expenses: [] }, "2026-09-18") === "2026-09-18");
check("landingDay never lands in the future", landingDay({ dayData: { "2099-01-01": { checks: { 1: true } } }, expenses: [] }, "2026-09-18") === "2026-09-18");

check("hasDaySignal is false for a blank day", !hasDaySignal({ checks: { 1: false }, holidayChecks: {}, weekendChecks: {}, note: "", mood: "" }));
check("hasDaySignal is true for a completed task", hasDaySignal({ checks: { 1: true } }));
check("hasDaySignal is true for a holiday completion alone", hasDaySignal({ checks: { 1: false }, holidayChecks: { 2: true } }));
check("hasDaySignal is true for a note alone", hasDaySignal({ checks: {}, note: "rest day" }));
check("hasDaySignal is false for a missing day", !hasDaySignal(undefined));

/* anchorDayInMonth: what picking a month in Analysis should re-centre on —
   this is the fix for the Month picker not actually moving the charts
   below it, which only ever read `selectedDay`. */
check("anchorDayInMonth picks the latest day with signal in that month",
  anchorDayInMonth(blankStubDays, "2026-06", "2026-09-18") === "2026-06-25");
check("anchorDayInMonth falls back to the month's last day when nothing has signal",
  anchorDayInMonth({}, "2026-06", "2026-09-18") === "2026-06-30");
check("anchorDayInMonth never runs past today, for the current month",
  anchorDayInMonth({}, "2026-09", "2026-09-18") === "2026-09-18");
check("anchorDayInMonth ignores signal from a different month",
  anchorDayInMonth({ "2026-07-05": { checks: { 1: true } } }, "2026-06", "2026-09-18") === "2026-06-30");

/* ── legacy (pre-dayflowaj) import ─────────────────────────────────────── */
group("legacy import");

const legacyRaw = {
  version: 3,
  dark: true,
  tasks: [{ id: 1, text: "Wkup erly" }, { id: 2, text: "Bth" }],
  weekendTasks: [{ id: 10, text: "Sleep" }],
  holidayTasks: [{ id: 20, text: "Rest" }],
  holidays: { "2026-06-02": "Document collection" },
  dayData: {
    "2026-06-01": { checks: { 1: true, 2: true }, note: "", extra: [], special: [] },
    "2026-06-02": { checks: { 20: true, 10: true }, note: "off", extra: [{ text: "x", done: true }], special: [] },
  },
  expenses: [
    { id: 100, amount: 340, desc: "Lunch", cat: "food", date: "2026-06-01", split: true, splitWith: "Moti" },
    { id: 101, amount: 50, desc: "Tea", cat: "food", date: "2026-06-01" },
  ],
  notes: [{ id: 200, title: "Hisab", body: "owe Moti 500", color: "#10d9a0", pinned: true, created: "2026-06-01", tags: [] }],
};

check("recognises a legacy export", looksLikeLegacyDayflow(legacyRaw));
check("doesn't mistake a current-app backup for a legacy one",
  !looksLikeLegacyDayflow(JSON.parse(buildBackupJSON())));
function buildBackupJSON() { return JSON.stringify(buildBackup({ regular: [] })); }
check("doesn't mistake random JSON for a legacy export", !looksLikeLegacyDayflow({ foo: "bar" }));

const converted = convertLegacyDayflow(legacyRaw);
check("legacy tasks gain category, priority and lifecycle fields",
  converted.regular.length === 2 && converted.regular.every((t) => t.cat && t.priority === "normal"));
check("legacy holiday and weekend tasks carry over", converted.holidayTasks.length === 1 && converted.weekendTasks.length === 1);
check("legacy holidays pass straight through", converted.holidays["2026-06-02"] === "Document collection");
check("legacy day checks split into the right bucket — regular",
  converted.dayData["2026-06-01"].checks[1] === true && converted.dayData["2026-06-01"].checks[2] === true);
check("legacy day checks split into the right bucket — holiday",
  converted.dayData["2026-06-02"].holidayChecks[20] === true);
check("legacy day checks split into the right bucket — weekend",
  converted.dayData["2026-06-02"].weekendChecks[10] === true);
check("legacy extra/note survive the day conversion",
  converted.dayData["2026-06-02"].note === "off" && converted.dayData["2026-06-02"].extra[0].text === "x");
check("legacy notes map body→text and created→date",
  converted.notes[0].text === "owe Moti 500" && converted.notes[0].date === "2026-06-01" && converted.notes[0].pinned);
check("legacy expense category is title-cased to match EXPENSE_CATS", converted.expenses[0].cat === "Food");
check("a legacy split expense creates a khata person", converted.people.length === 1 && converted.people[0].name === "Moti");
check("a legacy split expense becomes an equal split with you as payer",
  isSplit(converted.expenses[0]) && converted.expenses[0].split.payerId === ME
  && splitTotal(converted.expenses[0].split) === 340);
check("a legacy unsplit expense stays unsplit", !isSplit(converted.expenses[1]));
check("splitting the same name twice reuses one person", (() => {
  const twice = convertLegacyDayflow({
    ...legacyRaw,
    expenses: [
      { id: 1, amount: 100, cat: "food", split: true, splitWith: "Moti" },
      { id: 2, amount: 200, cat: "food", split: true, splitWith: "moti" },
    ],
  });
  return twice.people.length === 1 && twice.expenses[0].split.shares.some((s) => s.id === twice.people[0].id);
})());

check("parseBackup upgrades a legacy file end to end", (() => {
  const back = parseBackup(JSON.stringify(legacyRaw));
  return back.regular.length === 2 && back.holidayTasks.length === 1 && back.people.length === 1;
})());
check("a file that's neither this app's format nor legacy is still rejected", (() => {
  try { parseBackup(JSON.stringify({ some: "other app's export" })); return false; }
  catch (e) { return e.message === "That backup was made by a different app."; }
})());

/* ── time manager ──────────────────────────────────────────────────────── */
group("schedule");

const parse = (t) => parseScheduleText(t).items.map((i) => `${formatRange(i)} ${i.text}`);

check("toMinutes reads a time input value", toMinutes("06:30") === 390 && toMinutes("23:59") === 1439);
check("toMinutes rejects nonsense", toMinutes("25:00") === null && toMinutes("6:75") === null && toMinutes("") === null);
check("toHHMM round-trips toMinutes", toHHMM(toMinutes("07:05")) === "07:05");
check("formatClock uses 12-hour time", formatClock(390) === "6:30 AM" && formatClock(780) === "1:00 PM");
check("formatClock handles midnight and noon", formatClock(0) === "12:00 AM" && formatClock(720) === "12:00 PM");
check("formatDuration reads naturally", formatDuration(45) === "45m" && formatDuration(90) === "1h 30m" && formatDuration(120) === "2h");

check("parses 'hour minute name'", parse("6 30 wakeup")[0] === "6:30 AM Wakeup");
check("parses 'h:mm name'", parse("6:30 wake up")[0] === "6:30 AM Wake up");
check("parses 'h to h name'", parse("7 to 9 gym")[0] === "7:00 AM – 9:00 AM Gym");
check("parses 'h-h name'", parse("7-9 gym")[0] === "7:00 AM – 9:00 AM Gym");
check("parses a range with minutes", parse("11:30 - 12:15 lunch prep")[0] === "11:30 AM – 12:15 PM Lunch prep");
check("the user's own example reads as a morning", parse("6 30 wakeup\n7 to 9 gym\n9 to 11 prepare").join("|")
  === "6:30 AM Wakeup|7:00 AM – 9:00 AM Gym|9:00 AM – 11:00 AM Prepare");
check("a later 1-to-2 line becomes the afternoon", parse("9 to 11 prepare\n1 to 2 lunch")[1] === "1:00 PM – 2:00 PM Lunch");
check("12 to 1 after a morning line is noon", parse("11 to 12 study\n12 to 1 lunch")[1] === "12:00 PM – 1:00 PM Lunch");
check("explicit am/pm wins", parse("3pm call mom")[0] === "3:00 PM Call mom" && parse("6:30 am run")[0] === "6:30 AM Run");
check("a trailing meridiem on the end applies sensibly", parse("9 to 11am prepare")[0] === "9:00 AM – 11:00 AM Prepare");
check("24-hour times are taken as written", parse("18:30 dinner")[0] === "6:30 PM Dinner");
check("a block can run past midnight", parse("10 pm to 6 sleep")[0] === "10:00 PM – 6:00 AM Sleep");
check("a first line of 2 reads as afternoon", parse("2 call")[0] === "2:00 PM Call");
check("bullets and blank lines are ignored", parse("- 7 to 9 gym\n\n* 9 to 11 prepare").length === 2);
check("a line with no time is reported, not guessed", parseScheduleText("gym later").errors[0] === "gym later");
check("a time with no name is reported", parseScheduleText("8 am").errors.length === 1 && parseScheduleText("8 am").items.length === 0);
check("an impossible time is reported", parseScheduleText("27:00 nap").errors.length === 1);
check("good lines survive a bad one", (() => {
  const r = parseScheduleText("7 gym\nnonsense\n9 prepare");
  return r.items.length === 2 && r.errors.length === 1;
})());
check("'am' inside a word is not a meridiem", parse("6 amazing sunrise walk")[0] === "6:00 AM Amazing sunrise walk");
check("an end equal to the start is a single moment", parseScheduleText("9am to 9am standup").items[0].end === null);
check("a bare 9 to 9 reads as the whole working day", parse("9 to 9 open")[0] === "9:00 AM – 9:00 PM Open");

const blk = (id, start, end, extra = {}) => ({ id, start, end, text: `b${id}`, days: "all", createdAt: null, archivedAt: null, ...extra });
const wakeB = blk(1, 390, null);
const gymB = blk(2, 420, 540);
const prepB = blk(3, 540, 660);

check("spanOf measures a block and wraps past midnight",
  spanOf(gymB) === 120 && spanOf(blk(9, 1320, 360)) === 480 && spanOf(wakeB) === 0);
check("sortSchedule orders by start time", sortSchedule([prepB, wakeB, gymB]).map((b) => b.id).join() === "1,2,3");
check("tasksActiveOn filters weekday-only and weekend-only tasks", (() => {
  const items = [blk(1, 420, 540, { days: "weekdays" }), blk(2, 600, 660, { days: "weekends" }), blk(3, 700, null)];
  return tasksActiveOn(items, "2026-08-10").map((b) => b.id).join() === "1,3"   // a Monday
    && tasksActiveOn(items, "2026-08-09").map((b) => b.id).join() === "2,3";    // a Sunday
})());
check("tasksActiveOn still ignores days on tasks that have none",
  tasksActiveOn([{ id: 1, text: "x" }], "2026-08-09").length === 1 && tasksActiveOn([{ id: 1, days: "all" }], "2026-08-09").length === 1);
check("a weekday-only task does not count against a weekend's percentage", (() => {
  const tasks = [{ id: 1, text: "a" }, { id: 2, text: "b", days: "weekdays", start: 420 }];
  return completionPct({ "2026-08-09": { checks: { 1: true } } }, "2026-08-09", tasks) === 100;
})());
check("tasksActiveOn respects createdAt and archivedAt for timed tasks",
  tasksActiveOn([blk(1, 420, 540, { createdAt: "2026-08-10" })], "2026-08-09").length === 0
  && tasksActiveOn([blk(1, 420, 540, { createdAt: "2026-08-10" })], "2026-08-10").length === 1
  && tasksActiveOn([blk(1, 420, 540, { archivedAt: "2026-08-10" })], "2026-08-10").length === 0);
check("isTimed tells a timed task from an anytime one", isTimed(gymB) && isTimed(blk(8, 0, null)) && !isTimed({ id: 1, text: "x" }) && !isTimed({ start: null }));
check("splitTimed orders the timeline and keeps anytime order", (() => {
  const any1 = { id: 11, text: "a" }; const any2 = { id: 12, text: "b" };
  const r = splitTimed([any1, prepB, wakeB, any2, gymB]);
  return r.timed.map((t) => t.id).join() === "1,2,3" && r.anytime.map((t) => t.id).join() === "11,12";
})());
check("repeat labels and values round-trip", repeatValue(repeatLabel("weekdays")) === "weekdays" && repeatValue(repeatLabel(undefined)) === "all");
check("allowUntimed turns a line without a time into an anytime task", (() => {
  const r = parseScheduleText("7 to 9 gym\ncall the bank", { allowUntimed: true });
  return r.items.length === 2 && r.items[1].start === null && r.items[1].text === "Call the bank" && r.errors.length === 0;
})());
check("allowUntimed still reports a time with no name", parseScheduleText("8 am", { allowUntimed: true }).errors.length === 1);
check("an untimed line does not disturb the am/pm context of the next", (() => {
  const r = parseScheduleText("9 to 11 prepare\nbuy milk\n1 to 2 lunch", { allowUntimed: true });
  return r.items[2].start === 780;
})());
check("a single moment lasts until the next block", effectiveEnd(wakeB, sortSchedule([wakeB, gymB])) === 420);
check("a last single moment lasts half an hour", effectiveEnd(wakeB, [wakeB]) === 420);

const L = sortSchedule([wakeB, gymB, prepB]);
const st = (item, nowMin, done = false, dayKey = "2026-08-10") =>
  blockStatus({ item, sorted: L, nowMin, dayKey, todayKey: "2026-08-10", done });
check("a block before its time is upcoming", st(gymB, 400) === "upcoming");
check("a block in its window is active", st(gymB, 480) === "active");
check("a block past its end and unticked is missed", st(gymB, 600) === "missed");
check("a ticked block is done whatever the time", st(gymB, 600, true) === "done" && st(gymB, 400, true) === "done");
check("an unticked block on a past day is missed", st(gymB, 0, false, "2026-08-09") === "missed");
check("a ticked block on a past day is done", st(gymB, 0, true, "2026-08-09") === "done");

check("daySummary counts done, missed and left", (() => {
  const s = daySummary({ items: L, checks: { 1: true }, dayKey: "2026-08-10", todayKey: "2026-08-10", nowMin: 600 });
  return s.total === 3 && s.done === 1 && s.missed === 1 && s.left === 1 && s.pct === 33;
})());
check("daySummary adds up planned and finished time", (() => {
  const s = daySummary({ items: L, checks: { 2: true }, dayKey: "2026-08-09", todayKey: "2026-08-10", nowMin: 0 });
  return s.plannedMin === 240 && s.doneMin === 120 && s.missed === 2;
})());
check("daySummary of an empty day is zeros, not NaN", daySummary({ items: [], checks: {}, dayKey: "x", todayKey: "x", nowMin: 0 }).pct === 0);

check("freeGaps finds open stretches between blocks", (() => {
  const g = freeGaps(sortSchedule([gymB, blk(4, 780, 840)]));
  return g.length === 1 && g[0].from === 540 && g[0].to === 780 && g[0].minutes === 240;
})());
check("freeGaps ignores gaps shorter than the minimum", freeGaps(sortSchedule([gymB, blk(5, 550, 600)])).length === 0);
check("freeGaps treats a single moment as taking 15 minutes", freeGaps(sortSchedule([wakeB, gymB])).length === 0);
check("overlappingIds flags colliding blocks", (() => {
  const ids = overlappingIds(sortSchedule([gymB, blk(6, 500, 600), blk(7, 900, 960)]));
  return ids.has(2) && ids.has(6) && !ids.has(7);
})());
check("back-to-back blocks do not overlap", overlappingIds(L).size === 0);
check("a v3 backup with Plan blocks is folded into tasks on import", (() => {
  const back = parseBackup(JSON.stringify({
    app: "routine-tracker", version: 3,
    data: { regular: [{ id: 1, text: "Read", cat: "Learning" }], schedule: [{ ...gymB, id: 50 }] },
  }));
  const t = back.regular.find((x) => x.id === 50);
  return back.schedule === undefined && back.regular.length === 2 && t.start === 420 && t.end === 540 && t.text === "b2";
})());
check("a corrupted schedule section is still rejected", (() => {
  try { parseBackup(JSON.stringify({ app: "routine-tracker", version: 3, data: { schedule: "nope" } })); return false; }
  catch { return true; }
})());
check("a day with only a ticked timed task has signal", hasDaySignal({ checks: { 50: true } }));

group("plan → today migration (v3 → v4)");
const v3data = () => ({
  regular: [{ id: 1, text: "Read", cat: "Learning", priority: "normal", createdAt: null, archivedAt: null }],
  schedule: [
    { id: 2, start: 420, end: 540, text: "Gym", days: "weekdays", createdAt: "2026-08-01", archivedAt: null },
    { id: 3, start: 390, end: null, text: "Wake up", days: "all", createdAt: null, archivedAt: "2026-08-20" },
  ],
  dayData: {
    "2026-08-03": { checks: { 1: true }, scheduleChecks: { 2: true, 3: false }, note: "kept" },
    "2026-08-04": { checks: {}, scheduleChecks: {} },
  },
});
const m4 = migrateBundle({ version: 3, data: v3data() });
check("migration reaches the current version", m4.version === SCHEMA_VERSION && SCHEMA_VERSION === 4);
check("blocks become tasks with their time, repeat rule and lifecycle", (() => {
  const g = m4.data.regular.find((t) => t.id === 2);
  const w = m4.data.regular.find((t) => t.id === 3);
  return g.start === 420 && g.end === 540 && g.days === "weekdays" && g.createdAt === "2026-08-01" && g.priority === "normal"
    && w.end === null && w.archivedAt === "2026-08-20";
})());
check("existing tasks are kept untouched", m4.data.regular[0].id === 1 && m4.data.regular.length === 3);
check("schedule ticks move into checks", m4.data.dayData["2026-08-03"].checks[2] === true && m4.data.dayData["2026-08-03"].checks[1] === true);
check("unticked entries stay unticked", !m4.data.dayData["2026-08-03"].checks[3]);
check("scheduleChecks and schedule are gone", m4.data.schedule === undefined
  && Object.values(m4.data.dayData).every((d) => d.scheduleChecks === undefined));
check("other day fields survive", m4.data.dayData["2026-08-03"].note === "kept");
check("the migration does not mutate its input", (() => {
  const input = v3data();
  migrateBundle({ version: 3, data: input });
  return input.schedule.length === 2 && input.dayData["2026-08-03"].scheduleChecks[2] === true && input.regular.length === 1;
})());
check("a block id that collides with a task gets a fresh id, and its ticks follow", (() => {
  const d = v3data();
  d.schedule[0].id = 1;   // collides with "Read"
  d.dayData["2026-08-03"].scheduleChecks = { 1: true };
  d.dayData["2026-08-03"].checks = {};
  const r = migrateBundle({ version: 3, data: d }).data;
  const moved = r.regular.find((t) => t.text === "Gym");
  return moved.id !== 1 && r.regular.filter((t) => t.id === 1).length === 1 && r.dayData["2026-08-03"].checks[moved.id] === true
    && !r.dayData["2026-08-03"].checks[1];
})());
check("with no Plan blocks, nothing changes but the version", (() => {
  const r = migrateBundle({ version: 3, data: { regular: [{ id: 1, text: "x" }], dayData: { a: { checks: { 1: true } } } } });
  return r.version === 4 && r.data.regular.length === 1 && r.data.dayData.a.checks[1] === true;
})());
check("with blocks but no stored task list, the default tasks are kept alongside", (() => {
  const r = migrateBundle({ version: 3, data: { schedule: [{ id: 99, start: 420, end: null, text: "Gym", days: "all" }] } }).data;
  return r.regular.length === DEFAULT_TASKS.length + 1 && r.regular.some((t) => t.id === 99);
})());

group("expense history & the split flow");
const log = [
  { id: 1, amount: 100, desc: "Lunch", cat: "Food", date: "2026-09-30" },
  { id: 2, amount: 50, desc: "", cat: "", date: "2026-10-02" },
  { id: 3, amount: 25, desc: "Tea", cat: "Food", date: "2026-10-02" },
  { id: 4, amount: 10, desc: "Old import" },
  { id: 5, amount: 40, desc: "Cab", cat: "Travel", date: "2026-10-20" },
];
const byMonth = groupExpensesByMonth(log);
check("history groups by month, newest month first", byMonth.map((g) => g.key).join() === "2026-10,2026-09,undated");
check("within a month, newest day first, then newest entry", byMonth[0].items.map((e) => e.id).join() === "5,3,2");
check("month totals add up", byMonth[0].total === 115 && byMonth[1].total === 100);
check("an entry with no description is kept, not dropped", byMonth[0].items.some((e) => e.id === 2 && !e.desc));
check("an entry with no date is filed under undated", byMonth[2].items[0].id === 4);
check("nothing is lost in grouping", byMonth.reduce((n, g) => n + g.items.length, 0) === log.length);
check("an empty log has no groups", groupExpensesByMonth([]).length === 0);

const pal = { id: "p1", name: "Pal" };
const withPal = buildSplit({ total: 200, payerId: ME, participantIds: [ME, pal.id] });
const bill = { id: 9, amount: 200, desc: "Dinner", cat: "Food", date: "2026-10-20", split: withPal };
check("a bill split with a friend shows in the khata", ledger({ expenses: [bill], settlements: [], people: [pal] })[0].owesMe === 100);
const aloneOnly = buildSplit({ total: 200, payerId: ME, participantIds: [ME] });
check("a 'split' with only you in it leaves the khata empty (why the form insists on a second person)",
  ledger({ expenses: [{ ...bill, split: aloneOnly }], settlements: [], people: [pal] })[0].owesMe === 0);
check("a friend paying shows what you owe", ledger({
  expenses: [{ ...bill, split: buildSplit({ total: 200, payerId: pal.id, participantIds: [ME, pal.id] }) }],
  settlements: [], people: [pal],
})[0].iOwe === 100);

group("several people paying one bill");
// ₹79 split equally between two; you put in 78, your friend put in 1.
const two = buildSplit({ total: 79, payerId: ME, participantIds: [ME, pal.id], paid: { [ME]: 78, [pal.id]: 1 } });
const twoBill = { id: 20, amount: 79, desc: "Groceries", cat: "Food", date: "2026-10-22", split: two };
check("equal shares of 79 are 39.50 each", two.shares.map((x) => x.amount).join() === "39.5,39.5");
check("both payments are recorded", paidOf(two, ME) === 78 && paidOf(two, pal.id) === 1);
check("the biggest payer is the bill's payer", two.payerId === ME);
check("what was paid adds up to the bill", paidDifference(two, 79) === 0);
check("your friend owes you 38.50 (their 39.50 share minus the 1 they paid)", owedBetween(two, ME, pal.id) === 38.5);
check("and you are owed the same from their side", owedBetween(two, pal.id, ME) === -38.5);
check("the khata adds it up by itself", ledger({ expenses: [twoBill], settlements: [], people: [pal] })[0].net === 38.5);
check("the ledger totals pick it up", ledgerTotals(ledger({ expenses: [twoBill], settlements: [], people: [pal] })).youllGet === 38.5);
check("a settlement then reduces it", ledger({
  expenses: [twoBill], settlements: [makeSettlement({ personId: pal.id, amount: 38.5, direction: "in", date: "2026-10-23" })], people: [pal],
})[0].net === 0);
check("an unbalanced payment is flagged", paidDifference(buildSplit({ total: 79, participantIds: [ME, pal.id], paid: { [ME]: 70, [pal.id]: 1 } }), 79) === 8);
check("one entry in paid is the ordinary single-payer bill", (() => {
  const b = buildSplit({ total: 100, participantIds: [ME, pal.id], paid: { [pal.id]: 100 } });
  return b.paid === undefined && b.payerId === pal.id && owedBetween(b, ME, pal.id) === -50;
})());
check("single-payer bills still work with no paid map", owedBetween(withPal, ME, pal.id) === 100 && payersOf(withPal).length === 1);
check("involves covers sharers and payers", involves(two, pal.id) && !involves(two, "stranger"));

// three people, two paid
const q = { id: "q1", name: "Q" };
const three = buildSplit({ total: 90, participantIds: [ME, pal.id, q.id], paid: { [ME]: 50, [pal.id]: 40 } });
check("three-way bill: shares are 30 each", three.shares.every((x) => x.amount === 30));
check("the one who didn't pay owes the two who did, in proportion", owedBetween(three, ME, q.id) === 20 && owedBetween(three, pal.id, q.id) === 10);
check("people ahead and behind don't owe each other directly", owedBetween(three, ME, pal.id) === 0);
check("three-way: every rupee owed is accounted for", owedBetween(three, ME, q.id) + owedBetween(three, pal.id, q.id) === 30);

/* ── config integrity ──────────────────────────────────────────────────── */
group("config");
check("every mood score has an option", Object.keys(MOOD_SCORE).every((k) => MOOD_OPTS.some((o) => o.val === k)));
check("every mood option has a score", MOOD_OPTS.every((o) => MOOD_SCORE[o.val]));
check("every weather code has an icon", Object.values(WEATHER_CODES).every((d) => WEATHER_ICONS[d]));
check("category lists have no duplicates",
  new Set(TASK_CATS).size === TASK_CATS.length && new Set(EXPENSE_CATS).size === EXPENSE_CATS.length);
check("preset ids are unique", new Set(QUICK_PRESETS.map((p) => p.id)).size === QUICK_PRESETS.length);

console.log(`\n${fail ? "✗" : "✓"} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
