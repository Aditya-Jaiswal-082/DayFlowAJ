import { haptic } from "../lib/haptics.js";
import { Btn } from "./Btn.jsx";

/**
 * One checkable task line.
 *
 * The label is its own button when `onInspect` is given, so tapping the text
 * opens that task's insight while the checkbox stays a checkbox. `color` must
 * be a hex value — the category tag derives its tint from it.
 */
export function TaskRow({
  text, cat, done, onToggle, onRemove, onInspect, removeTitle = "Remove",
  color = "#6366f1", badge, hint,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 7,
        padding: "0.65rem 0.7rem",
        borderRadius: 14,
        background: done ? "var(--bg-2)" : "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: done ? "var(--shadow-press)" : "var(--shadow-1)",
        transition: "background 200ms ease, box-shadow 200ms ease",
      }}
    >
      <input
        type="checkbox"
        checked={!!done}
        onChange={() => { haptic(done ? "tap" : "toggle"); onToggle(); }}
        aria-label={text}
        style={{ width: 21, height: 21, accentColor: color, cursor: "pointer", flexShrink: 0 }}
      />

      <button
        type="button"
        onClick={onInspect}
        disabled={!onInspect}
        title={onInspect ? "See this task's pattern" : undefined}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          background: "none",
          border: "none",
          padding: 0,
          cursor: onInspect ? "pointer" : "default",
          color: "inherit",
        }}
      >
        <span
          style={{
            fontSize: 14.5,
            wordBreak: "break-word",
            color: done ? "var(--muted)" : "var(--text)",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {text}
        </span>
        {hint && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 2 }}>{hint}</div>}
      </button>

      {badge && <Tag color={badge.color}>{badge.label}</Tag>}
      {cat && <Tag color={color}>{cat}</Tag>}
      {onRemove && <Btn variant="danger" size="sm" onClick={onRemove} title={removeTitle} feedback="warn">✕</Btn>}
    </div>
  );
}

function Tag({ children, color }) {
  return (
    <span
      style={{
        flexShrink: 0,
        whiteSpace: "nowrap",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.2,
        padding: "0.22rem 0.45rem",
        borderRadius: 7,
        color,
        background: `${color}1f`,
        border: `1px solid ${color}33`,
      }}
    >
      {children}
    </span>
  );
}
