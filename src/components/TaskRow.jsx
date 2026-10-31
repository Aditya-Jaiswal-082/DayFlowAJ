import { haptic } from "../lib/haptics.js";

/**
 * One line in a checklist — flat, with a divider above it (the list draws the
 * outer frame). The whole text area is a button when `onOpen` is given, so a
 * tap anywhere on the title opens the task; the checkbox is its own, larger
 * touch target.
 *
 *   text      the task
 *   meta      small muted facts under it: [{ text, color? }] — "7:00 – 9:00 AM", a category…
 *   status    { label, color } shown on the right ("Now", "Missed")
 *   flag      { label, color } a priority marker on the right
 *   highlight tint the row (the task happening now)
 *   onRemove  shows a small ✕ (for the simple lists that have no editor)
 */
export function TaskRow({
  text, meta = [], done, disabled, onToggle, onOpen, onRemove, removeTitle = "Remove",
  status, flag, highlight, first,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        minHeight: 56,
        borderTop: first ? "none" : "1px solid var(--border)",
        background: highlight ? "var(--accent-soft)" : "transparent",
        boxShadow: highlight ? "inset 3px 0 0 var(--accent)" : "none",
      }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={!!done}
        aria-label={text}
        disabled={disabled}
        title={disabled ? "You can tick this on the day" : undefined}
        onClick={() => { haptic(done ? "tap" : "toggle"); onToggle(); }}
        style={{
          flexShrink: 0,
          width: 52,
          display: "grid",
          placeItems: "center",
          background: "none",
          border: "none",
          padding: 0,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            display: "grid",
            placeItems: "center",
            border: `1.5px solid ${done ? "var(--accent)" : "var(--muted)"}`,
            background: done ? "var(--accent)" : "transparent",
            transition: "background 120ms ease, border-color 120ms ease",
          }}
        >
          {done && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          background: "none",
          border: "none",
          padding: "0.6rem 0.5rem 0.6rem 0",
          cursor: onOpen ? "pointer" : "default",
          color: "inherit",
          display: "grid",
          alignContent: "center",
          gap: 2,
        }}
      >
        <span
          style={{
            fontSize: 15.5,
            lineHeight: 1.3,
            fontWeight: 500,
            wordBreak: "break-word",
            color: done ? "var(--muted)" : "var(--text)",
            textDecorationLine: done ? "line-through" : "none",
            textDecorationColor: "var(--muted)",
          }}
        >
          {text}
        </span>
        {meta.length > 0 && (
          <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 0, fontSize: 12.5, color: "var(--muted)" }}>
            {meta.map((m, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: m.color || "var(--muted)" }}>
                {m.dot && <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 2, background: m.dot }} />}
                {m.text}
              </span>
            ))}
          </span>
        )}
      </button>

      {(status || flag) && (
        <div style={{ display: "grid", alignContent: "center", justifyItems: "end", gap: 2, paddingRight: 12, flexShrink: 0 }}>
          {status && <span style={{ fontSize: 12.5, fontWeight: 700, color: status.color }}>{status.label}</span>}
          {flag && <span style={{ fontSize: 12, fontWeight: 600, color: flag.color }}>{flag.label}</span>}
        </div>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={() => { haptic("warn"); onRemove(); }}
          title={removeTitle}
          aria-label={removeTitle}
          style={{
            flexShrink: 0, width: 44, background: "none", border: "none", cursor: "pointer",
            color: "var(--muted)", fontSize: 16,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
