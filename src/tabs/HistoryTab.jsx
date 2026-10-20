import { useTracker } from "../context/TrackerContext.jsx";
import { MOOD_OPTS } from "../lib/constants.js";
import { formatDate } from "../lib/dates.js";
import { monthLabel } from "../lib/insights.js";
import { Card, CircleProgress, Empty, SectionTitle, Segmented } from "../components/index.js";

/** Every recorded day. Tapping one opens its insight, which offers to edit it. */
export function HistoryTab() {
  const { stats, tasks, pctFor, selectedDay, today, openInsight, month, setMonth } = useTracker();

  const days = stats.history.filter((k) => k.startsWith(month));

  return (
    <div style={{ display: "grid", gap: "0.75rem" }} className="stagger">
      <Card>
        <SectionTitle hint="Tap a day for its insight">Day history</SectionTitle>
        <div className="no-scrollbar" style={{ overflowX: "auto", paddingBottom: 2 }}>
          <Segmented
            value={month}
            onChange={setMonth}
            options={stats.months.map((m) => ({ value: m, label: monthLabel(m).replace(/ \d{4}$/, "") }))}
          />
        </div>
      </Card>

      <Card>
        {days.length === 0 ? (
          <Empty icon="◵">Nothing recorded in {monthLabel(month)}.</Empty>
        ) : (
          <div style={{ display: "grid", gap: 7 }}>
            {days.map((key) => {
              const day = tasks.getDay(key);
              const mood = MOOD_OPTS.find((m) => m.val === day.mood);
              const active = key === selectedDay;
              const regular = stats.tasksOn(key).length;
              const pct = pctFor(key);

              return (
                <button
                  key={key}
                  type="button"
                  className="pressable"
                  onClick={() => openInsight({ kind: "day", key })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    textAlign: "left",
                    padding: "0.6rem 0.7rem",
                    borderRadius: 15,
                    cursor: "pointer",
                    color: "var(--text)",
                    background: active ? "var(--accent-soft)" : "var(--bg-2)",
                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  <CircleProgress pct={pct} size={44} stroke={5} animate={false} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                      {formatDate(key)}{key === today ? " · Today" : ""}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      {regular} regular · {day.special.length} special · {day.extra.length} extra
                      {mood ? ` · ${mood.emoji} ${mood.label}` : ""}
                      {day.note ? " · 📝" : ""}
                    </div>
                  </div>
                  <span aria-hidden="true" style={{ fontSize: 15, color: "var(--muted)" }}>›</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
