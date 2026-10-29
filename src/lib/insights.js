import { DAYS, MONTHS, MOOD_OPTS, MOOD_SCORE } from "./constants.js";
import { daysAgoKey, formatDate, getPastDaysEndingAt, getTodayKey, keyOf, parseKey } from "./dates.js";
import { money, sumBy } from "./format.js";
import { completionPct, countsFor, dayOf, hasDaySignal, tasksActiveOn } from "./stats.js";

/**
 * The insight engine: turns stored records into the specific, quotable facts
 * shown when you tap a day, a month, a category or a task.
 *
 * Pure — every function takes plain data and returns plain data, which is why
 * `npm test` can cover all of it.
 */

/* ── small helpers ─────────────────────────────────────────────────────── */

/** Percentage change, and 0 rather than Infinity when the baseline is 0. */
export function change(now, before) {
  if (!before) return now ? 100 : 0;
  return Math.round(((now - before) / before) * 100);
}

export const monthKeyOf = (dayKey) => String(dayKey).slice(0, 7);

export function monthLabel(monthKey) {
  const [y, m] = String(monthKey).split("-");
  return `${MONTHS[Number(m) - 1] || "?"} ${y}`;
}

/** Day keys in a month, never running past today. */
export function monthDays(monthKey, todayKey) {
  const [y, m] = String(monthKey).split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const out = [];
  for (let d = 1; d <= last; d++) {
    const key = `${monthKey}-${String(d).padStart(2, "0")}`;
    if (todayKey && key > todayKey) break;
    out.push(key);
  }
  return out;
}

/**
 * The day to re-anchor everything on when someone picks a month to look at —
 * the latest day in that month with real signal (see `hasDaySignal`),
 * falling back to the month's last day. Without this, picking a month only
 * moved the "Open month" button's target; every "last 7 days" style stat on
 * the same page stayed anchored on whatever day it already was, so picking a
 * month with real history in it could still show nothing.
 */
export function anchorDayInMonth(dayData, monthKey, todayKey = getTodayKey()) {
  const days = monthDays(monthKey, todayKey);
  if (!days.length) return todayKey;
  const withSignal = days.filter((k) => hasDaySignal(dayData[k]));
  return withSignal.pop() || days[days.length - 1];
}

/** Most recent n month keys, newest first. */
export function recentMonths(n, todayKey) {
  const base = parseKey(`${monthKeyOf(todayKey)}-01`);
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    out.push(keyOf(d).slice(0, 7));
  }
  return out;
}

const prevMonthKey = (monthKey) => {
  const [y, m] = String(monthKey).split("-").map(Number);
  return keyOf(new Date(y, m - 2, 1)).slice(0, 7);
};

const inMonth = (expenses, monthKey) =>
  expenses.filter((e) => String(e.date).startsWith(monthKey));

const moodOf = (val) => MOOD_OPTS.find((m) => m.val === val) || null;

const avg = (nums) => (nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0);

/* ── trends ────────────────────────────────────────────────────────────── */

/** This week's average completion against the seven days before it. */
export function completionTrend(dayData, tasks, anchorKey = getTodayKey()) {
  const last7 = getPastDaysEndingAt(anchorKey, 7).map((k) => completionPct(dayData, k, tasks));
  const prev7 = getPastDaysEndingAt(anchorKey, 14).slice(0, 7).map((k) => completionPct(dayData, k, tasks));
  const a = avg(last7);
  const b = avg(prev7);
  return { now: a, before: b, change: change(a, b) };
}

export function spendTrend(expenses, anchorKey = getTodayKey()) {
  const week = getPastDaysEndingAt(anchorKey, 7);
  const before = getPastDaysEndingAt(anchorKey, 14).slice(0, 7);
  const a = sumBy(expenses.filter((e) => week.includes(e.date)));
  const b = sumBy(expenses.filter((e) => before.includes(e.date)));
  return { now: a, before: b, change: change(a, b) };
}

/** Current run of 100% days, and the best run in the window. */
export function streakInfo(dayData, tasks, windowDays = 120) {
  let current = 0;
  let best = 0;
  let run = 0;
  for (let i = 0; i < windowDays; i++) {
    const hit = completionPct(dayData, daysAgoKey(i), tasks) === 100;
    if (hit) {
      run++;
      if (i === current) current = run;
    } else {
      best = Math.max(best, run);
      run = 0;
    }
  }
  return { current, best: Math.max(best, run, current) };
}

/** Which weekday you actually keep your routine on. */
export function weekdayPattern(dayData, tasks, weeks = 6, anchorKey = getTodayKey()) {
  const buckets = DAYS.map((d) => ({ day: d, total: 0, n: 0 }));
  getPastDaysEndingAt(anchorKey, weeks * 7).forEach((key) => {
    const active = tasksActiveOn(tasks, key);
    if (!active.length) return;
    const b = buckets[parseKey(key).getDay()];
    b.total += completionPct(dayData, key, tasks);
    b.n += 1;
  });
  return buckets.map((b) => ({ day: b.day, pct: b.n ? Math.round(b.total / b.n) : 0, n: b.n }));
}

/* ── one day ───────────────────────────────────────────────────────────── */

export function dayInsight({ dayData, tasks, expenses, key }) {
  const day = dayOf(dayData, key);
  const active = tasksActiveOn(tasks, key);
  const { done, total } = countsFor(day, active);
  const pct = total ? Math.round((done / total) * 100) : 0;

  const week = getPastDaysEndingAt(key, 7);
  const weekAvg = avg(week.map((k) => completionPct(dayData, k, tasks)));
  const spendRows = expenses.filter((e) => e.date === key);
  const spend = sumBy(spendRows);
  const mood = moodOf(day.mood);

  const missed = active.filter((t) => !day.checks[t.id]).map((t) => t.text);
  const facts = [];

  if (total === 0) facts.push("No tasks were scheduled for this day.");
  else if (pct === 100) facts.push(`Everything done — all ${total} items ticked off.`);
  else facts.push(`${done} of ${total} done. ${missed.length} left: ${missed.slice(0, 3).join(", ")}${missed.length > 3 ? "…" : ""}.`);

  if (total) {
    const gap = pct - weekAvg;
    if (Math.abs(gap) >= 5) facts.push(`${Math.abs(gap)}% ${gap > 0 ? "above" : "below"} your 7-day average of ${weekAvg}%.`);
    else facts.push(`Right on your 7-day average of ${weekAvg}%.`);
  }

  if (mood) facts.push(`You logged your mood as ${mood.label.toLowerCase()}.`);
  if (spend) facts.push(`Spent ${money(spend)} across ${spendRows.length} ${spendRows.length === 1 ? "entry" : "entries"}.`);
  if (day.special.length) facts.push(`${day.special.length} special task${day.special.length > 1 ? "s" : ""} planned for this day only.`);

  return {
    kind: "day",
    key,
    title: formatDate(key),
    subtitle: `${DAYS[parseKey(key).getDay()]} · ${total} scheduled`,
    pct,
    stats: [
      { label: "Completed", value: `${done}/${total}` },
      { label: "vs 7-day avg", value: `${pct - weekAvg > 0 ? "+" : ""}${pct - weekAvg}%` },
      { label: "Spent", value: money(spend) },
    ],
    rows: active.map((t) => ({
      label: t.text,
      meta: t.cat,
      value: day.checks[t.id] ? "done" : "missed",
      ok: !!day.checks[t.id],
    })),
    note: day.note,
    facts,
  };
}

/* ── one expense category ──────────────────────────────────────────────── */

export function categoryInsight({ expenses, budgets, cat, monthKey }) {
  const rows = inMonth(expenses, monthKey).filter((e) => e.cat === cat);
  const total = sumBy(rows);
  const monthTotal = sumBy(inMonth(expenses, monthKey));
  const prev = sumBy(inMonth(expenses, prevMonthKey(monthKey)).filter((e) => e.cat === cat));
  const cap = Number(budgets[cat]) || 0;
  const share = monthTotal ? Math.round((total / monthTotal) * 100) : 0;
  const days = new Set(rows.map((e) => e.date)).size;
  const biggest = rows.reduce((a, b) => ((Number(b.amount) || 0) > (Number(a?.amount) || 0) ? b : a), null);
  const delta = change(total, prev);

  const facts = [];
  facts.push(`${money(total)} across ${rows.length} ${rows.length === 1 ? "entry" : "entries"} — ${share}% of everything you spent in ${monthLabel(monthKey)}.`);
  if (rows.length) facts.push(`That averages ${money(Math.round(total / rows.length))} per entry, on ${days} of the month's days.`);
  if (prev) facts.push(`${Math.abs(delta)}% ${delta > 0 ? "more" : "less"} than ${monthLabel(prevMonthKey(monthKey))} (${money(prev)}).`);
  else if (total) facts.push(`Nothing was logged in this category last month.`);
  if (biggest) facts.push(`Largest single entry: ${biggest.desc} at ${money(biggest.amount)}.`);
  if (cap) {
    const left = cap - total;
    facts.push(left >= 0
      ? `${money(left)} left of your ${money(cap)} budget — ${Math.round((total / cap) * 100)}% used.`
      : `Over budget by ${money(-left)} against a ${money(cap)} cap.`);
  } else {
    facts.push("No budget set for this category yet.");
  }

  return {
    kind: "category",
    key: cat,
    title: cat,
    subtitle: monthLabel(monthKey),
    stats: [
      { label: "Total", value: money(total) },
      { label: "Share of month", value: `${share}%` },
      { label: "Entries", value: String(rows.length) },
    ],
    delta,
    deltaGoodWhenUp: false,
    budget: cap ? { cap, spent: total, pct: Math.round((total / cap) * 100) } : null,
    rows: rows.slice(0, 8).map((e) => ({ label: e.desc, meta: formatDate(e.date), value: money(e.amount), ok: true })),
    facts,
  };
}

/* ── one month ─────────────────────────────────────────────────────────── */

export function monthInsight({ dayData, tasks, expenses, monthKey, todayKey }) {
  const days = monthDays(monthKey, todayKey);
  const withTasks = days.filter((k) => tasksActiveOn(tasks, k).length);
  const pcts = withTasks.map((k) => ({ key: k, pct: completionPct(dayData, k, tasks) }));
  const spend = sumBy(inMonth(expenses, monthKey));
  const prevSpend = sumBy(inMonth(expenses, prevMonthKey(monthKey)));
  const avgPct = avg(pcts.map((p) => p.pct));
  const perfect = pcts.filter((p) => p.pct === 100).length;
  const best = pcts.reduce((a, b) => (b.pct > (a?.pct ?? -1) ? b : a), null);
  const worst = pcts.reduce((a, b) => (b.pct < (a?.pct ?? 101) ? b : a), null);

  const cats = {};
  inMonth(expenses, monthKey).forEach((e) => { cats[e.cat] = (cats[e.cat] || 0) + (Number(e.amount) || 0); });
  const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0] || null;

  const moods = days.map((k) => MOOD_SCORE[dayOf(dayData, k).mood]).filter(Boolean);
  const moodAvg = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;
  const moodName = moodAvg
    ? (MOOD_OPTS.find((m) => MOOD_SCORE[m.val] === Math.round(moodAvg)) || {}).label
    : null;
  const delta = change(spend, prevSpend);

  const facts = [];
  facts.push(withTasks.length
    ? `Averaged ${avgPct}% completion over ${withTasks.length} tracked days, with ${perfect} perfect ${perfect === 1 ? "day" : "days"}.`
    : "No routine tracked in this month yet.");
  if (best && worst && best.key !== worst.key) {
    facts.push(`Best day was ${formatDate(best.key)} at ${best.pct}%; weakest was ${formatDate(worst.key)} at ${worst.pct}%.`);
  }
  if (spend) {
    facts.push(`Spent ${money(spend)}, about ${money(Math.round(spend / Math.max(1, days.length)))} a day.`);
    if (topCat) facts.push(`${topCat[0]} took the largest share at ${money(topCat[1])}.`);
    if (prevSpend) facts.push(`${Math.abs(delta)}% ${delta > 0 ? "more" : "less"} than ${monthLabel(prevMonthKey(monthKey))}.`);
  } else {
    facts.push("No expenses logged this month.");
  }
  if (moodName) facts.push(`Mood averaged around "${moodName}" across ${moods.length} logged days.`);

  return {
    kind: "month",
    key: monthKey,
    title: monthLabel(monthKey),
    subtitle: `${days.length} days · ${withTasks.length} tracked`,
    pct: avgPct,
    stats: [
      { label: "Avg completion", value: `${avgPct}%` },
      { label: "Perfect days", value: String(perfect) },
      { label: "Spent", value: money(spend) },
    ],
    delta,
    deltaGoodWhenUp: false,
    rows: Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ label: name, meta: `${Math.round((value / (spend || 1)) * 100)}% of month`, value: money(value), ok: true })),
    facts,
  };
}

/* ── one task ──────────────────────────────────────────────────────────── */

export function taskInsight({ dayData, tasks, taskId, windowDays = 30, anchorKey = getTodayKey() }) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const keys = getPastDaysEndingAt(anchorKey, windowDays).filter((k) => tasksActiveOn(tasks, k).some((t) => t.id === taskId));
  const hits = keys.filter((k) => dayOf(dayData, k).checks[taskId]);
  const rate = keys.length ? Math.round((hits.length / keys.length) * 100) : 0;

  let streak = 0;
  for (let i = keys.length - 1; i >= 0; i--) {
    if (dayOf(dayData, keys[i]).checks[taskId]) streak++;
    else break;
  }

  const byDay = DAYS.map((d) => ({ day: d, hit: 0, n: 0 }));
  keys.forEach((k) => {
    const b = byDay[parseKey(k).getDay()];
    b.n += 1;
    if (dayOf(dayData, k).checks[taskId]) b.hit += 1;
  });
  const scored = byDay.filter((b) => b.n).map((b) => ({ day: b.day, pct: Math.round((b.hit / b.n) * 100) }));
  const bestDay = scored.reduce((a, b) => (b.pct > (a?.pct ?? -1) ? b : a), null);
  const worstDay = scored.reduce((a, b) => (b.pct < (a?.pct ?? 101) ? b : a), null);
  const lastDone = [...hits].pop() || null;

  const facts = [];
  facts.push(keys.length
    ? `Done ${hits.length} of the last ${keys.length} days — a ${rate}% rate.`
    : "This task hasn't been active in the last month.");
  if (streak > 1) facts.push(`Currently on a ${streak}-day run.`);
  else if (keys.length && !streak) facts.push("The run was broken on the most recent day.");
  if (bestDay && worstDay && bestDay.day !== worstDay.day) {
    facts.push(`Strongest on ${bestDay.day} (${bestDay.pct}%), weakest on ${worstDay.day} (${worstDay.pct}%).`);
  }
  if (lastDone) facts.push(`Last completed ${formatDate(lastDone)}.`);
  if (task.priority === "high") facts.push("Marked high priority, so reminders default to on.");

  return {
    kind: "task",
    key: String(taskId),
    title: task.text,
    subtitle: `${task.cat} · ${task.priority} priority`,
    pct: rate,
    stats: [
      { label: "Completion rate", value: `${rate}%` },
      { label: "Current run", value: `${streak}d` },
      { label: "Days active", value: String(keys.length) },
    ],
    rows: scored.map((s) => ({ label: s.day, meta: "", value: `${s.pct}%`, ok: s.pct >= 50 })),
    facts,
  };
}
