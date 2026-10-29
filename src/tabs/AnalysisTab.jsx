import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  CartesianGrid, XAxis, YAxis, Tooltip, Cell,
} from "recharts";

import { useTracker } from "../context/TrackerContext.jsx";
import { MOOD_OPTS, MOOD_SCORE } from "../lib/constants.js";
import { money } from "../lib/format.js";
import { anchorDayInMonth, monthLabel } from "../lib/insights.js";
import { gridCols } from "../styles/theme.js";
import {
  Card, ChartFrame, Empty, ProgressBar, SectionTitle, Segmented, StatTile,
} from "../components/index.js";

const moodLabel = (score) =>
  (MOOD_OPTS.find((m) => MOOD_SCORE[m.val] === score) || {}).label || "not logged";

/** Every chart point is a tap target — it opens the insight for that day. */
export function AnalysisTab() {
  const { stats, chart, openInsight, month, setMonth, setSelectedDay, tasks, today } = useTracker();

  /** Picking a month should re-centre the whole page on it, not just change
   *  what the "Open" button points to — otherwise every "last 7 days" chart
   *  below stays anchored on whatever day it already was. */
  const pickMonth = (m) => {
    setMonth(m);
    setSelectedDay(anchorDayInMonth(tasks.dayData, m, today));
  };

  const axis = { stroke: chart.axis, fontSize: 11, tickLine: false };
  const openDay = (e) => {
    const key = e?.activePayload?.[0]?.payload?.key;
    if (key) openInsight({ kind: "day", key });
  };

  const weekBest = [...stats.weekdays].sort((a, b) => b.pct - a.pct)[0];
  const weekWorst = [...stats.weekdays].filter((d) => d.n).sort((a, b) => a.pct - b.pct)[0];

  return (
    <div style={{ display: "grid", gap: "0.75rem" }} className="stagger">
      <div style={gridCols(150)}>
        <StatTile
          label="Completion, 7d"
          numeric={stats.completionTrend.now}
          suffix="%"
          delta={stats.completionTrend.change}
          hint={`was ${stats.completionTrend.before}%`}
          onClick={() => openInsight({ kind: "month" })}
        />
        <StatTile
          label="Spent, 7d"
          value={money(stats.spendTrend.now)}
          delta={stats.spendTrend.change}
          hint={`was ${money(stats.spendTrend.before)}`}
          onClick={() => openInsight({ kind: "month" })}
        />
        <StatTile
          label="Streak"
          numeric={stats.streaks.current}
          suffix="d"
          hint={`best ${stats.streaks.best}d`}
        />
      </div>

      <Card>
        <SectionTitle
          hint="Pick a month, then open its full breakdown"
          right={
            <button
              type="button"
              className="pressable"
              onClick={() => openInsight({ kind: "month", monthKey: month })}
              style={{
                background: "var(--accent-soft)", border: "1px solid var(--border)", color: "var(--accent)",
                fontWeight: 800, fontSize: 12, padding: "0.35rem 0.6rem", borderRadius: 10, cursor: "pointer",
              }}
            >
              Open {monthLabel(month)}
            </button>
          }
        >
          Month
        </SectionTitle>
        <div className="no-scrollbar" style={{ overflowX: "auto", paddingBottom: 2 }}>
          <Segmented
            value={month}
            onChange={pickMonth}
            options={stats.months.map((m) => ({ value: m, label: monthLabel(m).replace(/ \d{4}$/, "") }))}
          />
        </div>
      </Card>

      <ChartFrame title="Completion — last 7 days" hint="Tap a point for that day">
        <LineChart data={stats.trend} margin={{ top: 6, right: 10, bottom: 0, left: -20 }} onClick={openDay}>
          <defs>
            <linearGradient id="lineFill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={chart.accent2} />
              <stop offset="100%" stopColor={chart.accent} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis domain={[0, 100]} {...axis} />
          <Tooltip contentStyle={chart.tip} formatter={(v) => [`${v}%`, "Completed"]} />
          <Line
            type="monotone"
            dataKey="pct"
            stroke="url(#lineFill)"
            strokeWidth={3}
            dot={{ r: 4, fill: chart.accent, strokeWidth: 2, stroke: chart.tip.background }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ChartFrame>

      <Card>
        <SectionTitle hint={weekBest && weekWorst ? `Strongest ${weekBest.day}, weakest ${weekWorst.day}` : "Six weeks of history"}>
          Which days you keep it up
        </SectionTitle>
        <div style={{ display: "grid", gap: 7 }}>
          {stats.weekdays.map((d) => (
            <div key={d.day} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 34, fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{d.day}</span>
              <div style={{ flex: 1 }}><ProgressBar pct={d.pct} height={9} /></div>
              <span style={{ width: 34, textAlign: "right", fontSize: 12, fontWeight: 700 }}>{d.pct}%</span>
            </div>
          ))}
        </div>
      </Card>

      <div style={gridCols(280)}>
        <ChartFrame
          title="By category (today)"
          height={230}
          empty={stats.radar.length === 0 ? "Add regular tasks to see this breakdown." : null}
        >
          <RadarChart data={stats.radar} outerRadius="70%">
            <PolarGrid stroke={chart.grid} />
            <PolarAngleAxis dataKey="cat" tick={{ fill: chart.axis, fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fill: chart.axis, fontSize: 9 }} axisLine={false} />
            <Tooltip contentStyle={chart.tip} formatter={(v) => [`${v}%`, "Completed"]} />
            <Radar dataKey="pct" stroke="#10b981" fill="#10b981" fillOpacity={0.32} strokeWidth={2} />
          </RadarChart>
        </ChartFrame>

        <ChartFrame title="Mood — last 7 days" height={230} hint="Tap a point for that day">
          <AreaChart data={stats.mood} margin={{ top: 6, right: 10, bottom: 0, left: -20 }} onClick={openDay}>
            <defs>
              <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} {...axis} />
            <Tooltip contentStyle={chart.tip} formatter={(v) => [moodLabel(v), "Mood"]} />
            <Area type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2.5} fill="url(#moodFill)" />
          </AreaChart>
        </ChartFrame>
      </div>

      <ChartFrame title="Spending — last 7 days" hint="Tap a bar for that day">
        <BarChart data={stats.expenseByDay} margin={{ top: 6, right: 10, bottom: 0, left: -8 }} onClick={openDay}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} />
          <Tooltip contentStyle={chart.tip} formatter={(v) => [money(v), "Spent"]} />
          <Bar dataKey="amount" radius={[7, 7, 0, 0]} maxBarSize={40}>
            {stats.expenseByDay.map((row) => (
              <Cell key={row.key} fill={row.amount ? "#10b981" : chart.grid} cursor="pointer" />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>

      {stats.history.length < 3 && (
        <Empty icon="◔">Keep logging for a few days — the patterns above sharpen up fast.</Empty>
      )}
    </div>
  );
}
