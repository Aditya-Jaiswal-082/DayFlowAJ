import { useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { addDays, formatDate } from "../lib/dates.js";
import { Btn } from "./Btn.jsx";
import { Calendar } from "./Calendar.jsx";
import { Card } from "./Card.jsx";
import { Modal } from "./Modal.jsx";

/**
 * Step a day at a time, or open the calendar to jump straight to any date,
 * to see what got ticked — or missed — on any day. Also where a day gets
 * marked a holiday, which brings in the holiday task list below.
 */
export function DayNav() {
  const { today, selectedDay, setSelectedDay, isToday, isWeekend, tasks } = useTracker();
  const [pickerOpen, setPickerOpen] = useState(false);

  const label = formatDate(selectedDay);
  const commaAt = label.indexOf(",");
  const weekday = commaAt === -1 ? label : label.slice(0, commaAt);
  const rest = commaAt === -1 ? "" : label.slice(commaAt + 1).trim();

  function jumpTo(key) {
    setSelectedDay(key);
    setPickerOpen(false);
  }

  const badge = tasks.isHoliday
    ? { text: `🎉 ${tasks.holidayLabel}`, bg: "#f43f8e22", fg: "#f43f8e" }
    : isWeekend
      ? { text: "🌅 Weekend", bg: "var(--bg-2)", fg: "var(--muted)" }
      : null;

  return (
    <>
      <Card style={{ padding: "0.55rem 0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Btn
            size="icon"
            variant="ghost"
            title="Previous day"
            onClick={() => setSelectedDay(addDays(selectedDay, -1))}
          >
            ‹
          </Btn>

          <button
            type="button"
            className="pressable"
            onClick={() => setPickerOpen(true)}
            title="Open the calendar"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              padding: "0.3rem 0.4rem",
              borderRadius: 12,
              cursor: "pointer",
              background: "transparent",
              border: "none",
              color: "var(--text)",
              font: "inherit",
            }}
          >
            <span style={{ fontSize: 14.5, fontWeight: 800 }}>{isToday ? "Today" : weekday}</span>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{rest || label}</span>
          </button>

          <Btn
            size="icon"
            variant="ghost"
            title="Open the calendar"
            onClick={() => setPickerOpen(true)}
          >
            📅
          </Btn>

          <Btn
            size="icon"
            variant="ghost"
            title="Next day"
            onClick={() => setSelectedDay(addDays(selectedDay, 1))}
          >
            ›
          </Btn>
        </div>

        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {badge ? (
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: "0.25rem 0.55rem",
                borderRadius: 999,
                background: badge.bg,
                color: badge.fg,
              }}
            >
              {badge.text}
            </span>
          ) : <span />}

          <div style={{ display: "flex", gap: 6 }}>
            {tasks.isHoliday ? (
              <Btn size="sm" variant="ghost" onClick={() => tasks.clearHoliday(selectedDay)}>
                Unmark holiday
              </Btn>
            ) : (
              <Btn size="sm" variant="ghost" onClick={() => tasks.setHoliday(selectedDay, "Holiday")}>
                Mark as holiday
              </Btn>
            )}
            {!isToday && (
              <Btn size="sm" variant="ghost" onClick={() => setSelectedDay(today)}>Today</Btn>
            )}
          </div>
        </div>
      </Card>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Jump to a date">
        <Calendar value={selectedDay} onSelect={jumpTo} max={addDays(today, 730)} />
      </Modal>
    </>
  );
}
