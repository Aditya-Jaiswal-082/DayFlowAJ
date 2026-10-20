import { useMemo, useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { PRIORITIES, TASK_CATS } from "../lib/constants.js";
import { formatDate } from "../lib/dates.js";
import {
  REPEAT_OPTIONS, formatRange, isTimed, parseScheduleText, repeatLabel, repeatValue, toHHMM, toMinutes,
} from "../lib/schedule.js";
import { Btn } from "./Btn.jsx";
import { Field } from "./Field.jsx";
import { Modal } from "./Modal.jsx";
import { Segmented } from "./Segmented.jsx";
import { WhenPicker, whenToTimestamp, whenValue } from "./WhenPicker.jsx";

const REPEAT_LABELS = REPEAT_OPTIONS.map((o) => o.label);

/**
 * Add or edit a regular task — one modal for both.
 *
 * Adding offers two modes: "One task" (everything, including an optional time
 * and a reminder) and "Type several" (a line each — "7 to 9 gym", or plain
 * text for an anytime task — previewed before anything is saved). Editing
 * changes the task in place.
 *
 * Mount it only while open (`{editor && <TaskEditor … />}`) so its form state
 * starts fresh every time.
 */
export function TaskEditor({ task, nowMin, onClose }) {
  const { tasks, addTaskWithReminder, notifications, isFuture, selectedDay } = useTracker();
  const editing = !!task;

  const [mode, setMode] = useState("one");   // "one" | "many"
  const [text, setText] = useState(task?.text || "");
  const [cat, setCat] = useState(task?.cat || TASK_CATS[0]);
  const [priority, setPriority] = useState(task?.priority || "normal");
  const [timed, setTimed] = useState(task ? isTimed(task) : false);
  const [start, setStart] = useState(task && isTimed(task) ? toHHMM(task.start) : toHHMM(nowMin));
  const [end, setEnd] = useState(task && task.end != null ? toHHMM(task.end) : "");
  const [repeat, setRepeat] = useState(repeatLabel(task?.days));
  const [when, setWhen] = useState(() => ({ ...whenValue(false), ...(isFuture ? { date: selectedDay } : {}) }));
  const [bulk, setBulk] = useState("");

  const parsed = useMemo(() => parseScheduleText(bulk, { allowUntimed: true }), [bulk]);

  const startMin = toMinutes(start);
  const endMin = end ? toMinutes(end) : null;
  const timeOk = !timed || (startMin != null && (!end || endMin != null));
  const canSaveOne = !!text.trim() && timeOk;

  function choosePriority(val) {
    setPriority(val);
    if (val === "high" && !editing) setWhen((w) => ({ ...w, on: true }));
  }

  async function saveOne() {
    if (!canSaveOne) return;
    const fields = timed
      ? { start: startMin, end: endMin, days: repeatValue(repeat) }
      : { start: null, end: null, days: repeatValue(repeat) };

    if (editing) {
      tasks.update(task.id, { text, cat, priority, ...fields });
      onClose();
      return;
    }
    if (when.on && notifications.supported && notifications.permission === "default") {
      await notifications.request();
    }
    const ok = addTaskWithReminder({
      text, cat, priority, ...fields, remindAt: when.on ? whenToTimestamp(when) : null,
    });
    if (ok) onClose();
  }

  function saveMany() {
    if (!parsed.items.length) return;
    const days = repeatValue(repeat);
    tasks.addMany(parsed.items.map((i) => ({ ...i, cat, days })));
    onClose();
  }

  const many = !editing && mode === "many";
  const submit = many ? saveMany : saveOne;
  const canSubmit = many ? parsed.items.length > 0 : canSaveOne;
  const n = parsed.items.length;
  const submitLabel = editing ? "Save" : many ? (n ? `Add ${n} task${n === 1 ? "" : "s"}` : "Add tasks") : "Add task";

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Edit task" : "Add task"}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={!canSubmit}>{submitLabel}</Btn>
        </>
      }
    >
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {!editing && (
          <Segmented
            full
            value={mode}
            onChange={setMode}
            options={[{ value: "one", label: "One task" }, { value: "many", label: "Type several" }]}
          />
        )}

        {many ? (
          <>
            <Field
              label="One per line — a time first if it has one"
              rows={5}
              value={bulk}
              onChange={setBulk}
              autoFocus
              placeholder={"6:30 wake up\n7 to 9 gym\n9 to 11 prepare\nCall the bank"}
            />
            {n > 0 && (
              <div style={{ display: "grid", gap: 3, fontSize: 12.5 }}>
                {parsed.items.map((b, i) => (
                  <div key={i} style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--muted)", minWidth: 150 }}>{isTimed(b) ? formatRange(b) : "Anytime"}</span>
                    <span style={{ fontWeight: 600 }}>{b.text}</span>
                  </div>
                ))}
              </div>
            )}
            {parsed.errors.length > 0 && (
              <div style={{ fontSize: 12, color: "#ef4444" }}>
                Couldn&rsquo;t read: {parsed.errors.map((e) => `“${e}”`).join(", ")}
              </div>
            )}
            <Field label="Category" options={TASK_CATS} value={cat} onChange={setCat} />
            <Field label="Repeats" options={REPEAT_LABELS} value={repeat} onChange={setRepeat} />
          </>
        ) : (
          <>
            <Field label="Task" value={text} onChange={setText} autoFocus={!editing} onEnter={submit} placeholder="Gym" />
            <Field label="Category" options={TASK_CATS} value={cat} onChange={setCat} />

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>When</div>
              <Segmented
                full
                value={timed ? "timed" : "any"}
                onChange={(v) => setTimed(v === "timed")}
                options={[{ value: "any", label: "Anytime" }, { value: "timed", label: "At a time" }]}
              />
            </div>

            {timed && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
                <Field label="Starts" type="time" value={start} onChange={setStart} />
                <Field label="Ends (optional)" type="time" value={end} onChange={setEnd} />
              </div>
            )}
            <Field label="Repeats" options={REPEAT_LABELS} value={repeat} onChange={setRepeat} />

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
              {priority === "high" && !editing && (
                <p style={{ margin: "0.5rem 0 0", fontSize: 12, color: "#f59e0b" }}>
                  High priority — a reminder is switched on for you. Pick the time below.
                </p>
              )}
            </div>

            {!editing && <WhenPicker value={when} onChange={setWhen} label="Remind me to do this" />}
          </>
        )}

        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
          {editing
            ? "Changes apply to every day this task is on, past days included."
            : isFuture
              ? `This task starts on ${formatDate(selectedDay)}.`
              : "New tasks appear from today onward — past days stay as they were."}
        </div>
      </div>
    </Modal>
  );
}