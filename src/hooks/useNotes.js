import { useCallback, useMemo } from "react";
import { useStorage } from "./useStorage.js";
import { NOTE_COLORS, STORAGE_KEYS } from "../lib/constants.js";

export function useNotes({ today, undoable }) {
  const [notes, setNotes] = useStorage(STORAGE_KEYS.notes, []);

  const add = useCallback(({ title, text, color, tags }) => {
    const body = String(text || "").trim();
    if (!body) return false;
    const tagList = Array.isArray(tags)
      ? tags
      : String(tags || "").split(",").map((t) => t.trim()).filter(Boolean);
    setNotes((prev) => [
      {
        id: Date.now(),
        title: String(title || "").trim() || "Untitled",
        text: body,
        date: today,
        color: color || NOTE_COLORS[0],
        tags: tagList,
        pinned: false,
      },
      ...prev,
    ]);
    return true;
  }, [setNotes, today]);

  /** Edit a note in place — its date and pin stay as they were. */
  const update = useCallback((id, { title, text, color, tags }) => {
    const body = String(text || "").trim();
    if (!body) return false;
    const tagList = Array.isArray(tags)
      ? tags
      : String(tags || "").split(",").map((t) => t.trim()).filter(Boolean);
    setNotes((prev) => prev.map((n) => (n.id === id ? {
      ...n,
      title: String(title || "").trim() || "Untitled",
      text: body,
      color: color || n.color,
      tags: tagList,
    } : n)));
    return true;
  }, [setNotes]);

  const remove = useCallback((id) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const index = notes.findIndex((n) => n.id === id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    undoable(`Deleted "${note.title}"`, () => {
      setNotes((prev) => {
        const restored = [...prev];
        restored.splice(index, 0, note);
        return restored;
      });
    });
  }, [notes, setNotes, undoable]);

  /** Pin keeps a note at the top of the list, most-recently-pinned first. */
  const togglePin = useCallback((id) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
  }, [setNotes]);

  /** Case-insensitive match on title, body and tags. */
  const search = useCallback((query) => {
    const q = String(query || "").trim().toLowerCase();
    const base = q
      ? notes.filter((n) => `${n.title} ${n.text} ${(n.tags || []).join(" ")}`.toLowerCase().includes(q))
      : notes;
    // Pinned first; within each group, original (newest-first) order is kept.
    return [...base].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [notes]);

  return useMemo(
    () => ({ all: notes, add, update, remove, togglePin, search, replaceAll: setNotes }),
    [notes, add, update, remove, togglePin, search, setNotes],
  );
}
