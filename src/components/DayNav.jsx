import { useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { addDays, formatDate } from "../lib/dates.js";
import { haptic } from "../lib/haptics.js";
import { Btn } from "./Btn.jsx";
import { Calendar } from "./Calendar.jsx";
import { Modal } from "./Modal.jsx";

const Chevron = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

const CalendarIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

const navButton = {
  width: 44,
  height: 44,
  display: "grid",
  placeItems: "center",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  cursor: "pointer",
  flexShrink: 0,
};

/**
 * Step a day at a time, or open the calendar to jump to any date — past days
 * show what was ticked and what slipped, future days are for planning. Also
 * where a day gets marked as a holiday, which brings in the holiday task list.
 */
export function DayNav() {
  const { today, selectedDay, setSelectedDay, isToday, isFuture, isWeekend, tasks } = useTracker();
  const [pickerOpen, setPickerOpen] = useState(false);

  const label = formatDate(selectedDay);
  const commaAt = label.indexOf(",");
  const weekday = commaAt === -1 ? label : label.slice(0, commaAt);
  const rest = commaAt === -1 ? label : label.slice(commaAt + 1).trim();

  function step(delta) {
    haptic("tap");
    setSelectedDay(addDays(selectedDay, delta));
  }

  function jumpTo(key) {
    setSelectedDay(key);
    setPickerOpen(false);
  }

  const dayKind = tasks.isHoliday
    ? { text: tasks.holidayLabel || "Holiday", color: "#b4541a" }
    : isWeekend
      ? { text: "Weekend", color: "var(--muted)" }
      : null;

  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" className="pressable" style={navButton} onClick={() => step(-1)} aria-label="Previous day">
          <Chevron dir="left" />
        </button>

        <button
          type="button"
          className="pressable"
          onClick={() => setPickerOpen(true)}
          aria-label="Pick a date"
          style={{
            flex: 1, minWidth: 0, height: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            border: "none", background: "none", color: "var(--text)", cursor: "pointer", padding: 0,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>{isToday ? "Today" : weekday}</span>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>{rest}</span>
        </button>

        <button type="button" className="pressable" style={navButton} onClick={() => setPickerOpen(true)} aria-label="Open calendar">
          <CalendarIcon />
        </button>
        <button type="button" className="pressable" style={navButton} onClick={() => step(1)} aria-label="Next day">
          <Chevron dir="right" />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 32 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: dayKind?.color }}>
          {dayKind?.text || (isFuture ? "Planning ahead" : !isToday ? "Past day" : "")}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {!isToday && <Btn size="sm" variant="quiet" onClick={() => setSelectedDay(today)}>Back to today</Btn>}
          {tasks.isHoliday ? (
            <Btn size="sm" variant="quiet" onClick={() => tasks.clearHoliday(selectedDay)}>Unmark holiday</Btn>
          ) : (
            <Btn size="sm" variant="quiet" onClick={() => tasks.setHoliday(selectedDay, "Holiday")}>Mark as holiday</Btn>
          )}
        </div>
      </div>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Go to a date">
        <Calendar value={selectedDay} onSelect={jumpTo} max={addDays(today, 730)} />
      </Modal>
    </div>
  );
}
