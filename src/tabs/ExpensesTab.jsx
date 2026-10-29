import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

import { useTracker } from "../context/TrackerContext.jsx";
import { COLORS, EXPENSE_CATS } from "../lib/constants.js";
import { formatDate, getTodayKey } from "../lib/dates.js";
import { money } from "../lib/format.js";
import { monthKeyOf, monthLabel } from "../lib/insights.js";
import { groupExpensesByMonth } from "../lib/stats.js";
import { ME, buildSplit, isSplit, nameOf, owedBetween, splitDifference } from "../lib/splits.js";
import { gridCols } from "../styles/theme.js";
import {
  Avatar, Btn, Card, ChartFrame, Empty, Field, ProgressBar, SectionTitle, Segmented,
  SplitPicker, StatTile, paidGap, splitInput, splitValue,
} from "../components/index.js";

const blankForm = () => ({ amount: "", desc: "", cat: "Other", date: getTodayKey() });

/** Log spending, split it, watch budgets, and tap anything for its full story. */
export function ExpensesTab() {
  const { expenses, people, stats, chart, setTab, openInsight, month, setMonth, toasts } = useTracker();
  const [form, setForm] = useState(blankForm);
  const [split, setSplit] = useState(splitValue);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const total = parseFloat(form.amount) || 0;
  const hasDesc = form.desc.trim().length > 0;
  const valid = total > 0 && hasDesc;

  function save() {
    if (!valid) {
      toasts.push({ message: total > 0 ? "Add a short description first." : "Enter an amount first." });
      return;
    }
    if (split.on && people.all.length > 0 && split.ids.length < 2) {
      toasts.push({ message: "Pick who you're splitting with — tap Edit on the split row." });
      return;
    }
    if (split.on && people.all.length === 0) {
      toasts.push({ message: "Add the people you split with in the Split tab first — or switch Split off." });
      return;
    }
    let block = null;
    if (split.on && people.all.length) {
      block = buildSplit(splitInput(split, total));
      if (block && paidGap(split, total) !== 0) {
        toasts.push({ message: "What was paid doesn't add up to the bill yet — tap Edit on the split row." });
        return;
      }
      // A custom split that doesn't add up would quietly lose money.
      if (block && split.mode === "custom" && splitDifference(block, total) !== 0) {
        toasts.push({ message: "The custom shares don't add up to the bill yet." });
        return;
      }
    }

    if (expenses.add({ ...form, split: block })) {
      // Keep category, date and the split setup — you usually log several in a row.
      setForm((f) => ({ ...blankForm(), cat: f.cat, date: f.date }));
      setMonth(monthKeyOf(form.date));   // so the new entry is right there in History
      if (!block) toasts.push({ message: `Saved ${money(total)} · ${form.desc.trim()}` });
      if (block) {
        const net = block.shares
          .filter((x) => x.id !== ME)
          .reduce((sum, x) => sum + owedBetween(block, ME, x.id), 0);
        toasts.push({
          message: net > 0
            ? `Split ${block.shares.length} ways — ${money(net)} owed to you.`
            : net < 0
              ? `Split ${block.shares.length} ways — you owe ${money(-net)}.`
              : `Split ${block.shares.length} ways — all square.`,
        });
      }
    }
  }

  const inMonth = expenses.all.filter((e) => String(e.date).startsWith(month));

  /** The whole log, newest first, grouped by month (a month with no date is filed under "Undated"). */
  const [toggled, setToggled] = useState({});
  const history = useMemo(() => groupExpensesByMonth(expenses.all), [expenses.all]);

  return (
    <div style={{ display: "grid", gap: "0.75rem" }} className="stagger">
      <div style={gridCols(150)}>
        <StatTile
          label="This month"
          value={money(stats.expense.month)}
          onClick={() => openInsight({ kind: "month" })}
          hint="tap for the breakdown"
        />
        <StatTile
          label="Last 7 days"
          value={money(stats.spendTrend.now)}
          delta={stats.spendTrend.change}
        />
        <StatTile label="Entries" numeric={stats.expense.count} hint={money(stats.expense.all) + " all time"} />
      </div>

      <Card>
        <SectionTitle right={<Btn size="sm" onClick={save}>Add</Btn>}>Log an expense</SectionTitle>
        <div style={{ ...gridCols(140), gap: "0.6rem" }}>
          <Field
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(v) => set({ amount: v })}
            placeholder="0.00"
            onEnter={save}
          />
          <Field label="Description *" value={form.desc} onChange={(v) => set({ desc: v })} placeholder="e.g. Lunch with Riya" onEnter={save} />
          <Field label="Category (optional)" options={EXPENSE_CATS} value={form.cat} onChange={(v) => set({ cat: v })} />
          <Field label="Date" type="date" max={getTodayKey()} value={form.date} onChange={(v) => set({ date: v })} />
        </div>

        <div style={{ marginTop: "0.75rem" }}>
          <SplitPicker
            value={split}
            onChange={setSplit}
            total={total}
            people={people.all}
            onAddPeople={() => setTab("split")}
          />
        </div>
      </Card>

      <Card>
        <SectionTitle hint={`${expenses.all.length} ${expenses.all.length === 1 ? "entry" : "entries"} · every month, newest first`}>
          History
        </SectionTitle>
        {history.length === 0 ? (
          <Empty icon="▤">Nothing logged yet. Add your first expense above.</Empty>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {history.map((g) => {
              const open = toggled[g.key] ?? g.key === (history.some((h) => h.key === month) ? month : history[0]?.key);
              return (
                <section key={g.key}>
                  <button
                    type="button"
                    className="pressable"
                    onClick={() => setToggled((t) => ({ ...t, [g.key]: !open }))}
                    aria-expanded={open}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "0.6rem 0.75rem",
                      borderRadius: 14, cursor: "pointer", textAlign: "left", color: "var(--text)", font: "inherit",
                      background: open ? "var(--accent-soft)" : "var(--bg-2)",
                      border: `1px solid ${open ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    <span aria-hidden="true" style={{ fontSize: 11, color: "var(--muted)", width: 12 }}>{open ? "▾" : "▸"}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>
                      {g.key === "undated" ? "Undated" : monthLabel(g.key)}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
                      {g.items.length} {g.items.length === 1 ? "entry" : "entries"}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{money(g.total)}</span>
                  </button>

                  {open && (
                    <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                      {g.items.map((e) => (
                        <div
                          key={e.id}
                          style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "0.6rem 0.7rem",
                            borderRadius: 13, background: "var(--bg-2)", border: "1px solid var(--border)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => e.date && openInsight({ kind: "day", key: e.date })}
                            title="See this day"
                            style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit" }}
                          >
                            <div
                              style={{
                                fontSize: 14, fontWeight: 600, wordBreak: "break-word",
                                ...(e.desc ? {} : { color: "var(--muted)", fontStyle: "italic", fontWeight: 500 }),
                              }}
                            >
                              {e.desc || "No description"}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 1 }}>
                              {e.cat || "Uncategorised"} · {e.date ? formatDate(e.date) : "no date"}
                              {isSplit(e) && (
                                <span
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700,
                                    color: "var(--accent)", background: "var(--accent-soft)",
                                    padding: "0.1rem 0.4rem", borderRadius: 999,
                                  }}
                                >
                                  split {e.split.shares.length}
                                  {e.split.shares.slice(0, 3).map((s) => (
                                    <Avatar key={s.id} id={s.id} name={nameOf(people.all, s.id)} size={15} />
                                  ))}
                                </span>
                              )}
                            </div>
                          </button>
                          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{money(e.amount)}</div>
                          <Btn variant="danger" size="sm" onClick={() => expenses.remove(e.id)} title="Delete" feedback="warn">🗑</Btn>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle hint="Tap a category for its trend and budget">Month</SectionTitle>
        <div className="no-scrollbar" style={{ overflowX: "auto", paddingBottom: 2 }}>
          <Segmented
            value={month}
            onChange={setMonth}
            options={stats.months.map((m) => ({ value: m, label: monthLabel(m).replace(/ \d{4}$/, "") }))}
          />
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: "0.9rem" }}>
          {EXPENSE_CATS.map((cat) => {
            const spent = inMonth
              .filter((e) => e.cat === cat)
              .reduce((s, e) => s + (Number(e.amount) || 0), 0);
            if (!spent && !expenses.budgets[cat]) return null;
            const cap = Number(expenses.budgets[cat]) || 0;
            const pct = cap ? Math.round((spent / cap) * 100) : 0;
            const over = cap && spent > cap;

            return (
              <button
                key={cat}
                type="button"
                className="pressable"
                onClick={() => openInsight({ kind: "category", cat, monthKey: month })}
                style={{
                  textAlign: "left",
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "0.7rem 0.75rem",
                  cursor: "pointer",
                  color: "inherit",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: cap ? 6 : 0 }}>
                  <span style={{ fontWeight: 700 }}>{cat}</span>
                  <span style={{ color: over ? "#ef4444" : "var(--muted)" }}>
                    {money(spent)}{cap ? ` / ${money(cap)}` : ""}
                    {over ? ` · ${money(spent - cap)} over` : ""}
                  </span>
                </div>
                {cap ? <ProgressBar pct={pct} /> : null}
              </button>
            );
          })}

          {stats.budgets.length === 0 && (
            <Empty icon="▤">
              No budgets set yet.{" "}
              <button
                type="button"
                onClick={() => setTab("settings")}
                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, fontWeight: 700 }}
              >
                Set caps in Settings
              </button>{" "}
              to track how you&rsquo;re doing.
            </Empty>
          )}
        </div>
      </Card>

      {stats.expenseByCat.length > 0 && (
        <ChartFrame title="All-time split" height={240} hint="Tap a slice for that category">
          <PieChart>
            <Pie
              data={stats.expenseByCat}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={86}
              paddingAngle={3}
              onClick={(slice) => slice?.name && openInsight({ kind: "category", cat: slice.name, monthKey: month })}
            >
              {stats.expenseByCat.map((row, i) => (
                <Cell key={row.name} fill={COLORS[i % COLORS.length]} stroke={chart.tip.background} strokeWidth={2} cursor="pointer" />
              ))}
            </Pie>
            <Tooltip contentStyle={chart.tip} formatter={(v, n) => [money(v), n]} />
            <Legend wrapperStyle={{ fontSize: 12, color: chart.axis }} />
          </PieChart>
        </ChartFrame>
      )}

    </div>
  );
}
