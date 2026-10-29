import { useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { formatDate, getTodayKey } from "../lib/dates.js";
import { money } from "../lib/format.js";
import { ME, involves, nameOf, owedBetween, payersOf, settleSuggestion, splitExpenses } from "../lib/splits.js";
import { gridCols } from "../styles/theme.js";
import {
  Avatar, Btn, Card, Empty, Field, Modal, SectionTitle, Segmented, StatTile,
} from "../components/index.js";

/**
 * The khata. Who owes whom, every shared bill, and settling up.
 * Balances are derived — nothing here stores a number twice.
 */
export function SplitTab() {
  const { people, expenses, split, openInsight, setTab, toasts } = useTracker();

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");

  const [settleFor, setSettleFor] = useState(null);   // ledger row
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState("in");
  const [date, setDate] = useState(getTodayKey());
  const [note, setNote] = useState("");

  const shared = splitExpenses(expenses.all);

  function savePerson() {
    const person = people.add(name);
    if (!person) {
      toasts.push({ message: name.trim() ? `${name.trim()} is already on the list.` : "Give them a name first." });
      return;
    }
    setName("");
    setAddOpen(false);
    toasts.push({ message: `${person.name} added. They'll show up when you split a bill.` });
  }

  function openSettle(row) {
    const suggestion = settleSuggestion(row.net);
    setSettleFor(row);
    setAmount(suggestion ? String(suggestion.amount) : "");
    setDirection(suggestion ? suggestion.direction : "in");
    setDate(getTodayKey());
    setNote("");
  }

  function saveSettle() {
    const ok = people.settle({ personId: settleFor.personId, amount, direction, date, note });
    if (!ok) {
      toasts.push({ message: "Enter an amount above zero." });
      return;
    }
    toasts.push({
      message: direction === "in"
        ? `${money(amount)} received from ${settleFor.name}.`
        : `${money(amount)} paid to ${settleFor.name}.`,
    });
    setSettleFor(null);
  }

  function removePerson(row) {
    const usedIn = shared.filter(
      (e) => involves(e.split, row.personId),
    ).length;
    const result = people.remove(row.personId, { usedIn });
    if (result === "in-use") {
      toasts.push({
        message: `${row.name} appears in ${usedIn} shared ${usedIn === 1 ? "bill" : "bills"} — removing them would rewrite those.`,
      });
    }
  }

  return (
    <div style={{ display: "grid", gap: "0.75rem" }} className="stagger">
      <div style={gridCols(150)}>
        <StatTile
          label="You'll get"
          value={money(split.totals.youllGet)}
          hint={`${split.rows.filter((r) => r.net > 0).length} owe you`}
        />
        <StatTile
          label="You'll pay"
          value={money(split.totals.youllPay)}
          hint={`${split.rows.filter((r) => r.net < 0).length} to settle`}
        />
        <StatTile
          label="Net position"
          value={(split.totals.net >= 0 ? "+" : "−") + money(Math.abs(split.totals.net)).slice(1)}
          hint={split.totals.net === 0 ? "all square" : split.totals.net > 0 ? "in your favour" : "you're behind"}
        />
      </div>

      <Card>
        <SectionTitle
          hint="Tap someone for their full ledger"
          right={<Btn size="sm" onClick={() => setAddOpen(true)}>+ Person</Btn>}
        >
          People ({people.all.length})
        </SectionTitle>

        {people.all.length === 0 ? (
          <Empty icon="◑">
            Add the people you split bills with — flatmates, family, whoever. They become fixed
            accounts you can pick from every time you log an expense.
          </Empty>
        ) : (
          <div style={{ display: "grid", gap: 7 }}>
            {split.rows.map((row) => {
              const settled = row.net === 0;
              const theyOwe = row.net > 0;
              return (
                <div
                  key={row.personId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "0.6rem 0.7rem",
                    borderRadius: 15,
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openInsight({ kind: "person", personId: row.personId })}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0,
                      background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", textAlign: "left",
                    }}
                  >
                    <Avatar id={row.personId} name={row.name} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>{row.name}</span>
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                        {settled ? "settled up" : theyOwe ? "owes you" : "you owe"}
                        {row.entries.length ? ` · ${row.entries.length} entries` : ""}
                      </span>
                    </span>
                  </button>

                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                      color: settled ? "var(--muted)" : theyOwe ? "#10b981" : "#ef4444",
                    }}
                  >
                    {settled ? "₹0" : money(Math.abs(row.net))}
                  </span>

                  {settled ? (
                    <Btn size="sm" variant="danger" onClick={() => removePerson(row)} title="Remove person" feedback="warn">✕</Btn>
                  ) : (
                    <Btn size="sm" variant="ghost" onClick={() => openSettle(row)}>Settle</Btn>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle
          hint={shared.length ? `${shared.length} shared so far` : undefined}
          right={<Btn size="sm" variant="ghost" onClick={() => setTab("expenses")}>+ Split a bill</Btn>}
        >
          Shared bills
        </SectionTitle>

        {shared.length === 0 ? (
          <Empty icon="▤">
            Nothing split yet. Log an expense on the Money tab and switch on{" "}
            <strong style={{ fontWeight: 700 }}>Split this bill</strong>.
          </Empty>
        ) : (
          <div style={{ display: "grid", gap: 7 }}>
            {shared.slice(0, 15).map((e) => {
              const payers = payersOf(e.split);
              const paidLabel = payers.length > 1
                ? payers.map((x) => `${x.id === ME ? "you" : nameOf(people.all, x.id)} paid ${money(x.amount)}`).join(" · ")
                : payers[0]?.id === ME ? "you paid" : `${nameOf(people.all, payers[0]?.id)} paid`;
              const net = e.split.shares
                .filter((s) => s.id !== ME)
                .reduce((sum, o) => sum + owedBetween(e.split, ME, o.id), 0);
              return (
                <div
                  key={e.id}
                  style={{
                    padding: "0.65rem 0.7rem",
                    borderRadius: 15,
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, wordBreak: "break-word" }}>{e.desc}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                        {formatDate(e.date)} · {e.cat} · {paidLabel}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" }}>{money(e.amount)}</span>
                    <Btn size="sm" variant="quiet" onClick={() => expenses.unshare(e.id)} title="Remove the split, keep the expense">unsplit</Btn>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                    {e.split.shares.map((s) => (
                      <span
                        key={s.id}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: 11, fontWeight: 700, padding: "0.2rem 0.5rem 0.2rem 0.2rem",
                          borderRadius: 999, background: "var(--card)", border: "1px solid var(--border)",
                        }}
                      >
                        <Avatar id={s.id} name={nameOf(people.all, s.id)} size={20} />
                        {money(s.amount)}
                      </span>
                    ))}
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      {e.split.mode === "equal" ? `split ${e.split.shares.length} ways` : "custom split"}
                      {net > 0 ? ` · ${money(net)} owed to you` : net < 0 ? ` · you owe ${money(-net)}` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {people.settlements.length > 0 && (
        <Card>
          <SectionTitle>Payments</SectionTitle>
          <div style={{ display: "grid", gap: 6 }}>
            {people.settlements.slice(0, 10).map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "0.55rem 0.7rem", borderRadius: 13,
                  background: "var(--bg-2)", border: "1px solid var(--border)",
                }}
              >
                <Avatar id={s.personId} name={nameOf(people.all, s.personId)} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5 }}>
                    {s.direction === "in" ? `${nameOf(people.all, s.personId)} paid you` : `You paid ${nameOf(people.all, s.personId)}`}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {formatDate(s.date)}{s.note ? ` · ${s.note}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: s.direction === "in" ? "#10b981" : "#ef4444" }}>
                  {s.direction === "in" ? "+" : "−"}{money(s.amount).slice(1)}
                </span>
                <Btn size="sm" variant="danger" onClick={() => people.unsettle(s.id)} title="Remove payment" feedback="warn">✕</Btn>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a person"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Btn>
            <Btn onClick={savePerson} disabled={!name.trim()}>Add</Btn>
          </>
        }
      >
        <Field label="Name" value={name} onChange={setName} autoFocus placeholder="Rahul" onEnter={savePerson} />
        <p style={{ margin: "0.7rem 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
          They become a fixed account: pick them when you split a bill and the balance builds up here.
        </p>
      </Modal>

      <Modal
        open={!!settleFor}
        onClose={() => setSettleFor(null)}
        title={settleFor ? `Settle with ${settleFor.name}` : ""}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setSettleFor(null)}>Cancel</Btn>
            <Btn onClick={saveSettle} disabled={!(parseFloat(amount) > 0)}>Record payment</Btn>
          </>
        }
      >
        {settleFor && (
          <div style={{ display: "grid", gap: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Avatar id={settleFor.personId} name={settleFor.name} size={44} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {settleFor.net > 0 ? `Owes you ${money(settleFor.net)}` : `You owe ${money(-settleFor.net)}`}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  from {settleFor.entries.length} {settleFor.entries.length === 1 ? "entry" : "entries"}
                </div>
              </div>
            </div>

            <Segmented
              full
              value={direction}
              onChange={setDirection}
              options={[
                { value: "in", label: "They paid me" },
                { value: "out", label: "I paid them" },
              ]}
            />

            <Field label="Amount" type="number" min="0" step="0.01" value={amount} onChange={setAmount} placeholder="0.00" />
            <Field label="Date" type="date" max={getTodayKey()} value={date} onChange={setDate} />
            <Field label="Note" value={note} onChange={setNote} placeholder="Optional — cash, UPI, …" />

            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
              Recording the full amount brings the balance to zero. A part payment leaves the rest open.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
