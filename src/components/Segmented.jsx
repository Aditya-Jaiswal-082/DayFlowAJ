import { haptic } from "../lib/haptics.js";

/**
 * Inset pill switch — ranges, months, anything with 2–4 choices.
 * `options` is [{ value, label }].
 */
export function Segmented({ options, value, onChange, full }) {
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        gap: 3,
        padding: 3,
        borderRadius: 999,
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-press)",
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
              padding: "0.35rem 0.7rem",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              border: "1px solid transparent",
              background: on ? "var(--card)" : "transparent",
              borderColor: on ? "var(--border)" : "transparent",
              boxShadow: on ? "var(--shadow-1)" : "none",
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
