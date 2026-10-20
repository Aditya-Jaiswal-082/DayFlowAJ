import { useCountUp } from "../hooks/useCountUp.js";
import { Delta } from "./Delta.jsx";

/** Raised surface. `lift` adds the hover rise on pointer devices. */
export function Card({ children, style, lift, className = "", onClick, title }) {
  const cls = `tile ${lift ? "lift" : ""} ${onClick ? "pressable" : ""} ${className}`.trim();
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      className={cls}
      onClick={onClick}
      title={title}
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
    </Tag>
  );
}

/**
 * A metric with an optional trend chip and a tap target for its insight.
 * Numbers count up so a changing figure is noticeable.
 */
export function StatTile({ label, value, numeric, suffix = "", delta, onClick, hint }) {
  const animated = useCountUp(typeof numeric === "number" ? numeric : 0);
  const shown = typeof numeric === "number"
    ? Math.round(animated).toLocaleString("en-IN") + suffix
    : value;

  return (
    <Card onClick={onClick} lift={!!onClick} title={onClick ? `${label} — see insight` : undefined} style={{ padding: "0.85rem 0.95rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{label}</span>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      <div style={{ fontSize: 23, fontWeight: 800, marginTop: 3, letterSpacing: -0.4 }}>{shown}</div>
      {hint && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{hint}</div>}
    </Card>
  );
}
