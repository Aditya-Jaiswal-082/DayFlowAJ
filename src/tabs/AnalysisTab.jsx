import {
  BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Cell,
} from "recharts";

import { useTracker } from "../context/TrackerContext.jsx";
import { MOOD_OPTS, MOOD_SCORE } from "../lib/constants.js";
import { formatDate } from "../lib/dates.js";
import { money } from "../lib/format.js";
import { anchorDayInMonth, monthLabel } from "../lib/insights.js";
import { inputStyle } from "../styles/theme.js";
import {
  Btn, Card, ChartFrame, Empty, ProgressBar, SectionTitle, StatTile,
} from "../components/index.js";

const AMBER = "#b7791f";
const MOOD_NAME = Object.fromEntries(MOOD_OPTS.map((m) => [MOOD_SCORE[m.val], m.label]));
const compact = (v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : v);

/** Every chart point is a tap target: it opens the insight for that day. */
export function AnalysisTab() {
  const {
    stats, chart, openInsight, month, setMonth, setSelectedDay, tasks, today, selectedDay, catColor,
  } = useTracker();

  /** Picking a month re-centres the whole page on it, not just the button, so
   *  every "last 7 days" chart below moves with it. */
  const pickMonth = (m) => {
    setMonth(m);
    setSelectedDay(anchorDayInMonth(tasks.dayData, m, today));
  };

  const axis = { stroke: chart.axis, fontSize: 11, tickLine: false, axisLine: false };
  const openDay = (e) => {
    const key = e?.activePayload?.[0]?.payload?.key;
    if (key) openInsight({ kind: "day", key });
  };

  const logged = stats.weekdays.filter((d) => d.n);
  const best = [...logged].sort((a, b) => b.pct - a.pct)[0];
  const worst = [...logged].sort((a, b) => a.pct - b.pct)[0];
  const moodLogged = stats.mood.some((m) => m.score);
  const dayLabel = selectedDay === today ? "Today" : formatDate(selectedDay);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "0.75rem", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        <StatTile
          label="Done, 7 days"
          numeric={stats.completionTrend.now}
          suffix="%"
          delta={stats.completionTrend.change}
          onClick={() => openInsight({ kind: "month" })}
        />
        <StatTile
          label="Spent, 7 days"
          value={money(stats.spendTrend.now)}
          delta={stats.spendTrend.change}
          deltaGoodWhenUp={false}
          onClick={() => openInsight({ kind: "month" })}
        />
        <StatTile
          label="Streak"
          numeric={stats.streaks.current}
          suffix={stats.streaks.current === 1 ? " day" : " days"}
          hint={`Best ${stats.streaks.best}`}
        />
      </div>

      <Card>
        <SectionTitle hint="Moves every chart below to that month">Month</SectionTitle>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            aria-label="Month"
            value={month}
            onChange={(e) => pickMonth(e.target.value)}
            style={{ ...inputStyle, flex: 1, minHeight: 44, fontSize: 16 }}
          >
            {stats.months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <Btn variant="ghost" size="lg" onClick={() => openInsight({ kind: "month", monthKey: month })}>
            Full breakdown
          </Btn>
        </div>
      </Card>

      <ChartFrame title="Completion" hint="Last 7 days. Tap a point for that day.">
        <LineChart data={stats.trend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} onClick={openDay}>
          <CartesianGrid stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} width={36} tickFormatter={(v) => `${v}%`} {...axis} />
          <Tooltip contentStyle={chart.tip} formatter={(v) => [`${v}%`, "Completed"]} />
          <Line
            type="linear"
            dataKey="pct"
            stroke={chart.accent}
            strokeWidth={2}
            dot={{ r: 3.5, fill: chart.accent, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ChartFrame>

      <Card>
        <SectionTitle hint={best && worst && best.day !== worst.day ? `Best on ${best.day}, weakest on ${worst.day}. Last six weeks.` : "Last six weeks"}>
          By weekday
        </SectionTitle>
        <div style={{ display: "grid", gap: 4 }}>
          {stats.weekdays.map((d) => (
            <div key={d.day} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 32 }}>
              <span style={{ width: 36, fontSize: 13, color: "var(--muted)" }}>{d.day}</span>
              <div style={{ flex: 1 }}><ProgressBar pct={d.pct} height={8} /></div>
              <span style={{ width: 40, textAlign: "right", fontSize: 13, fontWeight: 600 }}>{d.n ? `${d.pct}%` : "n/a"}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle hint={dayLabel}>By category</SectionTitle>
        {stats.radar.length === 0 ? (
          <Empty>Add a few regular tasks to see how each category is going.</Empty>
        ) : (
          <div style={{ display: "grid", gap: 4 }}>
            {stats.radar.map((r) => (
              <div key={r.cat} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 32 }}>
                <span style={{ width: 92, display: "flex", alignItems: "center", gap: 7, fontSize: 13, minWidth: 0 }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: catColor(r.cat), flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.cat}</span>
                </span>
                <div style={{ flex: 1 }}><ProgressBar pct={r.pct} height={8} color={catColor(r.cat)} /></div>
                <span style={{ width: 40, textAlign: "right", fontSize: 13, fontWeight: 600 }}>{r.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ChartFrame
        title="Mood"
        hint="Last 7 days. Days with no mood are left blank."
        empty={moodLogged ? null : "No mood logged in the last 7 days. Pick one on the Today tab."}
      >
        <LineChart data={stats.mood} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} onClick={openDay}>
          <CartesianGrid stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} width={42} tickFormatter={(v) => MOOD_NAME[v] || ""} {...axis} />
          <Tooltip contentStyle={chart.tip} formatter={(v) => [MOOD_NAME[v] || "Not logged", "Mood"]} />
          <Line
            type="linear"
            dataKey="score"
            connectNulls={false}
            stroke={AMBER}
            strokeWidth={2}
            dot={{ r: 3.5, fill: AMBER, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ChartFrame>

      <ChartFrame title="Spending" hint="Last 7 days. Tap a bar for that day.">
        <BarChart data={stats.expenseByDay} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} onClick={openDay}>
          <CartesianGrid stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis width={40} tickFormatter={compact} {...axis} />
          <Tooltip contentStyle={chart.tip} cursor={{ fill: chart.grid, opacity: 0.4 }} formatter={(v) => [money(v), "Spent"]} />
          <Bar dataKey="amount" radius={[3, 3, 0, 0]} maxBarSize={36}>
            {stats.expenseByDay.map((row) => (
              <Cell key={row.key} fill={row.amount ? chart.accent : chart.grid} cursor="pointer" />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>

      {stats.history.length < 3 && (
        <Empty>Keep logging for a few days and the patterns above will fill in.</Empty>
      )}
    </div>
  );
}