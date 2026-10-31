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
            <CircleProgress pct={insight.pct} size={72} stroke={7} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>{insight.subtitle}</div>
            {insight.delta !== undefined && (
              <div style={{ marginTop: 6 }}>
                <Delta value={insight.delta} goodWhenUp={insight.deltaGoodWhenUp !== false} />
                <span style={{ fontSize: 12.5, color: "var(--muted)", marginLeft: 6 }}>vs previous month</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
          {insight.stats.map((s) => (
            <div key={s.label} style={{ padding: "0.6rem 0.65rem", borderRadius: 8, background: "var(--bg-2)", minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, overflowWrap: "anywhere" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {insight.budget && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>Budget</span>
              <span style={{ color: insight.budget.pct > 100 ? "#c0392b" : "var(--muted)" }}>{insight.budget.pct}% used</span>
            </div>
            <ProgressBar pct={insight.budget.pct} />
          </div>
        )}

        {insight.facts.length > 0 && (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
            {insight.facts.map((f, i) => (
              <li
                key={i}
                style={{ fontSize: 14, lineHeight: 1.5, paddingLeft: 12, borderLeft: "2px solid var(--accent)" }}
              >
                {f}
              </li>
            ))}
          </ul>
        )}

        {insight.note && (
          <div style={{ fontSize: 14, lineHeight: 1.5, padding: "0.65rem 0.75rem", borderRadius: 8, background: "var(--bg-2)", whiteSpace: "pre-wrap" }}>
            <span style={{ color: "var(--muted)", fontWeight: 600 }}>Note: </span>{insight.note}
          </div>
        )}

        {insight.rows.length > 0 && (
          <div>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>Breakdown</div>
            <div>
              {insight.rows.map((r, i) => (
                <div
                  key={`${r.label}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 44,
                    padding: "0.35rem 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: r.ok ? "var(--accent)" : "#c0392b" }}
                  />
                  <span style={{ flex: 1, fontSize: 14, minWidth: 0, wordBreak: "break-word" }}>{r.label}</span>
                  {r.meta && <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{r.meta}</span>}
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
