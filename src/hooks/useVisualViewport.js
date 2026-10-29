import { useEffect, useState } from "react";

const read = () => {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  return vv ? { top: vv.offsetTop, height: vv.height } : null;
};

/**
 * The part of the screen you can actually see — `{ top, height }`, or null where
 * the browser can't say. On a phone the on-screen keyboard and the collapsing
 * address bar shrink this while `100vh` stays the same, which is how a bottom
 * sheet ends up with its buttons hidden behind the keyboard.
 */
export function useVisualViewport(active = true) {
  const [box, setBox] = useState(read);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return undefined;
    const update = () => setBox(read());
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);

  return box;
}
