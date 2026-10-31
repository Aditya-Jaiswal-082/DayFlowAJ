import { useMemo, useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { MOOD_OPTS } from "../lib/constants.js";
import { formatDate } from "../lib/dates.js";
import { formatWhen } from "../lib/reminders.js";
import {
  blockStatus, daySummary, formatClock, formatDuration, formatRange, freeGaps, isTimed, overlappingIds,
  parseScheduleText, repeatLabel, spanOf, splitTimed,
} from "../lib/schedule.js";
import { useNow } from "../hooks/useNow.js";
import { haptic } from "../lib/haptics.js";
import { inputStyle } from "../styles/theme.js";
import {
  Btn, DayNav, Field, Modal, NowNext, TaskEditor, TaskRow, WhenPicker, whenToTimestamp, whenValue,
} from "../components/index.js";

const RED = "#c0392b";
const flagOf = (val) => (val === "high" ? { label: "High", color: RED } : val === "low" ? { label: "Low", color: "var(--muted)" } : null);

/**
 * The day, in one column: where you stand, a one-line way to add a task, the
 * timeline and the anytime list, then mood and a note. A task may carry a time
 * (it then sits on the timeline in clock order); either way it counts toward
 * the same completion %, streak and Insights.
 */
export function TodayTab() {
  const {
    tasks, stats, quote, catColor, reminders, notifications,
    openInsight, selectedDay, isWeekend, today, isToday, isFuture,
  } = useTracker();
  const nowMin = useNow();

  const [editor, setEditor] = useState(null);       // { task: Task | null } while the add/edit sheet is open
  const [quick, setQuick] = useState("");

  const { timed, anytime } = useMemo(() => splitTimed(tasks.dayTasks), [tasks.dayTasks]);
  const rows = timed.map((task) => {
    const done = !!tasks.day.checks[task.id];
    return { task, done, status: blockStatus({ item: task, sorted: timed, nowMin, dayKey: selectedDay, todayKey: today, done }) };
  });
  const timeline = daySummary({ items: timed, checks: tasks.day.checks, dayKey: selectedDay, todayKey: today, nowMin });
  const clash = useMemo(() => overlappingIds(timed), [timed]);
  const gaps = useMemo(() => freeGaps(timed), [timed]);
  const bells = new Map(reminders.pending.filter((r) => r.taskId).map((r) => [r.taskId, r]));

  const { done, total } = stats.counts;
  const remaining = total - done;

  /* ── quick add: "7 to 9 gym" lands on the timeline, plain text lands in Anytime ── */

  const quickItem = useMemo(() => {
    const text = quick.trim();
    if (!text) return null;
    const parsed = parseScheduleText(text, { allowUntimed: true });
    return parsed.items[0] || { text, start: null, end: null };
  }, [quick]);

  function quickAdd() {
    if (!quickItem) return;
    if (tasks.add({ text: quickItem.text, cat: "Personal", start: quickItem.start, end: quickItem.end })) {
      haptic("success");
      setQuick("");
    }
  }

  /* ── one-off lists (special / extra) ── */

  const [listModal, setListModal] = useState(null);   // "special" | "extra" | null
  const [listText, setListText] = useState("");
  const [listWhen, setListWhen] = useState(() => whenValue(false));

  function openList(name) {
    setListText("");
    setListWhen({ ...whenValue(false), date: selectedDay >= today ? selectedDay : today });
    setListModal(name);
  }

  async function saveListItem() {
    const text = listText.trim();
    if (!text) return;
    if (listWhen.on && notifications.supported && notifications.permission === "default") {
      await notifications.request();
    }
    if (tasks.addListItem(listModal, text)) {
      if (listWhen.on) reminders.add({ text, at: whenToTimestamp(listWhen) });
      haptic("success");
      setListText("");
      setListModal(null);
    }
  }

  /* ── holiday / weekend lists ── */

  const [holidayModal, setHolidayModal] = useState(false);
  const [holidayText, setHolidayText] = useState("");
  const [weekendModal, setWeekendModal] = useState(false);
  const [weekendText, setWeekendText] = useState("");

  function saveHolidayTask() {
    if (tasks.addHoliday({ text: holidayText, cat: "Personal" })) {
      haptic("success");
      setHolidayText("");
      setHolidayModal(false);
    }
  }

  function saveWeekendTask() {
    if (tasks.addWeekend({ text: weekendText, cat: "Personal" })) {
      haptic("success");
      setWeekendText("");
      setWeekendModal(false);
    }
  }

  /** Meta lines shown under a task title. */
  const metaFor = (t, extra = []) => [
    ...extra,
    { text: t.cat, dot: catColor(t.cat) },
    ...(t.days ? [{ text: repeatLabel(t.days) }] : []),
    ...(bells.get(t.id) ? [{ text: `Reminder ${formatWhen(bells.get(t.id).at)}` }] : []),
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "0.8rem", maxWidth: 680, margin: "0 auto" }}>
      <DayNav />

      {/* where you stand */}
      <section className="tile" style={{ padding: "1rem" }}>
        {isFuture ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
              {total === 0 ? "Nothing planned yet" : `${total} planned`}
            </div>
            <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 3 }}>
              You can tick tasks off when the day comes.
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <div>
                <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, letterSpacing: -1 }}>{done}</span>
                <span style={{ fontSize: 16, color: "var(--muted)", marginLeft: 6 }}>of {total} done</span>
              </div>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{stats.pct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "var(--bg-2)", margin: "0.8rem 0 0.7rem", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${stats.pct}%`, background: "var(--accent)", transition: "width 300ms ease" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13.5, color: "var(--muted)" }}>
                {total === 0 ? "No tasks for this day" : remaining === 0 ? "All done" : `${remaining} left`}
                {stats.streak > 0 || stats.streaks.best > 0 ? `. Streak ${stats.streak} ${stats.streak === 1 ? "day" : "days"}, best ${stats.streaks.best}.` : ""}
              </span>
              <Btn size="sm" variant="ghost" onClick={() => openInsight({ kind: "day", key: selectedDay })}>Day summary</Btn>
            </div>
          </>
        )}
      </section>

      {/* add */}
      <div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); quickAdd(); } }}
            placeholder={isFuture ? "Plan something for this day" : "Add a task, or \"7 to 9 gym\""}
            enterKeyHint="done"
            aria-label="New task"
            style={{ ...inputStyle, flex: 1, minHeight: 46, fontSize: 16 }}
          />
          <Btn size="lg" onClick={quickAdd} disabled={!quickItem}>Add</Btn>
        </div>
        {quickItem && (
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>
            {isTimed(quickItem)
              ? `Goes on the timeline: ${formatRange(quickItem)}.`
              : "Goes in Anytime. Start with a time to put it on the timeline."}
          </div>
        )}
      </div>

      {/* timeline */}
      {timed.length > 0 && (
        <Block
          title="Timeline"
          meta={[
            `${timeline.done} of ${timeline.total}`,
            timeline.missed ? `${timeline.missed} missed` : null,
            timeline.plannedMin ? `${formatDuration(timeline.plannedMin)} planned` : null,
          ].filter(Boolean).join(", ")}
        >
          {isToday && rows.some((r) => r.status === "active" || r.status === "upcoming") && <NowNext rows={rows} list={timed} nowMin={nowMin} />}
          {rows.map(({ task, done: isDone, status }, i) => (
            <TaskRow
              key={task.id}
              first={i === 0 && !isToday}
              text={task.text}
              done={isDone}
              disabled={isFuture}
              highlight={status === "active"}
              onToggle={() => tasks.toggleCheck(task.id)}
              onOpen={() => setEditor({ task })}
              status={status === "active" ? { label: "Now", color: "var(--accent)" } : status === "missed" ? { label: "Missed", color: RED } : null}
              flag={flagOf(task.priority)}
              meta={metaFor(task, [
                { text: task.end != null ? `${formatRange(task)}, ${formatDuration(spanOf(task))}` : formatRange(task) },
                ...(clash.has(task.id) ? [{ text: "Overlaps", color: "#b4541a" }] : []),
              ])}
            />
          ))}
          {gaps.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border)", padding: "0.7rem 1rem", fontSize: 13, color: "var(--muted)" }}>
              Free: {gaps.map((g) => `${formatClock(g.from)} to ${formatClock(g.to)} (${formatDuration(g.minutes)})`).join(", ")}
            </div>
          )}
        </Block>
      )}

      {/* anytime */}
      <Block
        title={timed.length ? "Anytime" : "Tasks"}
        meta={anytime.length ? `${anytime.filter((t) => tasks.day.checks[t.id]).length} of ${anytime.length}` : ""}
        action={<Btn size="sm" variant="ghost" onClick={() => setEditor({ task: null })}>More options</Btn>}
      >
        {anytime.length === 0 ? (
          <div style={{ padding: "0.2rem 1rem 1rem", fontSize: 14, color: "var(--muted)" }}>
            {timed.length ? "Nothing without a time today." : "No tasks yet. Type one above to get started."}
          </div>
        ) : (
          anytime.map((t, i) => (
            <TaskRow
              key={t.id}
              first={i === 0}
              text={t.text}
              done={!!tasks.day.checks[t.id]}
              disabled={isFuture}
              onToggle={() => tasks.toggleCheck(t.id)}
              onOpen={() => setEditor({ task: t })}
              flag={flagOf(t.priority)}
              meta={metaFor(t)}
            />
          ))
        )}
      </Block>

      {tasks.isHoliday && (
        <Block title="Holiday tasks" action={<Btn size="sm" variant="ghost" onClick={() => setHolidayModal(true)}>Add</Btn>}>
          {tasks.dayHolidayTasks.length === 0 ? (
            <div style={{ padding: "0.2rem 1rem 1rem", fontSize: 14, color: "var(--muted)" }}>
              Nothing yet. Tasks you add here show up on every day you mark as a holiday.
            </div>
          ) : (
            tasks.dayHolidayTasks.map((t, i) => (
              <TaskRow
                key={t.id}
                first={i === 0}
                text={t.text}
                done={!!tasks.day.holidayChecks[t.id]}
                disabled={isFuture}
                onToggle={() => tasks.toggleHolidayCheck(t.id)}
                onRemove={() => tasks.archiveHolidayTask(t.id)}
                removeTitle="Archive"
                flag={flagOf(t.priority)}
                meta={[{ text: t.cat, dot: catColor(t.cat) }]}
              />
            ))
          )}
        </Block>
      )}

      {isWeekend && (
        <Block title="Weekend tasks" action={<Btn size="sm" variant="ghost" onClick={() => setWeekendModal(true)}>Add</Btn>}>
          {tasks.dayWeekendTasks.length === 0 ? (
            <div style={{ padding: "0.2rem 1rem 1rem", fontSize: 14, color: "var(--muted)" }}>
              Nothing yet. Tasks you add here show up every Saturday and Sunday.
            </div>
          ) : (
            tasks.dayWeekendTasks.map((t, i) => (
              <TaskRow
                key={t.id}
                first={i === 0}
                text={t.text}
                done={!!tasks.day.weekendChecks[t.id]}
                disabled={isFuture}
                onToggle={() => tasks.toggleWeekendCheck(t.id)}
                onRemove={() => tasks.archiveWeekendTask(t.id)}
                removeTitle="Archive"
                flag={flagOf(t.priority)}
                meta={[{ text: t.cat, dot: catColor(t.cat) }]}
              />
            ))
          )}
        </Block>
      )}

      {/* one-offs */}
      <Block title="Just for this day">
        <Group
          title="Special"
          hint="One-off tasks"
          items={tasks.day.special}
          disabled={isFuture}
          onAdd={() => openList("special")}
          onToggle={(i) => tasks.toggleListItem("special", i)}
          onRemove={(i) => tasks.removeListItem("special", i)}
        />
        <Group
          title="Extra"
          hint="Done, but not planned"
          items={tasks.day.extra}
          disabled={isFuture}
          onAdd={() => openList("extra")}
          onToggle={(i) => tasks.toggleListItem("extra", i)}
          onRemove={(i) => tasks.removeListItem("extra", i)}
        />
      </Block>

      {/* mood and note */}
      <Block title="Mood and note" meta={isFuture ? "opens on the day" : ""}>
        <div style={{ padding: "0 1rem 1rem", display: "grid", gap: "0.9rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
            {MOOD_OPTS.map((m) => {
              const active = tasks.day.mood === m.val;
              return (
                <button
                  key={m.val}
                  type="button"
                  className="pressable"
                  disabled={isFuture}
                  aria-pressed={active}
                  onClick={() => { haptic("toggle"); tasks.setMood(m.val); }}
                  style={{
                    minHeight: 46,
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontWeight: active ? 700 : 500,
                    cursor: isFuture ? "not-allowed" : "pointer",
                    opacity: isFuture ? 0.45 : 1,
                    border: `1px solid ${active ? m.color : "var(--border)"}`,
                    background: active ? `${m.color}1f` : "transparent",
                    color: active ? m.color : "var(--text)",
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <Field
            label="Note"
            rows={3}
            value={tasks.day.note}
            onChange={tasks.setNote}
            placeholder={isFuture ? "Anything to remember for this day" : "Anything worth remembering"}
          />
        </div>
      </Block>

      {quote && (
        <figure style={{ margin: "0.4rem 0 0", padding: "0 0 0 0.9rem", borderLeft: "2px solid var(--border)" }}>
          <blockquote style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--muted)" }}>{quote.text}</blockquote>
          <figcaption style={{ marginTop: 4, fontSize: 12.5, color: "var(--muted)" }}>{quote.auth}</figcaption>
        </figure>
      )}

      {editor && <TaskEditor task={editor.task} nowMin={nowMin} onClose={() => setEditor(null)} />}

      <Modal
        open={!!listModal}
        onClose={() => setListModal(null)}
        title={isFuture ? `Plan for ${formatDate(selectedDay)}` : listModal === "special" ? "Add a special task" : "Add an extra task"}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setListModal(null)}>Cancel</Btn>
            <Btn onClick={saveListItem} disabled={!listText.trim()}>Add</Btn>
          </>
        }
      >
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <Field
            label="Task"
            value={listText}
            onChange={setListText}
            autoFocus
            onEnter={saveListItem}
            placeholder={
              isFuture ? "e.g. Buy Riya’s birthday gift"
                : listModal === "special" ? "A one-off task for this day" : "Something extra you did"
            }
          />
          <WhenPicker value={listWhen} onChange={setListWhen} label="Remind me" />
          {isFuture && (
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
              It waits on {formatDate(selectedDay)}. Tick it when the day comes.
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={holidayModal}
        onClose={() => setHolidayModal(false)}
        title="Add a holiday task"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setHolidayModal(false)}>Cancel</Btn>
            <Btn onClick={saveHolidayTask} disabled={!holidayText.trim()}>Add</Btn>
          </>
        }
      >
        <Field label="Task" value={holidayText} onChange={setHolidayText} autoFocus onEnter={saveHolidayTask} placeholder="Plan the day" />
      </Modal>

      <Modal
        open={weekendModal}
        onClose={() => setWeekendModal(false)}
        title="Add a weekend task"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setWeekendModal(false)}>Cancel</Btn>
            <Btn onClick={saveWeekendTask} disabled={!weekendText.trim()}>Add</Btn>
          </>
        }
      >
        <Field label="Task" value={weekendText} onChange={setWeekendText} autoFocus onEnter={saveWeekendTask} placeholder="Meal prep for the week" />
      </Modal>
    </div>
  );
}

/** A titled section: flat surface, hairline border, optional count and action. */
function Block({ title, meta, action, children }) {
  return (
    <section className="tile" style={{ padding: 0, overflow: "hidden" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "0.75rem 1rem 0.55rem", minHeight: 48 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h2>
          {meta ? <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 1 }}>{meta}</div> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** One-off list (special / extra): a small heading with Add, then its rows. */
function Group({ title, hint, items, disabled, onAdd, onToggle, onRemove }) {
  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "0.55rem 1rem" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{hint}</div>
        </div>
        <Btn size="sm" variant="ghost" onClick={onAdd}>Add</Btn>
      </div>
      {items.map((item, i) => (
        <TaskRow
          key={item.id}
          text={item.text}
          done={!!item.done}
          disabled={disabled}
          onToggle={() => onToggle(i)}
          onRemove={() => onRemove(i)}
        />
      ))}
    </div>
  );
}
