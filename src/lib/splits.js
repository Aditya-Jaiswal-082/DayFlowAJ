import { COLORS } from "./constants.js";
import { formatDate } from "./dates.js";
import { money } from "./format.js";

/**
 * The khata: splitting an expense across people, and the running balance with
 * each of them.
 *
 * Model — deliberately a *personal* ledger, not a group settlement solver:
 *   · One payer covers the whole bill.
 *   · Every participant owes the payer their share.
 *   · Only edges that involve you are tracked. If Rahul pays and Priya joins in
 *     but you don't, that's between them — it never lands in your khata.
 *   · A settlement is a payment that moves the balance back towards zero.
 *
 * All amounts are rupees with 2 decimals. Maths runs in paise so shares always
 * sum to the bill exactly — no rupee vanishing into rounding.
 */

export const ME = "me";
export const ME_LABEL = "You";

const toPaise = (n) => Math.round((Number(n) || 0) * 100);
const toRupees = (p) => Math.round(p) / 100;

/** Deterministic avatar colour, so a person always looks the same. */
export function personColor(id) {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return COLORS[h % COLORS.length];
}

export function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function makePerson(name) {
  const clean = String(name || "").trim();
  if (!clean) return null;
  return { id: `p${Date.now()}${Math.random().toString(36).slice(2, 5)}`, name: clean, createdAt: Date.now() };
}

export const nameOf = (people, id) =>
  (id === ME ? ME_LABEL : (people.find((p) => p.id === id) || {}).name) || "Someone";

/**
 * Split a total equally, distributing the leftover paise one at a time.
 * splitEqually(100, 3) → [33.34, 33.33, 33.33] — sums to exactly 100.
 */
export function splitEqually(total, count) {
  if (count <= 0) return [];
  const paise = toPaise(total);
  const base = Math.floor(paise / count);
  const extra = paise - base * count;
  return Array.from({ length: count }, (_, i) => toRupees(base + (i < extra ? 1 : 0)));
}

/**
 * Build the split block stored on an expense.
 * `shares` is what each person *should* bear. `paid` is what each person
 * actually put in — leave it out when one person covered the whole bill
 * (`payerId`), pass `{ [id]: amount }` when several people chipped in. The
 * two are independent: the khata works out who owes whom from the difference.
 *
 * @param {{total:number, payerId:string, participantIds:string[], mode:"equal"|"custom", custom?:Object, paid?:Object}} input
 * @returns {{payerId:string, mode:string, shares:{id:string, amount:number}[], paid?:Object}|null}
 */
export function buildSplit({ total, payerId = ME, participantIds = [], mode = "equal", custom = {}, paid = null }) {
  const ids = [...new Set(participantIds)].filter(Boolean);
  if (!ids.length || toPaise(total) <= 0) return null;

  const shares = mode === "custom"
    ? ids.map((id) => ({ id, amount: toRupees(toPaise(custom[id])) }))
    : splitEqually(total, ids.length).map((amount, i) => ({ id: ids[i], amount }));
  const block = { payerId, mode: mode === "custom" ? "custom" : "equal", shares };

  // Several people paid → record who put in what; the "payer" shown is whoever put in most.
  const puts = Object.entries(paid || {})
    .map(([id, v]) => [id, toPaise(v)])
    .filter(([, p]) => p > 0);
  if (puts.length > 1) {
    block.paid = Object.fromEntries(puts.map(([id, p]) => [id, toRupees(p)]));
    block.payerId = puts.reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0];
  } else if (puts.length === 1) {
    block.payerId = puts[0][0];
  }
  return block;
}

/** Paise each person put in. Bills without a `paid` map were covered by `payerId`. */
function paidPaise(split) {
  const total = (split.shares || []).reduce((s, r) => s + toPaise(r.amount), 0);
  if (split.paid && typeof split.paid === "object") {
    const out = {};
    for (const [id, v] of Object.entries(split.paid)) {
      const p = toPaise(v);
      if (p > 0) out[id] = p;
    }
    if (Object.keys(out).length) return out;
  }
  return { [split.payerId]: total };
}

/** Everyone who paid on a bill, with how much — one entry for the usual single-payer bill. */
export const payersOf = (split) =>
  Object.entries(paidPaise(split)).map(([id, p]) => ({ id, amount: toRupees(p) }));

export const paidOf = (split, id) => toRupees(paidPaise(split)[id] || 0);

/** Rupees `b` owes `a` on one bill (negative: `a` owes `b`). */
export const owedBetween = (split, a, b) => toRupees(pairOwes(split, a, b));

/** True when the person shared in the bill or paid towards it. */
export const involves = (split, id) => shareOf(split, id) > 0 || paidOf(split, id) > 0;

/** How far the money put in is from the bill (rupees): 0 means it adds up. */
export function paidDifference(split, total) {
  return toRupees(toPaise(total) - Object.values(paidPaise(split)).reduce((s, p) => s + p, 0));
}

/**
 * On one bill, how many paise `b` owes `a` (negative: `a` owes `b`).
 * Each person's balance is what they put in minus their share. Whoever is
 * behind pays whoever is ahead, in proportion to how far ahead each is — with
 * a single payer that is simply "each person owes the payer their share".
 */
function pairOwes(split, a, b) {
  const paid = paidPaise(split);
  const ids = new Set([...(split.shares || []).map((s) => s.id), ...Object.keys(paid)]);
  const net = {};
  let credit = 0;
  ids.forEach((id) => {
    net[id] = (paid[id] || 0) - toPaise(shareOf(split, id));
    if (net[id] > 0) credit += net[id];
  });
  if (!credit) return 0;
  const na = net[a] || 0;
  const nb = net[b] || 0;
  if (na > 0 && nb < 0) return Math.round((-nb * na) / credit);
  if (na < 0 && nb > 0) return -Math.round((-na * nb) / credit);
  return 0;
}

export const splitTotal = (split) =>
  toRupees((split?.shares || []).reduce((s, r) => s + toPaise(r.amount), 0));

/** Custom splits are only valid when they add up. Returns the difference in rupees. */
export function splitDifference(split, total) {
  return toRupees(toPaise(total) - toPaise(splitTotal(split)));
}

export const shareOf = (split, id) =>
  toRupees((split?.shares || []).filter((r) => r.id === id).reduce((s, r) => s + toPaise(r.amount), 0));

export const isSplit = (expense) => Boolean(expense.split && expense.split.shares?.length);

export const splitExpenses = (expenses) => expenses.filter(isSplit);

/** Per-head figure for the picker's live preview. */
export function perHead(total, count) {
  if (!count) return 0;
  return splitEqually(total, count)[0];
}

/* ── the ledger ────────────────────────────────────────────────────────── */

/**
 * What one person owes you, what you owe them, and the net after settlements.
 * Positive net = they owe you.
 */
export function balanceWith({ expenses, settlements, personId }) {
  let owesMePaise = 0;
  let iOwePaise = 0;
  const entries = [];

  splitExpenses(expenses).forEach((e) => {
    const owed = pairOwes(e.split, ME, personId);   // + they owe you, − you owe them
    if (owed > 0) {
      owesMePaise += owed;
      entries.push({ kind: "expense", id: e.id, date: e.date, desc: e.desc, cat: e.cat, amount: toRupees(owed), direction: "in" });
    } else if (owed < 0) {
      iOwePaise += -owed;
      entries.push({ kind: "expense", id: e.id, date: e.date, desc: e.desc, cat: e.cat, amount: toRupees(-owed), direction: "out" });
    }
  });

  let settledPaise = 0;
  settlements.filter((s) => s.personId === personId).forEach((s) => {
    const amount = toPaise(s.amount);
    // "in" = they paid you, which cancels what they owed.
    settledPaise += s.direction === "in" ? amount : -amount;
    entries.push({ kind: "settlement", id: s.id, date: s.date, desc: s.note || (s.direction === "in" ? "They paid you" : "You paid them"), amount: toRupees(amount), direction: s.direction });
  });

  entries.sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    personId,
    owesMe: toRupees(owesMePaise),
    iOwe: toRupees(iOwePaise),
    settled: toRupees(settledPaise),
    net: toRupees(owesMePaise - iOwePaise - settledPaise),
    entries,
  };
}

export function ledger({ expenses, settlements, people }) {
  return people
    .map((p) => ({ ...balanceWith({ expenses, settlements, personId: p.id }), name: p.name }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

/** Headline numbers for the Split tab. */
export function ledgerTotals(rows) {
  const owed = rows.filter((r) => r.net > 0).reduce((s, r) => s + toPaise(r.net), 0);
  const owing = rows.filter((r) => r.net < 0).reduce((s, r) => s - toPaise(r.net), 0);
  return {
    youllGet: toRupees(owed),
    youllPay: toRupees(owing),
    net: toRupees(owed - owing),
    settledUp: rows.filter((r) => r.net === 0).length,
    open: rows.filter((r) => r.net !== 0).length,
  };
}

/** The settlement that clears a balance: direction plus amount. */
export function settleSuggestion(net) {
  if (net === 0) return null;
  return { direction: net > 0 ? "in" : "out", amount: Math.abs(net) };
}

export function makeSettlement({ personId, amount, direction, date, note }) {
  const value = toRupees(toPaise(amount));
  if (!personId || value <= 0 || !["in", "out"].includes(direction)) return null;
  return { id: `s${Date.now()}${Math.random().toString(36).slice(2, 5)}`, personId, amount: value, direction, date, note: String(note || "").trim() };
}

/* ── insight ───────────────────────────────────────────────────────────── */

/** Same shape as the other insights, so InsightSheet renders it unchanged. */
export function personInsight({ expenses, settlements, people, personId }) {
  const person = people.find((p) => p.id === personId);
  if (!person) return null;

  const b = balanceWith({ expenses, settlements, personId });
  const shared = splitExpenses(expenses).filter(
    (e) => involves(e.split, personId) && involves(e.split, ME),
  );
  const biggest = shared.reduce((a, e) => ((Number(e.amount) || 0) > (Number(a?.amount) || 0) ? e : a), null);
  const theyPaid = shared.filter((e) => paidOf(e.split, personId) > 0).length;

  const facts = [];
  if (b.net > 0) facts.push(`${person.name} owes you ${money(b.net)}.`);
  else if (b.net < 0) facts.push(`You owe ${person.name} ${money(-b.net)}.`);
  else facts.push(`You and ${person.name} are settled up.`);

  facts.push(shared.length
    ? `${shared.length} shared ${shared.length === 1 ? "expense" : "expenses"} — you paid ${shared.length - theyPaid}, they paid ${theyPaid}.`
    : "No shared expenses yet.");

  if (b.owesMe) facts.push(`Their share of bills you covered: ${money(b.owesMe)}.`);
  if (b.iOwe) facts.push(`Your share of bills they covered: ${money(b.iOwe)}.`);
  if (b.settled > 0) facts.push(`${money(b.settled)} already paid back to you.`);
  else if (b.settled < 0) facts.push(`${money(-b.settled)} already paid out to them.`);
  if (biggest) facts.push(`Largest shared bill: ${biggest.desc} at ${money(biggest.amount)}.`);

  return {
    kind: "person",
    key: personId,
    title: person.name,
    subtitle: b.net === 0 ? "settled up" : b.net > 0 ? `owes you ${money(b.net)}` : `you owe ${money(-b.net)}`,
    stats: [
      { label: "Owes you", value: money(b.owesMe) },
      { label: "You owe", value: money(b.iOwe) },
      { label: "Net", value: money(Math.abs(b.net)) },
    ],
    rows: b.entries.slice(0, 10).map((e) => ({
      label: e.desc,
      meta: formatDate(e.date),
      value: (e.direction === "in" ? "+" : "−") + money(e.amount).slice(1),
      ok: e.direction === "in",
    })),
    facts,
  };
}
