import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStorage } from "./useStorage.js";
import { STORAGE_KEYS, TICK_MS } from "../lib/constants.js";
import { due, fired, makeReminder, nextUp, pending, wasMissed } from "../lib/reminders.js";

/**
 * The scheduler.
 *
 * Reminders are stored with an absolute timestamp, so they survive reloads and
 * anything already due when the app opens fires straight away (flagged as
 * missed). Nothing is lost just because the tab was closed at the time.
 */
export function useReminders({ notify, onFire }) {
  const [list, setList] = useStorage(STORAGE_KEYS.reminders, []);
  const [now, setNow] = useState(() => Date.now());

  /** Ids already announced this session — stops StrictMode's double effect
      from raising the same notification twice. */
  const announced = useRef(new Set());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Fire anything due. Marking firedAt first makes this safe to re-run.
  useEffect(() => {
    const ready = due(list, Date.now()).filter((r) => !announced.current.has(r.id));
    if (!ready.length) return;

    const firedAt = Date.now();
    const ids = new Set(ready.map((r) => r.id));
    ids.forEach((id) => announced.current.add(id));
    setList((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, firedAt } : r)));

    ready.forEach((reminder) => {
      const stamped = { ...reminder, firedAt };
      notify({
        title: `⏰ ${reminder.text}`,
        body: wasMissed(stamped) ? "This one was due while the app was closed." : "It's time.",
        tag: reminder.id,
      });
      onFire(stamped);
    });
  }, [list, now, notify, onFire, setList]);

  const add = useCallback(({ text, at, taskId = null }) => {
    const clean = String(text || "").trim();
    if (!clean || !Number.isFinite(at)) return null;
    const reminder = makeReminder({ text: clean, at, taskId });
    setList((prev) => [...prev, reminder]);
    return reminder;
  }, [setList]);

  /** Returns the removed reminder so the caller can offer undo. */
  const cancel = useCallback((id) => {
    const found = list.find((r) => r.id === id) || null;
    setList((prev) => prev.filter((r) => r.id !== id));
    return found;
  }, [list, setList]);

  const restore = useCallback((reminder) => {
    if (reminder) setList((prev) => [...prev, reminder]);
  }, [setList]);

  const clearHistory = useCallback(() => {
    setList((prev) => prev.filter((r) => !r.firedAt));
  }, [setList]);

  /** Drops reminders attached to a task that no longer needs them. */
  const cancelForTask = useCallback((taskId) => {
    setList((prev) => prev.filter((r) => r.taskId !== taskId || r.firedAt));
  }, [setList]);

  return useMemo(() => ({
    all: list,
    pending: pending(list, now),
    fired: fired(list).slice(0, 20),
    next: nextUp(list, now),
    add,
    cancel,
    restore,
    clearHistory,
    cancelForTask,
    replaceAll: setList,
  }), [list, now, add, cancel, restore, clearHistory, cancelForTask, setList]);
}
