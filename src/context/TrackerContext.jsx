import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { useStorage } from "../hooks/useStorage.js";
import { useTasks } from "../hooks/useTasks.js";
import { useNotes } from "../hooks/useNotes.js";
import { useSchedule } from "../hooks/useSchedule.js";
import { useExpenses } from "../hooks/useExpenses.js";
import { usePeople } from "../hooks/usePeople.js";
import { useReminders } from "../hooks/useReminders.js";
import { useNotifications } from "../hooks/useNotifications.js";
import { useToasts } from "../hooks/useToasts.js";
import { useWeather } from "../hooks/useWeather.js";
import { useQuote } from "../hooks/useQuote.js";
import { useIsMobile } from "../hooks/useMediaQuery.js";

import { COLORS, DEFAULT_TAB_ID, STORAGE_KEYS, TASK_CATS } from "../lib/constants.js";
import { getPastDays, getPastDaysEndingAt, getTodayKey, isWeekendKey } from "../lib/dates.js";
import { chartTheme, getTheme } from "../styles/theme.js";
import { buildBackup, landingDay, summarise } from "../lib/backup.js";
import { wasMissed } from "../lib/reminders.js";
import { haptic } from "../lib/haptics.js";
import {
  budgetRows, budgetSummary, buildMood, buildRadar, buildTrend, completionPct, countsFor,
  currentStreak, expenseTotals, expensesByCategory, expensesByDay, historyKeys, tasksActiveOn,
} from "../lib/stats.js";
import {
  categoryInsight, completionTrend, dayInsight, monthInsight, monthKeyOf, recentMonths,
  spendTrend, streakInfo, taskInsight, weekdayPattern,
} from "../lib/insights.js";
import { ledger, ledgerTotals, personInsight } from "../lib/splits.js";

const TrackerContext = createContext(null);

/**
 * Composition root for state. Each domain lives in its own hook
 * (useTasks / useNotes / useExpenses / useReminders); this file wires them
 * together, derives the numbers, and exposes one flat API via useTracker().
 */
export function TrackerProvider({ children }) {
  const today = getTodayKey();
  const isMobile = useIsMobile();

  const [tab, setTab] = useState(DEFAULT_TAB_ID);
  const [dark, setDark] = useStorage(STORAGE_KEYS.dark, false);
  const [selectedDay, setSelectedDay] = useState(today);
  const [month, setMonth] = useState(() => monthKeyOf(today));
  const [insight, setInsight] = useState(null);

  const toasts = useToasts();
  const notifications = useNotifications();

  /** Delete now, offer a few seconds to take it back. */
  const undoable = useCallback(
    (message, undo) => toasts.push({ message, undo }),
    [toasts.push],   // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onReminderFired = useCallback((reminder) => {
    haptic("warn");
    toasts.push({
      message: wasMissed(reminder)
        ? `⏰ ${reminder.text} — was due ${new Date(reminder.at).toLocaleString()}`
        : `⏰ ${reminder.text}`,
      ttl: 12000,
    });
  }, [toasts.push]);   // eslint-disable-line react-hooks/exhaustive-deps

  const reminders = useReminders({ notify: notifications.notify, onFire: onReminderFired });

  const tasks = useTasks({ today, selectedDay, undoable, onTaskArchived: reminders.cancelForTask });
  const notes = useNotes({ today, undoable });
  const schedule = useSchedule({ today, fromDay: selectedDay, undoable });
  const expenses = useExpenses({ today, undoable });
  const people = usePeople({ today, undoable });

  const weather = useWeather();
  const quote = useQuote(selectedDay, tasks.isHoliday);
  const isWeekend = isWeekendKey(selectedDay);

  /* ── actions ── */

  const addTaskWithReminder = useCallback(({ text, cat, priority, remindAt }) => {
    const task = tasks.add({ text, cat, priority });
    if (!task) return false;
    if (remindAt) reminders.add({ text: task.text, at: remindAt, taskId: task.id });
    haptic("success");
    return true;
  }, [reminders, tasks]);

  const cancelReminder = useCallback((id) => {
    const removed = reminders.cancel(id);
    if (removed) undoable(`Cancelled "${removed.text}"`, () => reminders.restore(removed));
  }, [reminders, undoable]);

  /* ── backup ── */

  const exportData = useCallback(() => buildBackup({
    dark,
    regular: tasks.all,
    dayData: tasks.dayData,
    notes: notes.all,
    expenses: expenses.all,
    reminders: reminders.all,
    budgets: expenses.budgets,
    people: people.all,
    settlements: people.settlements,
    holidayTasks: tasks.holidayTasks,
    holidays: tasks.holidays,
    weekendTasks: tasks.weekendTasks,
    schedule: schedule.all,
  }), [
    dark, tasks.all, tasks.dayData, notes.all, expenses.all, expenses.budgets, reminders.all,
    people.all, people.settlements, tasks.holidayTasks, tasks.holidays, tasks.weekendTasks, schedule.all,
  ]);

  const importData = useCallback((data) => {
    if (Array.isArray(data.regular)) tasks.replaceAll(data.regular);
    if (data.dayData) tasks.replaceDays(data.dayData);
    if (Array.isArray(data.notes)) notes.replaceAll(data.notes);
    if (Array.isArray(data.expenses)) expenses.replaceAll(data.expenses);
    if (data.budgets) expenses.replaceBudgets(data.budgets);
    if (Array.isArray(data.reminders)) reminders.replaceAll(data.reminders);
    if (Array.isArray(data.people)) people.replaceAll(data.people);
    if (Array.isArray(data.settlements)) people.replaceSettlements(data.settlements);
    if (Array.isArray(data.holidayTasks)) tasks.replaceHolidayTasks(data.holidayTasks);
    if (data.holidays && typeof data.holidays === "object") tasks.replaceHolidays(data.holidays);
    if (Array.isArray(data.weekendTasks)) tasks.replaceWeekendTasks(data.weekendTasks);
    if (Array.isArray(data.schedule)) schedule.replaceAll(data.schedule);
    if (typeof data.dark === "boolean") setDark(data.dark);

    // Land somewhere the restored data actually is, not blindly on "today" —
    // a backup is often a while old, and every day/month picker in the app
    // starts from selectedDay/month, so staying on today made a perfectly
    // good import look empty in Money, History and Analysis. landingDay()
    // also skips past a dangling blank day the old app can leave behind.
    const landOn = landingDay(data, today);
    setSelectedDay(landOn);
    setMonth(monthKeyOf(landOn));

    return summarise(data);
  }, [expenses, notes, people, reminders, schedule, setDark, setMonth, tasks, today]);

  const resetAll = useCallback(() => {
    tasks.replaceAll([]);
    tasks.replaceDays({});
    notes.replaceAll([]);
    expenses.replaceAll([]);
    expenses.replaceBudgets({});
    reminders.replaceAll([]);
    people.replaceAll([]);
    people.replaceSettlements([]);
    tasks.replaceHolidayTasks([]);
    tasks.replaceHolidays({});
    tasks.replaceWeekendTasks([]);
    schedule.replaceAll([]);
    setSelectedDay(today);
  }, [expenses, notes, people, reminders, schedule, tasks, today]);

  /* ── derived ── */

  const recentKeys = useMemo(() => getPastDays(7), []);

  /** The "last 7 days" as of whatever day is being viewed — not always real
   *  today. This is what makes the Analysis tab show something meaningful
   *  right after restoring a backup from a while ago, instead of a blank
   *  week nobody has any data for yet. */
  const insightKeys = useMemo(() => getPastDaysEndingAt(selectedDay, 7), [selectedDay]);

  const pctFor = useCallback(
    (key) => completionPct(tasks.dayData, key, tasks.all),
    [tasks.dayData, tasks.all],
  );

  const stats = useMemo(() => {
    const rows = budgetRows(expenses.all, expenses.budgets, today);
    return {
      counts: countsFor(tasks.day, tasks.dayTasks),
      pct: completionPct(tasks.dayData, selectedDay, tasks.all),
      streak: currentStreak(tasks.dayData, tasks.all),
      streaks: streakInfo(tasks.dayData, tasks.all),
      trend: buildTrend(tasks.dayData, insightKeys, tasks.all),
      mood: buildMood(tasks.dayData, insightKeys),
      radar: buildRadar(tasks.day, tasks.dayTasks),
      weekdays: weekdayPattern(tasks.dayData, tasks.all, 6, selectedDay),
      completionTrend: completionTrend(tasks.dayData, tasks.all, selectedDay),
      spendTrend: spendTrend(expenses.all, selectedDay),
      expense: expenseTotals(expenses.all, today),
      expenseByCat: expensesByCategory(expenses.all),
      expenseByDay: expensesByDay(expenses.all, insightKeys),
      budgets: rows,
      budgetTotals: budgetSummary(rows),
      history: historyKeys(tasks.dayData, recentKeys),
      months: recentMonths(6, today),
      tasksOn: (key) => tasksActiveOn(tasks.all, key),
    };
  }, [expenses.all, expenses.budgets, insightKeys, recentKeys, selectedDay, tasks.all, tasks.day, tasks.dayData, tasks.dayTasks, today]);

  /* ── insights ── */

  const openInsight = useCallback((request) => {
    const base = { dayData: tasks.dayData, tasks: tasks.all, expenses: expenses.all };
    let next = null;

    if (request.kind === "day") next = dayInsight({ ...base, key: request.key });
    if (request.kind === "task") next = taskInsight({ ...base, taskId: request.taskId, anchorKey: selectedDay });
    if (request.kind === "month") {
      next = monthInsight({ ...base, monthKey: request.monthKey || month, todayKey: today });
    }
    if (request.kind === "category") {
      next = categoryInsight({
        expenses: expenses.all,
        budgets: expenses.budgets,
        cat: request.cat,
        monthKey: request.monthKey || month,
      });
    }
    if (request.kind === "person") {
      next = personInsight({
        expenses: expenses.all,
        settlements: people.settlements,
        people: people.all,
        personId: request.personId,
      });
    }

    if (next) {
      haptic("tap");
      setInsight(next);
    }
  }, [expenses.all, expenses.budgets, month, people.all, people.settlements, tasks.all, tasks.dayData, today]);

  const closeInsight = useCallback(() => setInsight(null), []);

  /* ── theming ── */

  /** The khata: one derived row per person, plus the headline balances. */
  const split = useMemo(() => {
    const rows = ledger({ expenses: expenses.all, settlements: people.settlements, people: people.all });
    return { rows, totals: ledgerTotals(rows) };
  }, [expenses.all, people.all, people.settlements]);

  const theme = useMemo(() => getTheme(dark), [dark]);
  const chart = useMemo(() => chartTheme(theme), [theme]);

  const catColor = useCallback((cat) => {
    const i = TASK_CATS.indexOf(cat);
    return COLORS[(i < 0 ? 0 : i) % COLORS.length];
  }, []);

  const value = useMemo(() => ({
    today, selectedDay, setSelectedDay, isToday: selectedDay === today, isWeekend,
    tab, setTab, dark, toggleDark: () => setDark((d) => !d), isMobile,
    month, setMonth, insight, openInsight, closeInsight,
    theme, chart, catColor, stats, pctFor, quote, weather, split,
    tasks, notes, schedule, expenses, people, reminders, notifications, toasts,
    addTaskWithReminder, cancelReminder, exportData, importData, resetAll,
  }), [
    today, selectedDay, tab, dark, setDark, isMobile, month, insight, openInsight, closeInsight,
    theme, chart, catColor, stats, pctFor, quote, weather, split, isWeekend,
    tasks, notes, schedule, expenses, people, reminders, notifications, toasts,
    addTaskWithReminder, cancelReminder, exportData, importData, resetAll,
  ]);

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}

export function useTracker() {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error("useTracker must be used inside TrackerProvider");
  return ctx;
}