import { useMemo, useState } from "react";

import { useTracker } from "../context/TrackerContext.jsx";
import { EXPENSE_CATS } from "../lib/constants.js";
import { formatDate, getTodayKey } from "../lib/dates.js";
import { money } from "../lib/format.js";
import { monthKeyOf, monthLabel } from "../lib/insights.js";
import { groupExpensesByMonth } from "../lib/stats.js";
import { ME, buildSplit, isSplit, nameOf, owedBetween, splitDifference } from "../lib/splits.js";
import { inputStyle, labelStyle } from "../styles/theme.js";
import {
  Btn, Card, Empty, Field, Modal, ProgressBar, SectionTitle, SplitPicker, StatTile,
  paidGap, splitInput, splitValue,
} from "../components/index.js";

const RED = "#c0392b";
const blankForm = () => ({ amount: "", desc: "", cat: "Other", date: getTodayKey() });

/** "Split with Riya, Sam" for the history row. */
function splitText(e, people) {
  const others = e.split.shares.filter((s) => s.id !== ME).map((s) => nameOf(people, s.id));
  if (others.length === 0) return "Split";
  return others.length > 2 ? `Split with ${others.slice(0, 2).join(", ")} +${others.length - 2}` : `Split with ${others.join(", ")}`;
}

/** Log spending, split it, fix mistakes, watch budgets, and tap anything for its full story. */
export function ExpensesTab() {
  const { expenses, people, stats, setTab, openInsight, month, setMonth, toasts } = useTracker();
  const [form, setForm] = useState(blankForm);
  const [split, setSplit] = useState(splitValue);
  const [edit, setEdit] = useState(null);       // { id, amount, desc, cat, date, split } while the edit sheet is open

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const total = parseFloat(form.amount) || 0;
  const valid = total > 0 && form.desc.trim().length > 0;

  function save() {
    if (!valid) {
      toasts.push({ message: total > 0 ? "Add a short description first." : "Enter an amount first." });
      return;
    }
    if (split.on && people.all.length === 0) {
      toasts.push({ message: "Add the people you split with in the Split tab first, or switch Split off." });
      return;
    }
    if (split.on && split.ids.length < 2) {
      toasts.push({ message: "Pick who you're splitting with. Tap Edit on the split row." });
      return;
    }
    let block = null;
    if (split.on) {
      block = buildSplit(splitInput(split, total));
      if (block && paidGap(split, total) !== 0) {
        toasts.push({ message: "What was paid doesn't add up to the bill yet. Tap Edit on the split row." });
        return;
      }
      // A custom split that doesn't add up would quietly lose money.
      if (block && split.mode === "custom" && splitDifference(block, total) !== 0) {
        toasts.push({ message: "The custom shares don't add up to the bill yet." });
        return;
      }
    }

    if (expenses.add({ ...form, split: block })) {
      // Keep category, date and the split setup: you usually log several in a row.
      setForm((f) => ({ ...blankForm(), cat: f.cat, date: f.date }));
      setMonth(monthKeyOf(form.date));   // so the new entry is right there in History
      if (!block) {
        toasts.push({ message: `Saved ${money(total)} for ${form.desc.trim()}.` });
      } else {
        const net = block.shares
          .filter((x) => x.id !== ME)
          .reduce((sum, x) => sum + owedBetween(block, ME, x.id), 0);
        const ways = `Split ${block.shares.length} ways.`;
        toasts.push({
          message: net > 0 ? `${ways} ${money(net)} owed to you.` : net < 0 ? `${ways} You owe ${money(-net)}.` : `${ways} All square.`,
        });
      }
    }
  }

  /* ── fixing an entry ── */

  const openEdit = (e) => setEdit({ id: e.id, amount: String(e.amount), desc: e.desc || "", cat: e.cat || "Other", date: e.date || getTodayKey(), split: isSplit(e) });
  const editValid = edit && edit.desc.trim() && (edit.split || parseFloat(edit.amount) > 0);

  function saveEdit() {
    if (!editValid) return;
    if (expenses.update(edit.id, edit)) setEdit(null);
  }

  /* ── what the page shows ── */

  const inMonth = expenses.all.filter((e) => String(e.date).startsWith(month));
  const history = useMemo(() => groupExpensesByMonth(expenses.all), [expenses.all]);
  const [toggled, setToggled] = useState({});
  const defaultOpen = history.some((h) => h.key === month) ? month : history[0]?.key;
  const allTime = stats.expenseByCat.reduce((s, r) => s + r.value, 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "0.75rem", maxWidth: 680, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        <StatTile label="This month" value={money(stats.expense.month)} onClick={() => openInsight({ kind: "month" })} />
        <StatTile label="Last 7 days" value={money(stats.spendTrend.now)} delta={stats.spendTrend.change} deltaGoodWhenUp={false} />
        <StatTile label="Entries" numeric={stats.expense.count} hint={`${money(stats.expense.all)} total`} />
      </div>

      <Card>
        <SectionTitle>Log an expense</SectionTitle>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div>
            <label style={labelStyle} htmlFor="exp-amount">Amount</label>
            <input
              id="exp-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => set({ amount: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              placeholder="0"
              style={{ ...inputStyle, fontSize: 24, fontWeight: 700, minHeight: 54 }}
            />
          </div>
          <Field label="What was it for?" value={form.desc} onChange={(v) => set({ desc: v })} placeholder="e.g. Lunch with Riya" onEnter={save} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.6rem" }}>
            <Field label="Category" options={EXPENSE_CATS} value={form.cat} onChange={(v) => set({ cat: v })} />
            <Field label="Date" type="date" max={getTodayKey()} value={form.date} onChange={(v) => set({ date: v })} />
          </div>
          <SplitPicker value={split} onChange={setSplit} total={total} people={people.all} onAddPeople={() => setTab("split")} />
          <Btn size="lg" full onClick={save} disabled={!valid}>Add expense</Btn>
        </div>
      </Card>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "0.95rem 1rem 0.3rem" }}>
          <SectionTitle hint={`${expenses.all.length} ${expenses.all.length === 1 ? "entry" : "entries"}, newest first. Tap one to fix it.`}>
            History
          </SectionTitle>
        </div>
        {history.length === 0 ? (
          <div style={{ padding: "0 1rem 1rem" }}><Empty>Nothing logged yet. Add your first expense above.</Empty></div>
        ) : (
          history.map((g) => {
            const open = toggled[g.key] ?? g.key === defaultOpen;
            return (
              <section key={g.key} style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  type="button"
                  className="pressable"
                  onClick={() => setToggled((t) => ({ ...t, [g.key]: !open }))}
                  aria-expanded={open}
                  style={{
                    width: "100%", minHeight: 56, display: "flex", alignItems: "center", gap: 10, padding: "0.5rem 1rem",
                    cursor: "pointer", textAlign: "left", color: "var(--text)", font: "inherit",
                    background: open ? "var(--bg-2)" : "transparent", border: "none",
                  }}
                >
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                    style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 150ms ease", flexShrink: 0 }}
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>
                      {g.key === "undated" ? "Undated" : monthLabel(g.key)}
                    </span>
                    <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)" }}>
                      {g.items.length} {g.items.length === 1 ? "entry" : "entries"}
                    </span>
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{money(g.total)}</span>
                </button>

                {open && g.items.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="pressable"
                    onClick={() => openEdit(e)}
                    style={{
                      width: "100%", minHeight: 58, display: "flex", alignItems: "center", gap: 12, padding: "0.5rem 1rem",
                      cursor: "pointer", textAlign: "left", color: "inherit", font: "inherit",
                      background: "transparent", border: "none", borderTop: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: "block", fontSize: 15, fontWeight: 500, wordBreak: "break-word",
                          ...(e.desc ? {} : { color: "var(--muted)", fontStyle: "italic" }),
                        }}
                      >
                        {e.desc || "No description"}
                      </span>
                      <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)" }}>
                        {e.cat || "Uncategorised"}, {e.date ? formatDate(e.date) : "no date"}
                        {isSplit(e) ? `. ${splitText(e, people.all)}` : ""}
                      </span>
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>{money(e.amount)}</span>
                  </button>
                ))}
              </section>
            );
          })
        )}
      </Card>

      <Card>
        <SectionTitle hint="Tap a category for its trend and budget.">By category</SectionTitle>
        <select
          aria-label="Month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ ...inputStyle, minHeight: 44, fontSize: 16, marginBottom: "0.5rem" }}
        >
          {stats.months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>

        {EXPENSE_CATS.map((cat) => {
          const spent = inMonth.filter((e) => e.cat === cat).reduce((s, e) => s + (Number(e.amount) || 0), 0);
          const cap = Number(expenses.budgets[cat]) || 0;
          if (!spent && !cap) return null;
          const pct = cap ? Math.round((spent / cap) * 100) : 0;
          const over = cap && spent > cap;
          return (
            <button
              key={cat}
              type="button"
              className="pressable"
              onClick={() => openInsight({ kind: "category", cat, monthKey: month })}
              style={{
                width: "100%", textAlign: "left", background: "none", border: "none", borderTop: "1px solid var(--border)",
                padding: "0.7rem 0", minHeight: 52, cursor: "pointer", color: "inherit", font: "inherit",
              }}
            >
              <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 15, marginBottom: cap ? 7 : 0 }}>
                <span style={{ fontWeight: 600 }}>{cat}</span>
                <span style={{ color: over ? RED : "var(--muted)", fontSize: 14 }}>
                  {money(spent)}{cap ? ` of ${money(cap)}` : ""}
                </span>
              </span>
              {cap ? <ProgressBar pct={pct} height={6} /> : null}
              {over ? <span style={{ display: "block", fontSize: 12.5, color: RED, marginTop: 5 }}>{money(spent - cap)} over budget</span> : null}
            </button>
          );
        })}

        {inMonth.length === 0 && (
          <Empty>Nothing logged in {monthLabel(month)}.</Empty>
        )}
        {stats.budgets.length === 0 && (
          <p style={{ margin: "0.7rem 0 0", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>
            No budgets set.{" "}
            <button
              type="button"
              onClick={() => setTab("settings")}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, font: "inherit", fontWeight: 600, textDecoration: "underline" }}
            >
              Set limits in Settings
            </button>{" "}
            to see how each category is doing.
          </p>
        )}
      </Card>

      {stats.expenseByCat.length > 0 && (
        <Card>
          <SectionTitle hint="Share of everything you've logged.">All time</SectionTitle>
          <div style={{ display: "grid", gap: 2 }}>
            {[...stats.expenseByCat].sort((a, b) => b.value - a.value).map((row) => (
              <button
                key={row.name}
                type="button"
                className="pressable"
                onClick={() => openInsight({ kind: "category", cat: row.name, monthKey: month })}
                style={{ display: "grid", gap: 6, padding: "0.55rem 0", background: "none", border: "none", textAlign: "left", cursor: "pointer", color: "inherit", font: "inherit", minHeight: 48 }}
              >
                <span style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span>{row.name}</span>
                  <span style={{ color: "var(--muted)" }}>{money(row.value)}, {Math.round((row.value / allTime) * 100)}%</span>
                </span>
                <ProgressBar pct={(row.value / allTime) * 100} height={6} />
              </button>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Edit expense"
        footer={
          <>
            <Btn variant="danger" feedback="warn" onClick={() => { expenses.remove(edit.id); setEdit(null); }}>Delete</Btn>
            <span style={{ flex: 1 }} />
            <Btn variant="ghost" onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn onClick={saveEdit} disabled={!editValid}>Save</Btn>
          </>
        }
      >
        {edit && (
          <div style={{ display: "grid", gap: "0.8rem" }}>
            {edit.split ? (
              <div style={{ fontSize: 13.5, lineHeight: 1.5, padding: "0.65rem 0.75rem", borderRadius: 8, background: "var(--bg-2)" }}>
                <strong>{money(edit.amount)}</strong> is split between people, so the amount is locked. To change it,
                delete this and log it again, or{" "}
                <button
                  type="button"
                  onClick={() => { expenses.unshare(edit.id); setEdit(null); }}
                  style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 600, color: "var(--accent)", textDecoration: "underline", cursor: "pointer" }}
                >
                  stop splitting it
                </button>.
              </div>
            ) : (
              <Field label="Amount" type="number" min="0" step="0.01" value={edit.amount} onChange={(v) => setEdit({ ...edit, amount: v })} onEnter={saveEdit} />
            )}
            <Field label="What was it for?" value={edit.desc} onChange={(v) => setEdit({ ...edit, desc: v })} onEnter={saveEdit} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.6rem" }}>
              <Field label="Category" options={EXPENSE_CATS} value={EXPENSE_CATS.includes(edit.cat) ? edit.cat : "Other"} onChange={(v) => setEdit({ ...edit, cat: v })} />
              <Field label="Date" type="date" max={getTodayKey()} value={edit.date} onChange={(v) => setEdit({ ...edit, date: v })} />
            </div>
            <div>
              <Btn size="sm" variant="quiet" onClick={() => { openInsight({ kind: "day", key: edit.date }); setEdit(null); }}>
                See that day
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}