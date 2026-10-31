import { useCountUp } from "../hooks/useCountUp.js";
import { Delta } from "./Delta.jsx";

/** Raised surface. `lift` adds the hover rise on pointer devices. */
export function Card({ children, style, lift, className = "", onClick, title }) {
  const cls = `tile ${lift ? "lift" : ""} ${onClick ? "pressable" : ""} ${className}`.trim();
  // A real <button> centres its content vertically when a grid stretches it,
  // so a tappable card is a div with button semantics instead.
  const press = onClick
    ? {
        role: "button",
        tabIndex: 0,
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); }
        },
      }
    : {};

  return (
    <div
      className={cls}
      onClick={onClick}
      title={title}
      {...press}
      style={{
        padding: "0.95rem 1rem",
        textAlign: "left",
        width: onClick ? "100%" : undefined,
        color: "inherit",
        font: "inherit",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * A metric: label, a large figure, and a trend or hint underneath. Numbers
 * count up so a changing figure is noticeable. Tappable when `onClick` is given.
 */
export function StatTile({ label, value, numeric, suffix = "", delta, deltaGoodWhenUp = true, onClick, hint }) {
  const animated = useCountUp(typeof numeric === "number" ? numeric : 0);
  const shown = typeof numeric === "number"
    ? Math.round(animated).toLocaleString("en-IN") + suffix
    : value;

  return (
    <Card onClick={onClick} lift={!!onClick} title={onClick ? `${label}, see insight` : undefined} style={{ padding: "0.8rem 0.85rem", minWidth: 0 }}>
      <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2, letterSpacing: -0.4, overflowWrap: "anywhere" }}>{shown}</div>
      {(delta !== undefined || hint) && (
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: 6, marginTop: 2, fontSize: 12, color: "var(--muted)" }}>
          {delta !== undefined && <Delta value={delta} goodWhenUp={deltaGoodWhenUp} />}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </Card>
  );
}