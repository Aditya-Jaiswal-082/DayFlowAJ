import { useEffect, useRef, useState } from "react";

/**
 * Animates a number towards its target so stats don't snap.
 * Falls straight to the value when the user prefers reduced motion.
 */
export function useCountUp(value, duration = 500) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || from.current === value) {
      from.current = value;
      setShown(value);
      return undefined;
    }

    const start = performance.now();
    const origin = from.current;
    const delta = value - origin;

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(origin + delta * eased);
      if (t < 1) raf.current = requestAnimationFrame(step);
      else from.current = value;
    };

    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return shown;
}
