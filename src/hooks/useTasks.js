import { useCallback, useMemo } from "react";
import { useStorage } from "./useStorage.js";
import {
  DEFAULT_HOLIDAY_TASKS, DEFAULT_TASKS, DEFAULT_WEEKEND_TASKS, emptyDay, STORAGE_KEYS, TASK_CATS,
} from "../lib/constants.js";
import { dayOf, sortByPriority, tasksActiveOn } from "../lib/stats.js";

/**
 * Tasks and per-day records.
 *
 * Regular tasks are never deleted — they get an `archivedAt` day key. Combined
 * with `createdAt`, that keeps every past day's completion figure honest.
 *
 * Holiday and weekend tasks are two more independent lists with the same
 * lifecycle, shown alongside the regular list on a matching day. Neither
 * feeds the regular-task completion % or streak — a holiday or a weekend is
 * opt-in flavour, not a substitute routine, so it can't quietly change what
 * "100%" has meant on every day before it.
 */
export function useTasks({ today, selectedDay, undoable, onTaskArchived }) {
  const [regularTasks, setRegularTasks] = useStorage(STORAGE_KEYS.regular, DEFAULT_TASKS);
  const [holidayTasks, setHolidayTasks] = useStorage(STORAGE_KEYS.holidayTasks, DEFAULT_HOLIDAY_TASKS);
  const [holidays, setHolidays] = useStorage(STORAGE_KEYS.holidays, {});
  const [weekendTasks, setWeekendTasks] = useStorage(STORAGE_KEYS.weekendTasks, DEFAULT_WEEKEND_TASKS);
  const [dayData, setDayData] = useStorage(STORAGE_KEYS.dayData, {});

  const getDay = useCallback((key) => dayOf(dayData, key), [dayData]);

  const patchDay = useCallback((key, patch) => {
    setDayData((prev) => ({ ...prev, [key]: { ...emptyDay(), ...(prev[key] || {}), ...patch } }));
  }, [setDayData]);

  const day = useMemo(() => dayOf(dayData, selectedDay), [dayData, selectedDay]);

  /** The regular tasks that belong to the day being viewed, high priority first. */
  const dayTasks = useMemo(
    () => sortByPriority(tasksActiveOn(regularTasks, selectedDay)),
    [regularTasks, selectedDay],
  );

  const archived = useMemo(() => regularTasks.filter((t) => t.archivedAt), [regularTasks]);

  /** The holiday tasks that belong to the day being viewed, high priority first. */
  const dayHolidayTasks = useMemo(
    () => sortByPriority(tasksActiveOn(holidayTasks, selectedDay)),
    [holidayTasks, selectedDay],
  );

  const archivedHoliday = useMemo(() => holidayTasks.filter((t) => t.archivedAt), [holidayTasks]);

  const isHoliday = !!holidays[selectedDay];
  const holidayLabel = holidays[selectedDay] || "";

  /** The weekend tasks that belong to the day being viewed, high priority first. */
  const dayWeekendTasks = useMemo(
    () => sortByPriority(tasksActiveOn(weekendTasks, selectedDay)),
    [weekendTasks, selectedDay],
  );

  const archivedWeekend = useMemo(() => weekendTasks.filter((t) => t.archivedAt), [weekendTasks]);

  /* ── regular tasks ── */

  const add = useCallback(({ text, cat, priority = "normal" }) => {
    const clean = String(text || "").trim();
    if (!clean) return null;
    const task = {
      id: Date.now(),
      text: clean,
      cat: cat || TASK_CATS[0],
      priority,
      createdAt: today,
      archivedAt: null,
    };
    setRegularTasks((prev) => [...prev, task]);
    return task;
  }, [setRegularTasks, today]);

  const archive = useCallback((id) => {
    const task = regularTasks.find((t) => t.id === id);
    if (!task) return;
    setRegularTasks((prev) => prev.map((t) => (t.id === id ? { ...t, archivedAt: today } : t)));
    onTaskArchived?.(id);
    undoable(`Archived "${task.text}"`, () => {
      setRegularTasks((prev) => prev.map((t) => (t.id === id ? { ...t, archivedAt: null } : t)));
    });
  }, [onTaskArchived, regularTasks, setRegularTasks, today, undoable]);

  const unarchive = useCallback((id) => {
    setRegularTasks((prev) => prev.map((t) => (t.id === id ? { ...t, archivedAt: null } : t)));
  }, [setRegularTasks]);

  /** Permanent — only offered in Settings, and it does rewrite history. */
  const purge = useCallback((id) => {
    setRegularTasks((prev) => prev.filter((t) => t.id !== id));
  }, [setRegularTasks]);

  /* ── the selected day ── */

  const toggleCheck = useCallback((id) => {
    patchDay(selectedDay, { checks: { ...day.checks, [id]: !day.checks[id] } });
  }, [day.checks, patchDay, selectedDay]);

  /** listName is "extra" or "special". */
  const addListItem = useCallback((listName, text) => {
    const clean = String(text || "").trim();
    if (!clean) return false;
    const item = { id: Date.now(), text: clean, cat: listName === "special" ? "Special" : "Extra", done: false };
    patchDay(selectedDay, { [listName]: [...day[listName], item] });
    return true;
  }, [day, patchDay, selectedDay]);

  const toggleListItem = useCallback((listName, idx) => {
    patchDay(selectedDay, {
      [listName]: day[listName].map((item, i) => (i === idx ? { ...item, done: !item.done } : item)),
    });
  }, [day, patchDay, selectedDay]);

  const removeListItem = useCallback((listName, idx) => {
    const item = day[listName][idx];
    if (!item) return;
    const dayKey = selectedDay;
    patchDay(dayKey, { [listName]: day[listName].filter((_, i) => i !== idx) });
    undoable(`Removed "${item.text}"`, () => {
      setDayData((prev) => {
        const current = dayOf(prev, dayKey);
        const restored = [...current[listName]];
        restored.splice(idx, 0, item);
        return { ...prev, [dayKey]: { ...current, [listName]: restored } };
      });
    });
  }, [day, patchDay, selectedDay, setDayData, undoable]);

  const setMood = useCallback((val) => {
    patchDay(selectedDay, { mood: day.mood === val ? "" : val });
  }, [day.mood, patchDay, selectedDay]);

  const setNote = useCallback((note) => patchDay(selectedDay, { note }), [patchDay, selectedDay]);

  /* ── holiday tasks (own persistent list, mirrors regular tasks above) ── */

  const addHoliday = useCallback(({ text, cat, priority = "normal" }) => {
    const clean = String(text || "").trim();
    if (!clean) return null;
    const task = {
      id: Date.now(),
      text: clean,
      cat: cat || TASK_CATS[0],
      priority,
      createdAt: today,
      archivedAt: null,
    };
    setHolidayTasks((prev) => [...prev, task]);
    return task;
  }, [setHolidayTasks, today]);

  const archiveHolidayTask = useCallback((id) => {
    const task = holidayTasks.find((t) => t.id === id);
    if (!task) return;
    setHolidayTasks((prev) => prev.map((t) => (t.id === id ? { ...t, archivedAt: today } : t)));
    undoable(`Archived "${task.text}"`, () => {
      setHolidayTasks((prev) => prev.map((t) => (t.id === id ? { ...t, archivedAt: null } : t)));
    });
  }, [holidayTasks, setHolidayTasks, today, undoable]);

  const unarchiveHolidayTask = useCallback((id) => {
    setHolidayTasks((prev) => prev.map((t) => (t.id === id ? { ...t, archivedAt: null } : t)));
  }, [setHolidayTasks]);

  /** Permanent — only offered in Settings, and it does rewrite history. */
  const purgeHolidayTask = useCallback((id) => {
    setHolidayTasks((prev) => prev.filter((t) => t.id !== id));
  }, [setHolidayTasks]);

  const toggleHolidayCheck = useCallback((id) => {
    patchDay(selectedDay, { holidayChecks: { ...day.holidayChecks, [id]: !day.holidayChecks[id] } });
  }, [day.holidayChecks, patchDay, selectedDay]);

  /** Mark a day (usually the one being viewed) as a holiday, with an optional label. */
  const setHoliday = useCallback((key, label) => {
    setHolidays((prev) => ({ ...prev, [key]: String(label || "").trim() || "Holiday" }));
  }, [setHolidays]);

  /** Unmark it — undoable, since it's easy to tap by mistake. */
  const clearHoliday = useCallback((key) => {
    const label = holidays[key];
    if (!label) return;
    setHolidays((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    undoable(`Unmarked "${label}"`, () => setHolidays((prev) => ({ ...prev, [key]: label })));
  }, [holidays, setHolidays, undoable]);

  /* ── weekend tasks (own persistent list, mirrors holiday tasks above) ── */

  const addWeekend = useCallback(({ text, cat, priority = "normal" }) => {
    const clean = String(text || "").trim();
    if (!clean) return null;
    const task = {
      id: Date.now(),
      text: clean,
      cat: cat || TASK_CATS[0],
      priority,
      createdAt: today,
      archivedAt: null,
    };
    setWeekendTasks((prev) => [...prev, task]);
    return task;
  }, [setWeekendTasks, today]);

  const archiveWeekendTask = useCallback((id) => {
    const task = weekendTasks.find((t) => t.id === id);
    if (!task) return;
    setWeekendTasks((prev) => prev.map((t) => (t.id === id ? { ...t, archivedAt: today } : t)));
    undoable(`Archived "${task.text}"`, () => {
      setWeekendTasks((prev) => prev.map((t) => (t.id === id ? { ...t, archivedAt: null } : t)));
    });
  }, [weekendTasks, setWeekendTasks, today, undoable]);

  const unarchiveWeekendTask = useCallback((id) => {
    setWeekendTasks((prev) => prev.map((t) => (t.id === id ? { ...t, archivedAt: null } : t)));
  }, [setWeekendTasks]);

  /** Permanent — only offered in Settings, and it does rewrite history. */
  const purgeWeekendTask = useCallback((id) => {
    setWeekendTasks((prev) => prev.filter((t) => t.id !== id));
  }, [setWeekendTasks]);

  const toggleWeekendCheck = useCallback((id) => {
    patchDay(selectedDay, { weekendChecks: { ...day.weekendChecks, [id]: !day.weekendChecks[id] } });
  }, [day.weekendChecks, patchDay, selectedDay]);

  const toggleScheduleCheck = useCallback((id) => {
    patchDay(selectedDay, { scheduleChecks: { ...day.scheduleChecks, [id]: !day.scheduleChecks[id] } });
  }, [day.scheduleChecks, patchDay, selectedDay]);

  return useMemo(() => ({
    all: regularTasks,
    dayTasks,
    archived,
    dayData,
    day,
    getDay,
    add,
    archive,
    unarchive,
    purge,
    toggleCheck,
    addListItem,
    toggleListItem,
    removeListItem,
    setMood,
    setNote,
    replaceAll: setRegularTasks,
    replaceDays: setDayData,

    holidayTasks,
    dayHolidayTasks,
    archivedHoliday,
    holidays,
    isHoliday,
    holidayLabel,
    addHoliday,
    archiveHolidayTask,
    unarchiveHolidayTask,
    purgeHolidayTask,
    toggleHolidayCheck,
    setHoliday,
    clearHoliday,
    replaceHolidayTasks: setHolidayTasks,
    replaceHolidays: setHolidays,

    weekendTasks,
    dayWeekendTasks,
    archivedWeekend,
    addWeekend,
    archiveWeekendTask,
    unarchiveWeekendTask,
    purgeWeekendTask,
    toggleWeekendCheck,
    toggleScheduleCheck,
    replaceWeekendTasks: setWeekendTasks,
  }), [
    regularTasks, dayTasks, archived, dayData, day, getDay, add, archive, unarchive, purge,
    toggleCheck, addListItem, toggleListItem, removeListItem, setMood, setNote,
    setRegularTasks, setDayData,
    holidayTasks, dayHolidayTasks, archivedHoliday, holidays, isHoliday, holidayLabel,
    addHoliday, archiveHolidayTask, unarchiveHolidayTask, purgeHolidayTask, toggleHolidayCheck,
    setHoliday, clearHoliday, setHolidayTasks, setHolidays,
    weekendTasks, dayWeekendTasks, archivedWeekend, addWeekend, archiveWeekendTask,
    unarchiveWeekendTask, purgeWeekendTask, toggleWeekendCheck, toggleScheduleCheck, setWeekendTasks,
  ]);
}