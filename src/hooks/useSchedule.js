import { useCallback, useMemo } from "react";
import { useStorage } from "./useStorage.js";
import { STORAGE_KEYS } from "../lib/constants.js";
import { formatClock, sortSchedule } from "../lib/schedule.js";

/**
 * The timetable blocks. Like regular tasks they are archived, never deleted,
 * so a past day keeps showing the blocks that were really on it. A new block
 * starts counting from the day it was added on (`fromDay`), which is the day
 * being viewed — add one while looking at last Tuesday and it begins there.
 * Ticks live on the day record (`scheduleChecks`), owned by useTasks.
 */
export function useSchedule({ today, fromDay, undoable }) {
  const [items, setItems] = useStorage(STORAGE_KEYS.schedule, []);

  const archived = useMemo(() => sortSchedule(items.filter((i) => i.archivedAt)), [items]);

  const addMany = useCallback((blocks, days = "all") => {
    const base = Date.now();
    const made = blocks.map((b, i) => ({
      id: base + i,
      start: b.start,
      end: b.end ?? null,
      text: String(b.text || "").trim(),
      days,
      createdAt: fromDay,
      archivedAt: null,
    })).filter((b) => b.text && Number.isFinite(b.start));
    if (made.length) setItems((prev) => [...prev, ...made]);
    return made.length;
  }, [fromDay, setItems]);

  const update = useCallback((id, patch) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, [setItems]);

  const archive = useCallback((id) => {
    const block = items.find((i) => i.id === id);
    if (!block) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, archivedAt: today } : i)));
    undoable(`Archived "${block.text}" (${formatClock(block.start)})`, () => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, archivedAt: null } : i)));
    });
  }, [items, setItems, today, undoable]);

  const unarchive = useCallback((id) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, archivedAt: null } : i)));
  }, [setItems]);

  /** Permanent — also erases the block from the days it was on. */
  const purge = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, [setItems]);

  return useMemo(
    () => ({ all: items, archived, addMany, update, archive, unarchive, purge, replaceAll: setItems }),
    [items, archived, addMany, update, archive, unarchive, purge, setItems],
  );
}