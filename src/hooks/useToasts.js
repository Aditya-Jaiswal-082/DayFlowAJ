import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TOAST_MS } from "../lib/constants.js";

/**
 * Transient messages, each optionally carrying an undo action.
 *
 * This is what replaces "are you sure?" dialogs: delete immediately, then offer
 * a few seconds to take it back. Fewer clicks, and nothing is truly lost.
 */
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(({ message, undo, ttl = TOAST_MS }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, undo }]);
    timers.current.set(id, setTimeout(() => dismiss(id), ttl));
    return id;
  }, [dismiss]);

  const runUndo = useCallback((toast) => {
    toast.undo?.();
    dismiss(toast.id);
  }, [dismiss]);

  // Don't leave timers running after unmount.
  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  return useMemo(() => ({ list: toasts, push, dismiss, runUndo }), [toasts, push, dismiss, runUndo]);
}
