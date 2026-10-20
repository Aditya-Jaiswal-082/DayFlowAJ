import { useRef } from "react";

/**
 * Horizontal swipe detection for switching tabs.
 *
 * Returns props to spread on the scroll container. Deliberately conservative:
 * it ignores a gesture that's mostly vertical (that's a scroll) or that starts
 * on a control, so it can't fight with checkboxes, sliders or text selection.
 */
export function useSwipe({ onLeft, onRight, threshold = 60 }) {
  const start = useRef(null);

  function onTouchStart(e) {
    const t = e.touches[0];
    const onControl = e.target.closest?.("input, textarea, select, button, a, [data-noswipe]");
    start.current = onControl ? null : { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e) {
    const from = start.current;
    start.current = null;
    if (!from) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;

    if (Math.abs(dx) < threshold) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.6) return;   // mostly vertical → a scroll

    if (dx < 0) onLeft?.();
    else onRight?.();
  }

  return { onTouchStart, onTouchEnd };
}
