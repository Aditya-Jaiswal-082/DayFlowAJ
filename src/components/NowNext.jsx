import { effectiveEnd, formatClock, formatDuration, formatRange, spanOf } from "../lib/schedule.js";

/**
 * What is happening now, or what is next, on today's timeline. `rows` is the
 * timeline as `{ task, status }` (status from blockStatus) in clock order;
 * `list` is the same tasks without the wrapper, for working out when a single
 * moment ends. Renders nothing when there is no timeline.
 */
export function NowNext({ rows, list, nowMin }) {
  if (!rows.length) return null;
  const current = rows.find((r) => r.status === "active");
  const next = rows.find((r) => r.status === "upcoming");

  let label;
  let title;
  let detail;
  let pct = null;

  if (current) {
    const t = current.task;
    label = "Now";
    title = t.text;
    detail = t.end != null
      ? `${formatRange(t)}, ${formatDuration(effectiveEnd(t, list) - nowMin)} left`
      : formatRange(t);
    if (t.end != null) pct = Math.min(100, Math.max(0, ((nowMin - t.start) / Math.max(1, spanOf(t))) * 100));
  } else if (next) {
    label = "Up next";
    title = next.task.text;
    detail = `${formatClock(next.task.start)}, in ${formatDuration(next.task.start - nowMin)}`;
  } else {
    return (
      <div style={{ padding: "0.8rem 1rem", fontSize: 14, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
        Nothing else on today&rsquo;s timeline.
      </div>
    );
  }

  return (
    <div style={{ padding: "0.85rem 1rem 0.9rem", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: current ? "var(--accent)" : "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, margin: "1px 0 2px", letterSpacing: -0.2, wordBreak: "break-word" }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--muted)" }}>{detail}</div>
      {pct != null && (
        <div style={{ height: 4, borderRadius: 2, background: "var(--bg-2)", marginTop: 10, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)" }} />
        </div>
      )}
    </div>
  );
}
