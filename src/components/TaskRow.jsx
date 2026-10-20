import { haptic } from "../lib/haptics.js";
import { Btn } from "./Btn.jsx";

/**
 * One checkable task line.
 *
 * The label is its own button when `onInspect` is given, so tapping the text
 * opens that task's insight while the checkbox stays a checkbox. `color` must
 * be a hex value — the category tag derives its tint from it.
 *
 * Optional extras for timed tasks: `time` (a "7:00 AM – 9:00 AM" line), `status`
 * ({ label, color }), `accent` (left-edge colour), `highlight` (tint the row —
 * "happening now") and `onEdit` (shows a ✎ button).
 */
export function TaskRow({
  text, cat, done, onToggle, onRemove, onInspect, removeTitle = "Remove",
  color = "#6366f1", badge, hint,
  time, status, accent, highlight, onEdit,
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
        background: highlight ? "var(--accent-soft)" : done ? "var(--bg-2)" : "var(--card)",
        border: "1px solid var(--border)",
        ...(accent ? { borderLeft: `3px solid ${accent}` } : {}),
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
        {time && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{time}</div>}
        {hint && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 2 }}>{hint}</div>}
      </button>

      {status && <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, color: status.color }}>{status.label}</span>}
      {badge && <Tag color={badge.color}>{badge.label}</Tag>}
      {cat && <Tag color={color}>{cat}</Tag>}
      {onEdit && <Btn variant="ghost" size="sm" onClick={onEdit} title="Edit">✎</Btn>}
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
