import { useMemo, useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { MOOD_OPTS, PRIORITIES, TASK_CATS } from "../lib/constants.js";
import { formatWhen } from "../lib/reminders.js";
import {
  blockStatus, daySummary, formatClock, formatDuration, formatRange, freeGaps, overlappingIds, periodColor,
  repeatLabel, splitTimed, spanOf,
} from "../lib/schedule.js";
import { useNow } from "../hooks/useNow.js";
import { gridCols } from "../styles/theme.js";
import { haptic } from "../lib/haptics.js";
import { formatDate } from "../lib/dates.js";
import {
  Btn, Card, CircleProgress, DayNav, Empty, Field, Modal, NowNext, SectionTitle, TaskEditor, TaskRow, TiltCard,
  WhenPicker, whenToTimestamp, whenValue,
} from "../components/index.js";

const STATUS = {
  done: { label: "Done", color: "#10b981" },
  active: { label: "Now", color: "var(--accent)" },
  upcoming: { label: "Later", color: "var(--muted)" },
  missed: { label: "Missed", color: "#ef4444" },
};

const priorityOf = (val) => PRIORITIES.find((p) => p.val === val) || PRIORITIES[1];

/**
 * One list for the day. A task may carry a time, in which case it sits on the
 * timeline in clock order; the rest are "anytime". Both feed the same
 * completion %, streak and Insights. Also: mood, day note, quote.
 */
export function TodayTab() {
  const {
    tasks, stats, quote, catColor, reminders, notifications,
    openInsight, selectedDay, isWeekend, today, isToday, isFuture,
  } = useTracker();
  const nowMin = useNow();

  const [editor, setEditor] = useState(null);   // { task: Task | null } while the add/edit modal is open

  const { timed, anytime } = useMemo(() => splitTimed(tasks.dayTasks), [tasks.dayTasks]);
  const rows = timed.map((task) => {
    const done = !!tasks.day.checks[task.id];
    return { task, done, status: blockStatus({ item: task, sorted: timed, nowMin, dayKey: selectedDay, todayKey: today, done }) };
  });
  const timeline = daySummary({ items: timed, checks: tasks.day.checks, dayKey: selectedDay, todayKey: today, nowMin });
  const clash = useMemo(() => overlappingIds(timed), [timed]);
  const gaps = useMemo(() => freeGaps(timed), [timed]);

  const [listModal, setListModal] = useState(null);   // "special" | "extra" | null
  const [listText, setListText] = useState("");
  const [listWhen, setListWhen] = useState(() => whenValue(false));

  /** Open the special/extra modal; a reminder, if wanted, defaults to the day being viewed. */
  function openList(name) {
    setListText("");
    setListWhen({ ...whenValue(false), date: selectedDay >= today ? selectedDay : today });
    setListModal(name);
  }

  const [holidayModal, setHolidayModal] = useState(false);
  const [holidayText, setHolidayText] = useState("");
  const [holidayCat, setHolidayCat] = useState(TASK_CATS[0]);

  function openHolidayModal() {
    setHolidayText("");
    setHolidayCat(TASK_CATS[0]);
    setHolidayModal(true);
  }

  function saveHolidayTask() {
    if (tasks.addHoliday({ text: holidayText, cat: holidayCat })) {
      haptic("success");
      setHolidayModal(false);
    }
  }

  const [weekendModal, setWeekendModal] = useState(false);
  const [weekendText, setWeekendText] = useState("");
  const [weekendCat, setWeekendCat] = useState(TASK_CATS[0]);

  function openWeekendModal() {
    setWeekendText("");
    setWeekendCat(TASK_CATS[0]);
    setWeekendModal(true);
  }

  function saveWeekendTask() {
    if (tasks.addWeekend({ text: weekendText, cat: weekendCat })) {
      haptic("success");
      setWeekendModal(false);
    }
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

  const bells = new Map(reminders.pending.filter((r) => r.taskId).map((r) => [r.taskId, r]));
  const { done, total } = stats.counts;
  const remaining = total - done;

  return (
    <div style={{ display: "grid", gap: "0.75rem" }} className="stagger">
      <DayNav />

      <TiltCard style={{ display: "flex", alignItems: "center", gap: "1.1rem" }}>
        {isFuture ? (
          <div
            aria-hidden="true"
            style={{
              width: 96, height: 96, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center",
              fontSize: 36, background: "var(--bg-2)", border: "1px solid var(--border)",
            }}
          >
            📅
          </div>
        ) : (
          <CircleProgress pct={stats.pct} label="done" />
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: -0.6 }}>{done}/{total}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {isFuture
              ? (total === 0 ? "nothing planned yet" : `planned for this day — ticking opens on the day`)
              : total === 0 ? "nothing scheduled" : remaining === 0 ? "all done for today" : `${remaining} left today`}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
            {!isFuture && (
              <Btn size="sm" variant="ghost" onClick={() => openInsight({ kind: "day", key: selectedDay })}>
                Day insight
              </Btn>
            )}
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700,
                padding: "0.3rem 0.55rem", borderRadius: 999, color: "#f59e0b",
                background: "var(--bg-2)", border: "1px solid var(--border)",
              }}
            >
              🔥 {stats.streaks.current}d · best {stats.streaks.best}d
            </span>
          </div>
        </div>
      </TiltCard>

      <Card>
        <SectionTitle hint={isFuture ? "Opens on the day" : "Tap again to clear it"}>How are you feeling?</SectionTitle>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {MOOD_OPTS.map((m) => {
            const active = tasks.day.mood === m.val;
            return (
              <button
                key={m.val}
                type="button"
                className="pressable"
                disabled={isFuture}
                onClick={() => { haptic("toggle"); tasks.setMood(m.val); }}
                style={{
                  opacity: isFuture ? 0.45 : 1,
                  flex: "1 1 88px",
                  padding: "0.55rem 0.4rem",
                  borderRadius: 14,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isFuture ? "not-allowed" : "pointer",
                  border: `1px solid ${active ? m.color : "var(--border)"}`,
                  background: active ? `${m.color}1f` : "var(--bg-2)",
                  color: active ? m.color : "var(--muted)",
                  boxShadow: active ? "var(--shadow-1)" : "var(--shadow-press)",
                  transition: "all 180ms cubic-bezier(.22,.61,.36,1)",
                }}
              >
                <div style={{ fontSize: 19, lineHeight: 1.2 }} aria-hidden="true">{m.emoji}</div>
                {m.label}
              </button>
            );
          })}
        </div>

        <Field
          label="Note for the day"
          rows={2}
          value={tasks.day.note}
          onChange={tasks.setNote}
          placeholder="Anything worth remembering…"
          style={{ marginTop: "0.9rem" }}
        />
      </Card>

      {timed.length > 0 && (
        <Card>
          {isToday && (
            <div style={{ marginBottom: "0.9rem" }}>
              <NowNext rows={rows} list={timed} nowMin={nowMin} />
            </div>
          )}
          <SectionTitle
            hint={[
              `${timeline.done}/${timeline.total} done`,
              timeline.missed ? `${timeline.missed} missed` : null,
              timeline.plannedMin ? `${formatDuration(timeline.plannedMin)} planned` : null,
            ].filter(Boolean).join(" · ")}
          >
            Timeline
          </SectionTitle>
          {rows.map(({ task, status }) => {
            const bell = bells.get(task.id);
            const p = priorityOf(task.priority);
            const extra = [
              task.end != null ? formatDuration(spanOf(task)) : null,
              task.days ? repeatLabel(task.days) : null,
              clash.has(task.id) ? "overlaps" : null,
            ].filter(Boolean);
            return (
              <TaskRow
                key={task.id}
                text={task.text}
                cat={task.cat}
                color={catColor(task.cat)}
                done={!!tasks.day.checks[task.id]}
                onToggle={() => tasks.toggleCheck(task.id)}
                disabled={isFuture}
                onInspect={() => openInsight({ kind: "task", taskId: task.id })}
                onEdit={() => setEditor({ task })}
                onRemove={() => tasks.archive(task.id)}
                removeTitle="Archive (keeps past days intact)"
                time={`${formatRange(task)}${extra.length ? ` · ${extra.join(" · ")}` : ""}`}
                status={STATUS[status]}
                accent={periodColor(task.start)}
                highlight={status === "active"}
                badge={task.priority !== "normal" ? { label: p.label, color: p.color } : null}
                hint={bell ? `🔔 ${formatWhen(bell.at)}` : null}
              />
            );
          })}
          {gaps.length > 0 && (
            <div style={{ marginTop: "0.5rem", fontSize: 12, color: "var(--muted)" }}>
              <strong style={{ color: "var(--text)" }}>Free: </strong>
              {gaps.map((g) => `${formatClock(g.from)} – ${formatClock(g.to)} (${formatDuration(g.minutes)})`).join("  ·  ")}
            </div>
          )}
        </Card>
      )}

      <Card>
        <SectionTitle
          hint="Tap a task name to see its pattern"
          right={<Btn size="sm" onClick={() => setEditor({ task: null })}>+ Add</Btn>}
        >
          {timed.length ? "Anytime" : "Tasks"}
        </SectionTitle>
        {anytime.length === 0 ? (
          <Empty>
            {timed.length
              ? "Nothing without a time today."
              : "No tasks for this day. Add one — give it a time if you want it on a timeline."}
          </Empty>
        ) : (
          anytime.map((t) => {
            const bell = bells.get(t.id);
            const p = priorityOf(t.priority);
            return (
              <TaskRow
                key={t.id}
                text={t.text}
                cat={t.cat}
                color={catColor(t.cat)}
                done={!!tasks.day.checks[t.id]}
                onToggle={() => tasks.toggleCheck(t.id)}
                disabled={isFuture}
                onInspect={() => openInsight({ kind: "task", taskId: t.id })}
                onEdit={() => setEditor({ task: t })}
                onRemove={() => tasks.archive(t.id)}
                removeTitle="Archive (keeps past days intact)"
                time={t.days ? repeatLabel(t.days) : null}
                badge={t.priority !== "normal" ? { label: p.label, color: p.color } : null}
                hint={bell ? `🔔 ${formatWhen(bell.at)}` : null}
              />
            );
          })
        )}
      </Card>

      {tasks.isHoliday && (
        <Card style={{ borderLeft: "3px solid #f43f8e", borderRadius: 18 }}>
          <SectionTitle
            hint="Only shown on days marked as a holiday"
            right={<Btn size="sm" onClick={openHolidayModal}>+ Add</Btn>}
          >
            Holiday tasks
          </SectionTitle>
          {tasks.dayHolidayTasks.length === 0 ? (
            <Empty>No holiday tasks yet. Add one — it&rsquo;ll show up on every day you mark as a holiday.</Empty>
          ) : (
            tasks.dayHolidayTasks.map((t) => {
              const p = priorityOf(t.priority);
              return (
                <TaskRow
                  key={t.id}
                  text={t.text}
                  cat={t.cat}
                  color={catColor(t.cat)}
                  done={!!tasks.day.holidayChecks[t.id]}
                  onToggle={() => tasks.toggleHolidayCheck(t.id)}
                  disabled={isFuture}
                  onRemove={() => tasks.archiveHolidayTask(t.id)}
                  removeTitle="Archive"
                  badge={t.priority !== "normal" ? { label: p.label, color: p.color } : null}
                />
              );
            })
          )}
        </Card>
      )}

      {isWeekend && (
        <Card style={{ borderLeft: "3px solid #94a3b8", borderRadius: 18 }}>
          <SectionTitle
            hint="Shown alongside regular tasks on a Saturday or Sunday"
            right={<Btn size="sm" onClick={openWeekendModal}>+ Add</Btn>}
          >
            Weekend tasks
          </SectionTitle>
          {tasks.dayWeekendTasks.length === 0 ? (
            <Empty>No weekend tasks yet. Add one — it&rsquo;ll show up every Saturday and Sunday.</Empty>
          ) : (
            tasks.dayWeekendTasks.map((t) => {
              const p = priorityOf(t.priority);
              return (
                <TaskRow
                  key={t.id}
                  text={t.text}
                  cat={t.cat}
                  color={catColor(t.cat)}
                  done={!!tasks.day.weekendChecks[t.id]}
                  onToggle={() => tasks.toggleWeekendCheck(t.id)}
                  disabled={isFuture}
                  onRemove={() => tasks.archiveWeekendTask(t.id)}
                  removeTitle="Archive"
                  badge={t.priority !== "normal" ? { label: p.label, color: p.color } : null}
                />
              );
            })
          )}
        </Card>
      )}

      <div style={gridCols(260)}>
        <DayList
          title="Special tasks"
          items={tasks.day.special}
          color="#8b5cf6"
          emptyText="Nothing special planned."
          disabled={isFuture}
          onAdd={() => openList("special")}
          onToggle={(i) => tasks.toggleListItem("special", i)}
          onRemove={(i) => tasks.removeListItem("special", i)}
        />
        <DayList
          title="Extra tasks"
          items={tasks.day.extra}
          color="#06b6d4"
          emptyText="No extras logged."
          disabled={isFuture}
          onAdd={() => openList("extra")}
          onToggle={(i) => tasks.toggleListItem("extra", i)}
          onRemove={(i) => tasks.removeListItem("extra", i)}
        />
      </div>

      {quote && (
        <Card style={{ borderLeft: "3px solid var(--accent)", borderRadius: 18 }}>
          <p style={{ margin: 0, fontSize: 14, fontStyle: "italic", lineHeight: 1.5 }}>&ldquo;{quote.text}&rdquo;</p>
          <p style={{ margin: "0.4rem 0 0", fontSize: 12, color: "var(--muted)" }}>— {quote.auth}</p>
        </Card>
      )}

      {editor && <TaskEditor task={editor.task} nowMin={nowMin} onClose={() => setEditor(null)} />}

      <Modal
        open={!!listModal}
        onClose={() => setListModal(null)}
        title={
          isFuture
            ? `Plan for ${formatDate(selectedDay)}`
            : listModal === "special" ? "Add special task" : "Add extra task"
        }
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
              isFuture ? "e.g. Buy Riya\u2019s birthday gift"
                : listModal === "special" ? "One-off task for this day" : "Something extra you did"
            }
          />
          <WhenPicker value={listWhen} onChange={setListWhen} label="Remind me" />
          {isFuture && (
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
              It will wait on {formatDate(selectedDay)} — you can tick it when the day comes.
            </div>
          )}
        </div>
      </Modal>
      <Modal
        open={holidayModal}
        onClose={() => setHolidayModal(false)}
        title="Add holiday task"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setHolidayModal(false)}>Cancel</Btn>
            <Btn onClick={saveHolidayTask} disabled={!holidayText.trim()}>Add task</Btn>
          </>
        }
      >
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <Field label="Task" value={holidayText} onChange={setHolidayText} autoFocus onEnter={saveHolidayTask} placeholder="Plan the day" />
          <Field label="Category" options={TASK_CATS} value={holidayCat} onChange={setHolidayCat} />
        </div>
      </Modal>
      <Modal
        open={weekendModal}
        onClose={() => setWeekendModal(false)}
        title="Add weekend task"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setWeekendModal(false)}>Cancel</Btn>
            <Btn onClick={saveWeekendTask} disabled={!weekendText.trim()}>Add task</Btn>
          </>
        }
      >
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <Field label="Task" value={weekendText} onChange={setWeekendText} autoFocus onEnter={saveWeekendTask} placeholder="Meal prep for the week" />
          <Field label="Category" options={TASK_CATS} value={weekendCat} onChange={setWeekendCat} />
        </div>
      </Modal>
    </div>
  );
}

/** Shared shell for the per-day special / extra lists. */
function DayList({ title, items, color, emptyText, onAdd, onToggle, onRemove, disabled }) {
  return (
    <Card>
      <SectionTitle right={<Btn size="sm" variant="ghost" onClick={onAdd}>+ Add</Btn>}>{title}</SectionTitle>
      {items.length === 0 ? (
        <Empty>{emptyText}</Empty>
      ) : (
        items.map((item, i) => (
          <TaskRow
            key={item.id ?? i}
            text={item.text}
            cat={item.cat}
            color={color}
            done={item.done}
            disabled={disabled}
            onToggle={() => onToggle(i)}
            onRemove={() => onRemove(i)}
          />
        ))
      )}
    </Card>
  );
}
