import { useRef, useState } from "react";

/**
 * Card that tilts towards the pointer, for the one or two hero cards.
 *
 * Pointer-only: touch devices get the standard press instead, since a tilt you
 * can't see under your thumb is just jitter. Transform is applied inline rather
 * than through state on every frame to keep it cheap.
 */
export function TiltCard({ children, max = 7, style }) {
  const ref = useRef(null);
  const [tilting, setTilting] = useState(false);

  function move(e) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateZ(0)`;
    if (!tilting) setTilting(true);
  }

  function reset() {
    const el = ref.current;
    if (el) el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    setTilting(false);
  }

  return (
    <div
      ref={ref}
      className="tile pressable"
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerCancel={reset}
      style={{
        padding: "1rem",
        transformStyle: "preserve-3d",
        transition: tilting ? "box-shadow 180ms ease" : "transform 320ms cubic-bezier(.22,.61,.36,1), box-shadow 180ms ease",
        boxShadow: tilting ? "var(--shadow-2)" : "var(--shadow-1)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
