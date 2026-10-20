import { effectiveEnd, formatClock, formatDuration, formatRange, spanOf } from "../lib/schedule.js";

/**
 * "Happening now" / "Next up" for a day's timed tasks. `rows` is the timeline
 * as `{ task, status }` (status from blockStatus) in clock order; `list` is the
 * same tasks without the wrapper, for working out when a single moment ends.
 * Renders nothing when there is no timeline.
 */
export function NowNext({ rows, list, nowMin }) {
  if (!rows.length) return null;
  const current = rows.find((r) => r.status === "active");
  const next = rows.find((r) => r.status === "upcoming");

  if (current) {
    const t = current.task;
    const pct = t.end != null ? Math.min(100, Math.max(0, ((nowMin - t.start) / Math.max(1, spanOf(t))) * 100)) : null;
    return (
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent)" }}>HAPPENING NOW</div>
        <div style={{ fontSize: 18, fontWeight: 800, margin: "2px 0" }}>{t.text}</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
          {formatRange(t)}
          {t.end != null && ` · ${formatDuration(effectiveEnd(t, list) - nowMin)} left`}
        </div>
        {pct != null && (
          <div style={{ height: 6, borderRadius: 99, background: "var(--bg-2)", marginTop: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 99 }} />
          </div>
        )}
      </div>
    );
  }

  if (next) {
    return (
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)" }}>NEXT UP</div>
        <div style={{ fontSize: 18, fontWeight: 800, margin: "2px 0" }}>{next.task.text}</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
          {formatClock(next.task.start)} · in {formatDuration(next.task.start - nowMin)}
        </div>
      </div>
    );
  }

  return <div style={{ fontSize: 14, fontWeight: 700 }}>That&rsquo;s everything on today&rsquo;s timeline.</div>;
}
