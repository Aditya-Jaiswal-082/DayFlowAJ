import { haptic } from "../lib/haptics.js";

/**
 * Segmented control — ranges, months, anything with 2–5 choices.
 * `options` is [{ value, label }].
 */
export function Segmented({ options, value, onChange, full }) {
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 2,
        borderRadius: 10,
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        width: full ? "100%" : undefined,
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            className="pressable"
            onClick={() => { haptic("tap"); onChange(o.value); }}
            style={{
              flex: full ? 1 : undefined,
              padding: "0.45rem 0.8rem",
              minHeight: 36,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              border: "1px solid transparent",
              background: on ? "var(--card)" : "transparent",
              borderColor: on ? "var(--border)" : "transparent",
              color: on ? "var(--text)" : "var(--muted)",
              transition: "background 160ms ease, color 160ms ease",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
