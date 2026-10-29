import { emptyDay, EXPENSE_CATS, MOOD_SCORE, PRIORITY_ORDER } from "./constants.js";
import { daysAgoKey, isWeekendKey, shortLabel } from "./dates.js";
import { sumBy } from "./format.js";

/** Pure calculations — no React, no storage. `npm test` covers this file. */

/**
 * A complete day record, even for a day that was never touched.
 * Collections are copied: a plain spread would hand back the same array that
 * lives in the store, and mutating it would change state without a re-render.
 */
export function dayOf(dayData, key) {
  const stored = dayData[key] || {};
  return {
    ...emptyDay(),
    ...stored,
    checks: { ...(stored.checks || {}) },
    extra: [...(stored.extra || [])],
    special: [...(stored.special || [])],
    holidayChecks: { ...(stored.holidayChecks || {}) },
    weekendChecks: { ...(stored.weekendChecks || {}) },
  };
}

/**
 * True when a day record has anything real in it — a tick, a note, a mood.
 * Used wherever picking "the best day to land on" matters: a day key merely
 * existing in storage doesn't mean anything happened on it (an app opened
 * once and never touched again still leaves a blank record behind).
 */
export function hasDaySignal(day) {
  if (!day) return false;
  const anyTrue = (obj) => Object.values(obj || {}).some(Boolean);
  return anyTrue(day.checks) || anyTrue(day.holidayChecks) || anyTrue(day.weekendChecks)
    || !!day.note || !!day.mood;
}

/**
 * Tasks that existed on a given day.
 *
 * This is why tasks are archived rather than deleted: a task added today
 * shouldn't make last week look incomplete, and archiving one shouldn't erase
 * it from the days it was actually part of. A null createdAt means "always".
 */
export function tasksActiveOn(regularTasks, dayKey) {
  const weekend = isWeekendKey(dayKey);
  return regularTasks.filter((t) => {
    if (t.createdAt && t.createdAt > dayKey) return false;
    if (t.archivedAt && t.archivedAt <= dayKey) return false;
    // Optional repeat rule (set on timed tasks): absent or "all" means every day.
    if (t.days === "weekdays") return !weekend;
    if (t.days === "weekends") return weekend;
    return true;
  });
}

export function sortByPriority(tasks) {
  return [...tasks].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1),
  );
}

export function countsFor(day, tasks) {
  return {
    done:
      tasks.filter((t) => day.checks[t.id]).length +
      day.extra.filter((x) => x.done).length +
      day.special.filter((x) => x.done).length,
    total: tasks.length + day.extra.length + day.special.length,
  };
}

/** 0–100, and 0 rather than NaN when there is nothing to complete. */
export function completionPct(dayData, key, regularTasks) {
  const { done, total } = countsFor(dayOf(dayData, key), tasksActiveOn(regularTasks, key));
  return total ? Math.round((done / total) * 100) : 0;
}

/* Chart rows keep their day `key` so tapping a point can open that day's insight. */

export function buildTrend(dayData, keys, regularTasks) {
  return keys.map((k) => ({ key: k, label: shortLabel(k), pct: completionPct(dayData, k, regularTasks) }));
}

export function buildMood(dayData, keys) {
  return keys.map((k) => ({ key: k, label: shortLabel(k), score: MOOD_SCORE[dayOf(dayData, k).mood] || 0 }));
}

/** Per-category completion for one day. */
export function buildRadar(day, tasks) {
  return [...new Set(tasks.map((t) => t.cat))].map((cat) => {
    const inCat = tasks.filter((t) => t.cat === cat);
    const done = inCat.filter((t) => day.checks[t.id]).length;
    return { cat, pct: inCat.length ? Math.round((done / inCat.length) * 100) : 0 };
  });
}

/** Consecutive days at 100%, counting back from today. Capped so it always terminates. */
export function currentStreak(dayData, regularTasks, maxDays = 400) {
  if (!tasksActiveOn(regularTasks, daysAgoKey(0)).length) return 0;
  let n = 0;
  while (n < maxDays && completionPct(dayData, daysAgoKey(n), regularTasks) === 100) n++;
  return n;
}

export function expenseTotals(expenses, todayKey) {
  const monthPrefix = String(todayKey).slice(0, 7);
  return {
    all: sumBy(expenses),
    month: sumBy(expenses.filter((e) => String(e.date).startsWith(monthPrefix))),
    count: expenses.length,
  };
}

/** Only categories with spend, so the pie has no empty slices. */
export function expensesByCategory(expenses) {
  return EXPENSE_CATS
    .map((name) => ({ name, value: sumBy(expenses.filter((e) => e.cat === name)) }))
    .filter((row) => row.value > 0);
}

export function expensesByDay(expenses, keys) {
  return keys.map((k) => ({
    key: k,
    label: shortLabel(k),
    amount: sumBy(expenses.filter((e) => e.date === k)),
  }));
}

/**
 * Budget progress for the current month.
 * Only categories with a cap appear; `pct` is uncapped so the bar can show 130%.
 */
export function budgetRows(expenses, budgets, todayKey) {
  const monthPrefix = String(todayKey).slice(0, 7);
  const thisMonth = expenses.filter((e) => String(e.date).startsWith(monthPrefix));

  return Object.entries(budgets)
    .filter(([, cap]) => Number(cap) > 0)
    .map(([cat, cap]) => {
      const spent = sumBy(thisMonth.filter((e) => e.cat === cat));
      const limit = Number(cap);
      return { cat, cap: limit, spent, left: limit - spent, pct: Math.round((spent / limit) * 100) };
    })
    .sort((a, b) => b.pct - a.pct);
}

export function budgetSummary(rows) {
  return {
    count: rows.length,
    over: rows.filter((r) => r.spent > r.cap).length,
    cap: sumBy(rows, "cap"),
    spent: sumBy(rows, "spent"),
  };
}

/** Newest first: every recorded day plus the recent window. */
export function historyKeys(dayData, recentKeys) {
  return [...new Set([...Object.keys(dayData), ...recentKeys])].sort((a, b) => (a < b ? 1 : -1));
}

/**
 * The whole expense log grouped by month, newest first, for the History list.
 * Within a month, newest day first (then newest entry). An entry with no date
 * is filed under "undated" at the end rather than dropped, and one with no
 * description is kept as it is — nothing logged is ever hidden.
 * @returns {{key:string, items:object[], total:number}[]}
 */
export function groupExpensesByMonth(expenses) {
  const dated = (e) => String(e.date || "");
  const sorted = [...expenses].sort((a, b) => dated(b).localeCompare(dated(a)) || (b.id || 0) - (a.id || 0));
  const groups = [];
  const byKey = new Map();
  for (const e of sorted) {
    const key = e.date ? String(e.date).slice(0, 7) : "undated";
    let g = byKey.get(key);
    if (!g) {
      g = { key, items: [], total: 0 };
      byKey.set(key, g);
      groups.push(g);
    }
    g.items.push(e);
    g.total += Number(e.amount) || 0;
  }
  return groups;
}
