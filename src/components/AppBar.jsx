import { useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { WEATHER_ICONS } from "../lib/constants.js";
import { formatDate } from "../lib/dates.js";
import { formatWhen } from "../lib/reminders.js";
import { Btn } from "./Btn.jsx";
import { Field } from "./Field.jsx";
import { Modal } from "./Modal.jsx";
import { Wordmark } from "./Logo.jsx";
import { WhenPicker, whenToTimestamp, whenValue } from "./WhenPicker.jsx";

/**
 * Sticky top bar: wordmark, the day being viewed, streak, next reminder, and
 * the quick-reminder dialog. Stays out of the way on a phone — one row of
 * chrome, everything else is a chip.
 */
export function AppBar() {
  const {
    selectedDay, today, isToday, isFuture, setSelectedDay, dark, toggleDark, weather, weatherCtl, reminders,
    notifications, stats, setTab,
  } = useTracker();

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [when, setWhen] = useState(() => whenValue(true));

  async function save() {
    if (!text.trim()) return;
    if (notifications.supported && notifications.permission === "default") await notifications.request();
    reminders.add({ text, at: whenToTimestamp(when) });
    setText("");
    setWhen(whenValue(true));
    setOpen(false);
  }

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 800,
          margin: "0 -0.9rem 0.9rem",
          padding: "calc(0.6rem + env(safe-area-inset-top)) 0.9rem 0.6rem",
          background: "var(--glass)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Wordmark />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {weatherCtl.pref === "on" && (
              <Chip tone="var(--text)" onClick={() => setTab("settings")}>
                {weather
                  ? <>{WEATHER_ICONS[weather.desc] || WEATHER_ICONS.default} {weather.temp}°C</>
                  : weatherCtl.status === "error" ? "☁ weather unavailable" : "☁ weather…"}
              </Chip>
            )}
            {weatherCtl.nudge && !weatherCtl.error && (
              <Chip onClick={weatherCtl.enable}>☁ Enable weather</Chip>
            )}
            <Btn size="icon" variant="ghost" onClick={() => setOpen(true)} title="New reminder">＋</Btn>
            <Btn size="icon" variant="ghost" onClick={toggleDark} title={dark ? "Light mode" : "Dark mode"}>
              {dark ? "☀" : "☾"}
            </Btn>
          </div>
        </div>

        <div
          className="no-scrollbar"
          style={{ display: "flex", gap: 6, marginTop: 8, overflowX: "auto", paddingBottom: 2 }}
        >
          <Chip>{isToday ? "Today" : formatDate(selectedDay).split(",")[0]} · {formatDate(selectedDay).slice(5)}</Chip>
          {stats.streak > 0 && <Chip tone="#f59e0b">🔥 {stats.streak}-day streak</Chip>}
          {reminders.next && (
            <Chip tone="#f59e0b" onClick={() => setTab("reminders")}>
              🔔 {reminders.next.text} · {formatWhen(reminders.next.at)}
            </Chip>
          )}
          {/* Being on another day is easy to forget — this is both the reminder
              and the way back. A future day is planned, not edited. */}
          {!isToday && (
            <Chip tone={isFuture ? "#6366f1" : "#f59e0b"} onClick={() => setSelectedDay(today)}>
              {isFuture ? "planning a future day" : "editing a past day"} · back to today
            </Chip>
          )}
        </div>

        {(weatherCtl.askable || weatherCtl.error) && (
          <div
            className="fade"
            style={{
              marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
              padding: "0.5rem 0.65rem", borderRadius: 14, background: "var(--card)",
              border: `1px solid ${weatherCtl.error ? "#ef444466" : "var(--border)"}`, boxShadow: "var(--shadow-1)",
            }}
          >
            {weatherCtl.error ? (
              <>
                <span style={{ flex: "1 1 200px", fontSize: 12, lineHeight: 1.35, color: "#ef4444" }}>{weatherCtl.error}</span>
                <Btn size="sm" variant="ghost" onClick={weatherCtl.dismissError}>Dismiss</Btn>
                <Btn size="sm" onClick={weatherCtl.enable}>Try again</Btn>
              </>
            ) : (
              <>
                <span style={{ flex: "1 1 180px", fontSize: 12, lineHeight: 1.35, color: "var(--muted)" }}>
                  <strong style={{ color: "var(--text)" }}>☀ Show the weather up here?</strong>{" "}
                  Needs your location, only for this. Nothing else uses it.
                </span>
                <Btn size="sm" variant="ghost" onClick={weatherCtl.disable}>No thanks</Btn>
                <Btn size="sm" onClick={weatherCtl.enable}>Allow</Btn>
              </>
            )}
          </div>
        )}
      </header>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New reminder"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={!text.trim()}>Schedule</Btn>
          </>
        }
      >
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <Field label="Remind me to…" value={text} onChange={setText} autoFocus placeholder="Call the dentist" onEnter={save} />
          <WhenPicker value={when} onChange={setWhen} label="Pick a time" />
        </div>
      </Modal>
    </>
  );
}

function Chip({ children, tone, onClick }) {
  const style = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    whiteSpace: "nowrap",
    maxWidth: 230,
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontSize: 11.5,
    fontWeight: 600,
    padding: "0.3rem 0.6rem",
    borderRadius: 999,
    color: tone || "var(--muted)",
    background: "var(--card)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-1)",
  };

  if (!onClick) return <span style={style}>{children}</span>;
  return (
    <button type="button" className="pressable" onClick={onClick} style={{ ...style, cursor: "pointer" }}>
      {children}
    </button>
  );
}
