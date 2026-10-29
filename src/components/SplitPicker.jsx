import { useState } from "react";
import { SPLIT_COUNTS } from "../lib/constants.js";
import { money } from "../lib/format.js";
import {
  ME, ME_LABEL, buildSplit, nameOf, owedBetween, paidDifference, perHead, splitDifference,
} from "../lib/splits.js";
import { haptic } from "../lib/haptics.js";
import { Avatar } from "./Avatar.jsx";
import { Btn } from "./Btn.jsx";
import { Modal } from "./Modal.jsx";
import { Segmented } from "./Segmented.jsx";

/**
 * "Split this bill", controlled by the parent. In the form it is one slim row
 * with a switch; turning it on (or tapping Edit) opens a sheet — full-width on
 * a phone, a card on desktop — where you pick who's in, who paid and how.
 *
 *   const [split, setSplit] = useState(splitValue());
 *   <SplitPicker value={split} onChange={setSplit} total={amount} people={people} />
 *   … on save:  buildSplit(splitInput(split, total))
 *
 * You are always a participant when you're the payer — you can't owe yourself,
 * but your share still has to come out of the total.
 */

export function splitValue() {
  return { on: false, payerId: ME, ids: [ME], mode: "equal", custom: {}, payMode: "one", paid: {} };
}

/**
 * What each person put in, when several paid. Typed amounts are used as they
 * are; if exactly one person's box is blank it is filled with whatever is left
 * of the bill, so with two people you only ever type one number.
 */
export function effectivePaid(value, total) {
  const typed = {};
  const blank = [];
  value.ids.forEach((id) => {
    const raw = value.paid[id];
    if (raw === undefined || raw === "") blank.push(id);
    else typed[id] = Number(raw) || 0;
  });
  if (blank.length === 1) {
    const used = Object.values(typed).reduce((s, n) => s + n, 0);
    typed[blank[0]] = Math.max(0, Math.round((Number(total) - used) * 100) / 100);
  }
  return typed;
}

/** Turns the editor state into buildSplit() input. */
export function splitInput(value, total) {
  return {
    total,
    payerId: value.payerId,
    participantIds: value.ids,
    mode: value.mode,
    custom: value.custom,
    paid: value.payMode === "many" ? effectivePaid(value, total) : null,
  };
}

/** How far what was paid is from the bill (0 = adds up); always 0 when one person paid. */
export function paidGap(value, total) {
  if (value.payMode !== "many") return 0;
  const block = buildSplit(splitInput(value, total));
  return block ? paidDifference(block, total) : 0;
}

export function SplitPicker({ value, onChange, total, people, onAddPeople }) {
  const [open, setOpen] = useState(false);
  const set = (patch) => onChange({ ...value, ...patch });
  const amount = Number(total) || 0;
  const everyone = [{ id: ME, name: ME_LABEL }, ...people];

  function toggle(id) {
    haptic("tap");
    const has = value.ids.includes(id);
    const ids = has ? value.ids.filter((x) => x !== id) : [...value.ids, id];
    // The payer must stay in the split, otherwise the shares can't add up.
    if (!ids.includes(value.payerId)) ids.push(value.payerId);
    set({ ids });
  }

  /** Quick "split between N": you plus the first N−1 people. */
  function pickCount(n) {
    haptic("tap");
    const others = people.slice(0, Math.max(0, n - 1)).map((p) => p.id);
    const ids = [...new Set([ME, ...others, value.payerId])];
    set({ ids, mode: "equal" });
  }

  function flip(on) {
    haptic("toggle");
    // With a few people on the list, start with all of them in (untick whoever
    // isn't); with more, start empty so a bill is never split with the wrong crowd.
    const fresh = value.ids.length < 2 && people.length > 0 && people.length <= 3;
    set(on && fresh ? { on, ids: [...new Set([value.payerId, ME, ...people.map((p) => p.id)])] } : { on });
    if (on) setOpen(true);
  }

  const built = value.on ? buildSplit(splitInput(value, amount)) : null;
  const diff = built && value.mode === "custom" ? splitDifference(built, amount) : 0;
  const head = perHead(amount, value.ids.length);
  const paidNow = effectivePaid(value, amount);
  const gap = paidGap(value, amount);
  const shareFor = (id) => built?.shares.find((x) => x.id === id)?.amount ?? 0;

  return (
    <>
      {/* the slim row that lives in the form */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 10,
          padding: "0.7rem 0.8rem",
          borderRadius: 16,
          background: value.on ? "var(--accent-soft)" : "var(--bg-2)",
          border: `1px solid ${value.on ? "var(--accent)" : "var(--border)"}`,
          transition: "background 200ms ease, border-color 200ms ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <Switch on={value.on} onChange={flip} label="Split this bill" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Split this bill</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
              {!value.on
                ? "Share it with friends or flatmates"
                : amount > 0
                  ? `${money(head)} each`
                  : "Enter an amount above"}
            </div>
          </div>
          {value.on && <Btn size="sm" variant="ghost" onClick={() => setOpen(true)}>Edit</Btn>}
        </div>

        {value.on && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ display: "inline-flex", flexShrink: 0 }}>
              {value.ids.slice(0, 5).map((id, i) => (
                <span key={id} style={{ marginLeft: i ? -8 : 0, display: "inline-flex" }}>
                  <Avatar id={id} name={nameOf(people, id)} size={26} />
                </span>
              ))}
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {value.ids.length} {value.ids.length === 1 ? "person" : "people"}
              {value.payerId === ME ? " · you paid" : ` · ${nameOf(people, value.payerId)} paid`}
            </span>
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Split this bill"
        footer={
          <>
            <Btn variant="ghost" onClick={() => { flip(false); setOpen(false); }}>Don&rsquo;t split</Btn>
            <Btn onClick={() => setOpen(false)}>Done</Btn>
          </>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "1.1rem", paddingTop: 4 }}>
          {/* hero: the maths at a glance */}
          <div
            style={{
              textAlign: "center",
              padding: "1rem 0.8rem",
              borderRadius: 20,
              background: "linear-gradient(160deg, var(--accent-soft), var(--bg-2))",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>
              {amount > 0 ? `${money(amount)} between ${value.ids.length}` : "Enter the amount first"}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, color: "var(--accent)", marginTop: 2 }}>
              {amount > 0 ? money(head) : "—"}
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", letterSpacing: 0 }}> each</span>
            </div>
          </div>

          {people.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, textAlign: "center", padding: "0.5rem 0.5rem 1rem" }}>
              You haven&rsquo;t added anyone to split with yet.
              <div style={{ marginTop: 10 }}>
                <Btn onClick={() => { setOpen(false); onAddPeople?.(); }}>Add people</Btn>
              </div>
            </div>
          ) : (
            <>
              <Section title={`Who\u2019s in · ${value.ids.length}`}>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                  {SPLIT_COUNTS.filter((n) => n <= people.length + 1).map((n) => {
                    const on = value.ids.length === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        className="pressable"
                        onClick={() => pickCount(n)}
                        style={{
                          padding: "0.3rem 0.7rem",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                          background: on ? "var(--accent-soft)" : "var(--card)",
                          color: on ? "var(--accent)" : "var(--muted)",
                        }}
                      >
                        {n} people
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 8 }}>
                  {everyone.map((p) => {
                    const on = value.ids.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="pressable"
                        onClick={() => toggle(p.id)}
                        aria-pressed={on}
                        style={{
                          position: "relative",
                          display: "grid",
                          justifyItems: "center",
                          gap: 4,
                          padding: "0.75rem 0.3rem 0.6rem",
                          borderRadius: 18,
                          cursor: "pointer",
                          color: "var(--text)",
                          font: "inherit",
                          border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                          background: on ? "var(--accent-soft)" : "var(--bg-2)",
                          boxShadow: on ? "var(--shadow-1)" : "none",
                          transition: "all 180ms ease",
                        }}
                      >
                        {on && (
                          <span
                            aria-hidden="true"
                            style={{
                              position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%",
                              display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800,
                              color: "#fff", background: "var(--accent)",
                            }}
                          >
                            ✓
                          </span>
                        )}
                        <Avatar id={p.id} name={p.name} size={42} dim={!on} />
                        <span style={{ fontSize: 12.5, fontWeight: 700, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.name}
                        </span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: on ? "var(--accent)" : "var(--muted)" }}>
                          {on && amount > 0 ? money(shareFor(p.id)) : on ? "in" : "out"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Section title="Who paid">
                <div style={{ display: "grid", gap: 10 }}>
                  <Segmented
                    full
                    value={value.payMode}
                    onChange={(payMode) => set({ payMode })}
                    options={[{ value: "one", label: "One person" }, { value: "many", label: "Paid by several" }]}
                  />

                  {value.payMode === "one" ? (
                    <div className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                      {everyone.map((p) => {
                        const on = value.payerId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className="pressable"
                            onClick={() => { haptic("tap"); set({ payerId: p.id, ids: [...new Set([...value.ids, p.id])] }); }}
                            aria-pressed={on}
                            style={{
                              flexShrink: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 7,
                              padding: "0.3rem 0.8rem 0.3rem 0.3rem",
                              borderRadius: 999,
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: 700,
                              border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                              background: on ? "var(--accent-soft)" : "var(--card)",
                              color: on ? "var(--accent)" : "var(--muted)",
                            }}
                          >
                            <Avatar id={p.id} name={p.name} size={26} dim={!on} />
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {value.ids.map((id) => (
                        <div
                          key={id}
                          style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "0.5rem 0.6rem",
                            borderRadius: 14, background: "var(--bg-2)", border: "1px solid var(--border)",
                          }}
                        >
                          <Avatar id={id} name={nameOf(people, id)} size={32} />
                          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700 }}>
                            {nameOf(people, id)} <span style={{ color: "var(--muted)", fontWeight: 600 }}>paid</span>
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            aria-label={`${nameOf(people, id)} paid`}
                            value={value.paid[id] ?? ""}
                            placeholder={paidNow[id] !== undefined ? String(paidNow[id]) : "0"}
                            onChange={(e) => set({ paid: { ...value.paid, [id]: e.target.value } })}
                            style={{
                              width: 104, padding: "0.55rem 0.65rem", borderRadius: 12, border: "1px solid var(--border)",
                              background: "var(--card)", color: "var(--text)", fontSize: 15, fontWeight: 700,
                              textAlign: "right", outline: "none",
                            }}
                          />
                        </div>
                      ))}
                      <div style={{ fontSize: 12, color: gap === 0 ? "#10b981" : "#f59e0b", fontWeight: 700 }}>
                        {gap === 0
                          ? "What was paid adds up to the bill."
                          : gap > 0
                            ? `${money(gap)} of the bill isn’t accounted for yet.`
                            : `${money(-gap)} more than the bill was paid.`}
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              <Section title="How">
                <Segmented
                  full
                  value={value.mode}
                  onChange={(mode) => set({ mode })}
                  options={[{ value: "equal", label: "Equally" }, { value: "custom", label: "Custom shares" }]}
                />
              </Section>

              {value.mode === "custom" && (
                <div style={{ display: "grid", gap: 8 }}>
                  {value.ids.map((id) => (
                    <div
                      key={id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "0.5rem 0.6rem",
                        borderRadius: 14, background: "var(--bg-2)", border: "1px solid var(--border)",
                      }}
                    >
                      <Avatar id={id} name={nameOf(people, id)} size={32} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700 }}>{nameOf(people, id)}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        aria-label={`${nameOf(people, id)}'s share`}
                        value={value.custom[id] ?? ""}
                        placeholder={String(head)}
                        onChange={(e) => set({ custom: { ...value.custom, [id]: e.target.value } })}
                        style={{
                          width: 104,
                          padding: "0.55rem 0.65rem",
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          color: "var(--text)",
                          fontSize: 15,
                          fontWeight: 700,
                          textAlign: "right",
                          outline: "none",
                        }}
                      />
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: diff === 0 ? "#10b981" : "#f59e0b", fontWeight: 700 }}>
                    {diff === 0
                      ? "Shares add up to the bill."
                      : diff > 0
                        ? `${money(diff)} still unassigned.`
                        : `${money(-diff)} over the bill.`}
                  </div>
                </div>
              )}

              <Summary built={built} people={people} />
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

/** An iOS-style switch. */
function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        position: "relative",
        width: 46,
        height: 28,
        flexShrink: 0,
        borderRadius: 999,
        cursor: "pointer",
        border: "1px solid var(--border)",
        background: on ? "var(--accent)" : "var(--bg-2)",
        boxShadow: "var(--shadow-press)",
        transition: "background 200ms ease",
        padding: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 2,
          left: on ? 20 : 2,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(8,12,23,0.35)",
          transition: "left 200ms cubic-bezier(.34,1.56,.64,1)",
        }}
      />
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.3, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Summary({ built, people }) {
  if (!built) return null;
  const lines = built.shares
    .map((x) => x.id)
    .filter((id) => id !== ME)
    .map((id) => ({ id, amount: owedBetween(built, ME, id) }))
    .filter((l) => l.amount !== 0);

  return (
    <div
      style={{
        padding: "0.8rem 0.9rem", borderRadius: 16, background: "var(--bg-2)", border: "1px dashed var(--border)",
        fontSize: 13, lineHeight: 1.6,
      }}
    >
      <strong>Result — added to the khata automatically</strong>
      {lines.length === 0 ? (
        <div style={{ color: "var(--muted)" }}>Nobody owes anybody anything on this bill.</div>
      ) : (
        lines.map((l) => (
          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
            <span>{l.amount > 0 ? `${nameOf(people, l.id)} owes you` : `You owe ${nameOf(people, l.id)}`}</span>
            <strong style={{ color: l.amount > 0 ? "#10b981" : "#ef4444" }}>{money(Math.abs(l.amount))}</strong>
          </div>
        ))
      )}
    </div>
  );
}
