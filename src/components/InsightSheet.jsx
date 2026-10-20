import { useTracker } from "../context/TrackerContext.jsx";
import { Btn } from "./Btn.jsx";
import { Modal } from "./Modal.jsx";
import { Delta } from "./Delta.jsx";
import { ProgressBar } from "./ProgressBar.jsx";
import { CircleProgress } from "./CircleProgress.jsx";

/**
 * Renders whatever `openInsight()` produced — a day, a month, an expense
 * category or a task. All four share the same shape (stats, facts, rows), so
 * one panel covers them, and adding a fifth kind needs no changes here.
 */
export function InsightSheet() {
  const { insight, closeInsight, setSelectedDay, setTab } = useTracker();
  if (!insight) return null;

  const openDay = insight.kind === "day"
    ? () => { setSelectedDay(insight.key); setTab("today"); closeInsight(); }
    : null;

  return (
    <Modal
      open
      onClose={closeInsight}
      title={insight.title}
      footer={
        <>
          {openDay && <Btn variant="ghost" onClick={openDay}>Open this day</Btn>}
          <Btn onClick={closeInsight}>Done</Btn>
        </>
      }
    >
      <div style={{ display: "grid", gap: "0.9rem", paddingBottom: "0.4rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {typeof insight.pct === "number" && (
            <CircleProgress pct={insight.pct} size={78} stroke={8} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{insight.subtitle}</div>
            {insight.delta !== undefined && (
              <div style={{ marginTop: 6 }}>
                <Delta value={insight.delta} goodWhenUp={insight.deltaGoodWhenUp !== false} />
                <span style={{ fontSize: 11.5, color: "var(--muted)", marginLeft: 6 }}>vs previous month</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
          {insight.stats.map((s) => (
            <div
              key={s.label}
              style={{
                padding: "0.6rem 0.55rem",
                borderRadius: 14,
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-press)",
              }}
            >
              <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2, letterSpacing: -0.3 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {insight.budget && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
              <span style={{ fontWeight: 600 }}>Budget</span>
              <span style={{ color: insight.budget.pct > 100 ? "#ef4444" : "var(--muted)" }}>{insight.budget.pct}% used</span>
            </div>
            <ProgressBar pct={insight.budget.pct} />
          </div>
        )}

        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 7 }}>
          {insight.facts.map((f, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: 9,
                fontSize: 13.2,
                lineHeight: 1.45,
                padding: "0.55rem 0.7rem",
                borderRadius: 12,
                background: "var(--accent-soft)",
              }}
            >
              <span aria-hidden="true" style={{ color: "var(--accent)", fontWeight: 800 }}>·</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {insight.note && (
          <div
            style={{
              fontSize: 13,
              padding: "0.6rem 0.7rem",
              borderRadius: 12,
              border: "1px dashed var(--border)",
              whiteSpace: "pre-wrap",
            }}
          >
            <span style={{ color: "var(--muted)", fontWeight: 600 }}>Note: </span>{insight.note}
          </div>
        )}

        {insight.rows.length > 0 && (
          <div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 700, marginBottom: 6 }}>Breakdown</div>
            <div style={{ display: "grid", gap: 5 }}>
              {insight.rows.map((r, i) => (
                <div
                  key={`${r.label}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0.5rem 0.65rem",
                    borderRadius: 11,
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      flexShrink: 0,
                      background: r.ok ? "#10b981" : "#ef4444",
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 13, minWidth: 0, wordBreak: "break-word" }}>{r.label}</span>
                  {r.meta && <span style={{ fontSize: 11, color: "var(--muted)" }}>{r.meta}</span>}
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
