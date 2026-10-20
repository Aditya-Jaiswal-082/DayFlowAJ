import { useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { MOOD_OPTS, PRIORITIES, TASK_CATS } from "../lib/constants.js";
import { formatWhen } from "../lib/reminders.js";
import { gridCols } from "../styles/theme.js";
import { haptic } from "../lib/haptics.js";
import {
  Btn, Card, CircleProgress, DayNav, Empty, Field, Modal, SectionTitle, TaskRow, TiltCard,
  WhenPicker, whenToTimestamp, whenValue,
} from "../components/index.js";

const priorityOf = (val) => PRIORITIES.find((p) => p.val === val) || PRIORITIES[1];

/** Checklists, mood, day note and the quote of the day. */
export function TodayTab() {
  const {
    tasks, stats, quote, catColor, reminders, notifications,
    addTaskWithReminder, openInsight, selectedDay, isWeekend,
  } = useTracker();

  const [taskModal, setTaskModal] = useState(false);
  const [text, setText] = useState("");
  const [cat, setCat] = useState(TASK_CATS[0]);
  const [priority, setPriority] = useState("normal");
  const [when, setWhen] = useState(() => whenValue(false));

  const [listModal, setListModal] = useState(null);   // "special" | "extra" | null
  const [listText, setListText] = useState("");

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

  /** High-priority tasks are the ones you most want a nudge for, so opt in by default. */
  function choosePriority(val) {
    setPriority(val);
    if (val === "high") setWhen((w) => ({ ...w, on: true }));
  }

  function openTaskModal() {
    setText("");
    setCat(TASK_CATS[0]);
    setPriority("normal");
    setWhen(whenValue(false));
    setTaskModal(true);
  }

  async function saveTask() {
    if (!text.trim()) return;
    if (when.on && notifications.supported && notifications.permission === "default") {
      await notifications.request();
    }
    const ok = addTaskWithReminder({
      text, cat, priority, remindAt: when.on ? whenToTimestamp(when) : null,
    });
    if (ok) setTaskModal(false);
  }

  function saveListItem() {
    if (tasks.addListItem(listModal, listText)) {
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
        <CircleProgress pct={stats.pct} label="done" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: -0.6 }}>{done}/{total}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {total === 0 ? "nothing scheduled" : remaining === 0 ? "all done for today" : `${remaining} left today`}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
            <Btn size="sm" variant="ghost" onClick={() => openInsight({ kind: "day", key: selectedDay })}>
              Day insight
            </Btn>
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
        <SectionTitle hint="Tap again to clear it">How are you feeling?</SectionTitle>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {MOOD_OPTS.map((m) => {
            const active = tasks.day.mood === m.val;
            return (
              <button
                key={m.val}
                type="button"
                className="pressable"
                onClick={() => { haptic("toggle"); tasks.setMood(m.val); }}
                style={{
                  flex: "1 1 88px",
                  padding: "0.55rem 0.4rem",
                  borderRadius: 14,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
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

      <Card>
        <SectionTitle
          hint="Tap a task name to see its pattern"
          right={<Btn size="sm" onClick={openTaskModal}>+ Add</Btn>}
        >
          Regular tasks
        </SectionTitle>
        {tasks.dayTasks.length === 0 ? (
          <Empty>No regular tasks for this day. Add one to get started.</Empty>
        ) : (
          tasks.dayTasks.map((t) => {
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
                onInspect={() => openInsight({ kind: "task", taskId: t.id })}
                onRemove={() => tasks.archive(t.id)}
                removeTitle="Archive (keeps past days intact)"
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
          onAdd={() => setListModal("special")}
          onToggle={(i) => tasks.toggleListItem("special", i)}
          onRemove={(i) => tasks.removeListItem("special", i)}
        />
        <DayList
          title="Extra tasks"
          items={tasks.day.extra}
          color="#06b6d4"
          emptyText="No extras logged."
          onAdd={() => setListModal("extra")}
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

      <Modal
        open={taskModal}
        onClose={() => setTaskModal(false)}
        title="Add regular task"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setTaskModal(false)}>Cancel</Btn>
            <Btn onClick={saveTask} disabled={!text.trim()}>Add task</Btn>
          </>
        }
      >
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <Field label="Task" value={text} onChange={setText} autoFocus placeholder="Drink 2L water" />
          <Field label="Category" options={TASK_CATS} value={cat} onChange={setCat} />

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Priority</div>
            <div style={{ display: "flex", gap: 6 }}>
              {PRIORITIES.map((p) => {
                const active = priority === p.val;
                return (
                  <button
                    key={p.val}
                    type="button"
                    className="pressable"
                    onClick={() => choosePriority(p.val)}
                    style={{
                      flex: 1,
                      padding: "0.6rem",
                      borderRadius: 13,
                      fontSize: 12.5,
                      fontWeight: 800,
                      cursor: "pointer",
                      border: `1px solid ${active ? p.color : "var(--border)"}`,
                      background: active ? `${p.color}1f` : "var(--bg-2)",
                      color: active ? p.color : "var(--muted)",
                      boxShadow: active ? "var(--shadow-1)" : "var(--shadow-press)",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            {priority === "high" && (
              <p style={{ margin: "0.5rem 0 0", fontSize: 12, color: "#f59e0b" }}>
                High priority — a reminder is switched on for you. Pick the time below.
              </p>
            )}
          </div>

          <WhenPicker value={when} onChange={setWhen} label="Remind me to do this" />
        </div>
      </Modal>

      <Modal
        open={!!listModal}
        onClose={() => setListModal(null)}
        title={listModal === "special" ? "Add special task" : "Add extra task"}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setListModal(null)}>Cancel</Btn>
            <Btn onClick={saveListItem} disabled={!listText.trim()}>Add</Btn>
          </>
        }
      >
        <Field
          label="Task"
          value={listText}
          onChange={setListText}
          autoFocus
          onEnter={saveListItem}
          placeholder={listModal === "special" ? "One-off task for this day" : "Something extra you did"}
        />
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
function DayList({ title, items, color, emptyText, onAdd, onToggle, onRemove }) {
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
            onToggle={() => onToggle(i)}
            onRemove={() => onRemove(i)}
          />
        ))
      )}
    </Card>
  );
}
