import { getTodayKey } from "../lib/dates.js";
import { atOn, defaultTime, formatWhen, presetTime, QUICK_PRESETS, splitWhen } from "../lib/reminders.js";
import { Field } from "./Field.jsx";

/**
 * "When should I remind you?" — quick presets plus an exact date and time.
 *
 * Controlled by a `{ on, date, time }` value so the parent modal owns the state.
 * Use `whenValue()` for the initial value and `whenToTimestamp()` on save.
 */

export function whenValue(on = false) {
  return { on, date: getTodayKey(), time: defaultTime() };
}

export function whenToTimestamp(value) {
  return atOn(value.date, value.time);
}

export function WhenPicker({ value, onChange, label = "Remind me about this" }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const target = whenToTimestamp(value);
  const past = value.on && target <= Date.now();

  return (
    <div
      style={{
        padding: "0.8rem",
        borderRadius: 12,
        background: "var(--bg-2)",
        border: `1px solid ${value.on ? "var(--accent)" : "var(--border)"}`,
      }}
    >
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
        <input
          type="checkbox"
          checked={value.on}
          onChange={(e) => set({ on: e.target.checked })}
          style={{ width: 16, height: 16, accentColor: "#6366f1", cursor: "pointer" }}
        />
        {label}
      </label>

      {value.on && (
        <div style={{ marginTop: "0.8rem", display: "grid", gap: "0.7rem" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => set(splitWhen(presetTime(preset)))}
                style={{
                  padding: "0.35rem 0.6rem",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: "0.7rem", gridTemplateColumns: "1fr 1fr" }}>
            <Field label="Date" type="date" value={value.date} onChange={(v) => set({ date: v })} />
            <Field label="Time" type="time" value={value.time} onChange={(v) => set({ time: v })} />
          </div>

          <p style={{ margin: 0, fontSize: 12, color: past ? "#f59e0b" : "var(--muted)" }}>
            {past
              ? "That time has already passed — it will alert as soon as you save."
              : `Alerts ${formatWhen(target)}.`}
          </p>
        </div>
      )}
    </div>
  );
}
