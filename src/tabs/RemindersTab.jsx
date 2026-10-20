import { useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { formatWhen, relativeWhen, wasMissed } from "../lib/reminders.js";
import { gridCols } from "../styles/theme.js";
import {
  Btn, Card, Empty, Field, SectionTitle, WhenPicker, whenToTimestamp, whenValue,
} from "../components/index.js";

/** Everything scheduled, plus what already fired. */
export function RemindersTab() {
  const { reminders, notifications, cancelReminder, tasks, openInsight } = useTracker();

  const [text, setText] = useState("");
  const [when, setWhen] = useState(() => whenValue(true));

  async function schedule() {
    if (!text.trim()) return;
    if (notifications.supported && notifications.permission === "default") await notifications.request();
    reminders.add({ text, at: whenToTimestamp(when) });
    setText("");
    setWhen(whenValue(true));
  }

  return (
    <div style={{ display: "grid", gap: "0.75rem" }} className="stagger">
      {notifications.supported && notifications.permission !== "granted" && (
        <Card style={{ borderColor: "#f59e0b66" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ flex: 1, fontSize: 13, minWidth: 180 }}>
              {notifications.permission === "denied"
                ? "Notifications are blocked for this site — reminders still appear inside the app."
                : "Allow notifications and reminders alert you even when this tab is in the background."}
            </span>
            {notifications.permission === "default" && (
              <Btn size="sm" onClick={notifications.request}>Enable</Btn>
            )}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle right={<Btn size="sm" onClick={schedule} disabled={!text.trim()}>Schedule</Btn>}>
          New reminder
        </SectionTitle>
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <Field label="Remind me to…" value={text} onChange={setText} placeholder="Take medication" onEnter={schedule} />
          <WhenPicker value={when} onChange={setWhen} label="Pick a time" />
        </div>
      </Card>

      <div style={gridCols(280)}>
        <Card>
          <SectionTitle hint="Sorted by what's next">Upcoming ({reminders.pending.length})</SectionTitle>
          {reminders.pending.length === 0 ? (
            <Empty icon="◔">Nothing scheduled.</Empty>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {reminders.pending.map((r) => (
                <Row key={r.id}>
                  <button
                    type="button"
                    onClick={r.taskId ? () => openInsight({ kind: "task", taskId: r.taskId }) : undefined}
                    disabled={!r.taskId}
                    style={{
                      flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none",
                      padding: 0, color: "inherit", cursor: r.taskId ? "pointer" : "default",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, wordBreak: "break-word" }}>{r.text}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      {formatWhen(r.at)} · {relativeWhen(r.at)}
                      {r.taskId && tasks.all.some((t) => t.id === r.taskId) ? " · from a task" : ""}
                    </div>
                  </button>
                  <Btn variant="danger" size="sm" onClick={() => cancelReminder(r.id)} title="Cancel" feedback="warn">✕</Btn>
                </Row>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle
            right={reminders.fired.length > 0
              ? <Btn size="sm" variant="quiet" onClick={reminders.clearHistory}>Clear</Btn>
              : null}
          >
            Already fired
          </SectionTitle>
          {reminders.fired.length === 0 ? (
            <Empty icon="◷">No reminders have fired yet.</Empty>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {reminders.fired.map((r) => (
                <Row key={r.id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: "var(--muted)", wordBreak: "break-word" }}>{r.text}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      {formatWhen(r.at)}{wasMissed(r) ? " · delivered late (app was closed)" : ""}
                    </div>
                  </div>
                  <Btn
                    size="sm"
                    variant="quiet"
                    title="Schedule this again"
                    onClick={() => { setText(r.text); setWhen(whenValue(true)); }}
                  >
                    ↻
                  </Btn>
                </Row>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0.6rem 0.7rem",
        borderRadius: 13,
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </div>
  );
}
