import { SPLIT_COUNTS } from "../lib/constants.js";
import { money } from "../lib/format.js";
import {
  ME, ME_LABEL, buildSplit, nameOf, perHead, splitDifference,
} from "../lib/splits.js";
import { haptic } from "../lib/haptics.js";
import { Avatar } from "./Avatar.jsx";
import { Segmented } from "./Segmented.jsx";

/**
 * "Split this bill" editor, controlled by the parent.
 *
 *   const [split, setSplit] = useState(splitValue());
 *   <SplitPicker value={split} onChange={setSplit} total={amount} people={people} />
 *   … on save:  buildSplit(splitInput(split, total))
 *
 * You are always a participant when you're the payer — you can't owe yourself,
 * but your share still has to come out of the total.
 */

export function splitValue() {
  return { on: false, payerId: ME, ids: [ME], mode: "equal", custom: {} };
}

/** Turns the editor state into buildSplit() input. */
export function splitInput(value, total) {
  return {
    total,
    payerId: value.payerId,
    participantIds: value.ids,
    mode: value.mode,
    custom: value.custom,
  };
}

export function SplitPicker({ value, onChange, total, people, onAddPeople }) {
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

  const built = value.on ? buildSplit(splitInput(value, amount)) : null;
  const diff = built && value.mode === "custom" ? splitDifference(built, amount) : 0;
  const head = perHead(amount, value.ids.length);

  return (
    <div
      style={{
        padding: "0.85rem",
        borderRadius: 16,
        background: "var(--bg-2)",
        border: `1px solid ${value.on ? "var(--accent)" : "var(--border)"}`,
        boxShadow: "var(--shadow-press)",
      }}
    >
      <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontSize: 13.5, fontWeight: 700 }}>
        <input
          type="checkbox"
          checked={value.on}
          onChange={(e) => { haptic("toggle"); set({ on: e.target.checked }); }}
          style={{ width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer" }}
        />
        Split this bill
        {value.on && amount > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
            {money(head)} each
          </span>
        )}
      </label>

      {value.on && people.length === 0 && (
        <div style={{ marginTop: "0.8rem", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
          You haven&rsquo;t added anyone yet.{" "}
          <button
            type="button"
            onClick={onAddPeople}
            style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", fontWeight: 700, cursor: "pointer" }}
          >
            Add people in the Split tab
          </button>{" "}
          and they&rsquo;ll show up here.
        </div>
      )}

      {value.on && people.length > 0 && (
        <div style={{ marginTop: "0.85rem", display: "grid", gap: "0.8rem" }}>
          <div>
            <Label>Split between {value.ids.length}</Label>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
              {SPLIT_COUNTS.filter((n) => n <= people.length + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className="pressable"
                  onClick={() => pickCount(n)}
                  style={{
                    padding: "0.3rem 0.65rem",
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: `1px solid ${value.ids.length === n ? "var(--accent)" : "var(--border)"}`,
                    background: value.ids.length === n ? "var(--accent-soft)" : "var(--card)",
                    color: value.ids.length === n ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  {n} people
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "0.3rem 0.6rem 0.3rem 0.3rem",
                      borderRadius: 999,
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: 700,
                      border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                      background: on ? "var(--accent-soft)" : "var(--card)",
                      color: on ? "var(--text)" : "var(--muted)",
                      boxShadow: on ? "var(--shadow-1)" : "none",
                    }}
                  >
                    <Avatar id={p.id} name={p.name} size={26} dim={!on} />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Who paid</Label>
            <div className="no-scrollbar" style={{ overflowX: "auto", paddingBottom: 2 }}>
              <Segmented
                value={value.payerId}
                onChange={(id) => set({ payerId: id, ids: [...new Set([...value.ids, id])] })}
                options={everyone.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
          </div>

          <div>
            <Label>How</Label>
            <Segmented
              value={value.mode}
              onChange={(mode) => set({ mode })}
              options={[{ value: "equal", label: "Equally" }, { value: "custom", label: "Custom amounts" }]}
            />
          </div>

          {value.mode === "custom" && (
            <div style={{ display: "grid", gap: 6 }}>
              {value.ids.map((id) => (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Avatar id={id} name={nameOf(people, id)} size={28} />
                  <span style={{ flex: 1, fontSize: 13 }}>{nameOf(people, id)}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={value.custom[id] ?? ""}
                    placeholder={String(head)}
                    onChange={(e) => set({ custom: { ...value.custom, [id]: e.target.value } })}
                    style={{
                      width: 96,
                      padding: "0.4rem 0.5rem",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--text)",
                      fontSize: 13,
                      textAlign: "right",
                    }}
                  />
                </div>
              ))}
              <div style={{ fontSize: 11.5, color: diff === 0 ? "#10b981" : "#f59e0b", fontWeight: 600 }}>
                {diff === 0
                  ? "Shares add up to the bill."
                  : diff > 0
                    ? `${money(diff)} still unassigned.`
                    : `${money(-diff)} over the bill.`}
              </div>
            </div>
          )}

          <Summary built={built} people={people} payerId={value.payerId} />
        </div>
      )}
    </div>
  );
}

function Summary({ built, people, payerId }) {
  if (!built) return null;
  const others = built.shares.filter((s) => s.id !== payerId && s.amount > 0);

  return (
    <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>
      {payerId === ME
        ? others.length
          ? <>You paid. {others.map((s) => `${nameOf(people, s.id)} owes ${money(s.amount)}`).join(", ")}.</>
          : <>You paid, and nobody else is in the split.</>
        : <>{nameOf(people, payerId)} paid. You owe {money(built.shares.find((s) => s.id === ME)?.amount || 0)}.</>}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>{children}</div>
  );
}
