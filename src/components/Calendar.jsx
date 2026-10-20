import { useState } from "react";
import { DAYS } from "../lib/constants.js";
import { addMonths, firstWeekdayOfMonth, getTodayKey } from "../lib/dates.js";
import { monthDays, monthKeyOf, monthLabel } from "../lib/insights.js";
import { Btn } from "./Btn.jsx";

/**
 * A month grid you tap a day on — no native `<input type="date">` involved,
 * so it looks and behaves the same on every device this runs on. Days after
 * `max` (today, by default) are greyed out and can't be selected.
 */
export function Calendar({ value, onSelect, max, min }) {
  const today = getTodayKey();
  const cap = max || today;
  const [viewMonth, setViewMonth] = useState(monthKeyOf(value || cap));

  const days = monthDays(viewMonth, null); // full month; capping is per-day below
  const offset = firstWeekdayOfMonth(viewMonth);
  const atCapMonth = viewMonth >= monthKeyOf(cap);
  const atFloorMonth = min && viewMonth <= monthKeyOf(min);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Btn size="icon" variant="ghost" title="Previous month" disabled={atFloorMonth} onClick={() => setViewMonth((m) => addMonths(m, -1))}>
          ‹
        </Btn>
        <div style={{ fontWeight: 800, fontSize: 14.5 }}>{monthLabel(viewMonth)}</div>
        <Btn size="icon" variant="ghost" title="Next month" disabled={atCapMonth} onClick={() => setViewMonth((m) => addMonths(m, 1))}>
          ›
        </Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
        {DAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "var(--muted)" }}>
            {d[0]}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {Array.from({ length: offset }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map((key) => {
          const disabled = key > cap || (min && key < min);
          const selected = key === value;
          const isToday = key === today;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(key)}
              className={disabled ? "" : "pressable"}
              style={{
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: selected ? 800 : 600,
                border: isToday && !selected ? "1.5px solid var(--accent)" : "1px solid transparent",
                background: selected ? "var(--accent)" : "transparent",
                color: disabled ? "var(--muted)" : selected ? "#fff" : "var(--text)",
                opacity: disabled ? 0.35 : 1,
                cursor: disabled ? "default" : "pointer",
              }}
            >
              {Number(key.slice(-2))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
