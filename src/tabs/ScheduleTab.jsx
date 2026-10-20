import { useMemo, useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { DAYS } from "../lib/constants.js";
import { dayOfWeek, formatDate, getPastDaysEndingAt } from "../lib/dates.js";
import {
  REPEAT_OPTIONS, blockStatus, daySummary, effectiveEnd, formatClock, formatDuration, formatRange,
  freeGaps, overlappingIds, parseScheduleText, scheduleAdherence, scheduleOn, spanOf, toHHMM, toMinutes,
} from "../lib/schedule.js";
import { useNow } from "../hooks/useNow.js";
import { Btn, Card, DayNav, Empty, Field, Modal, SectionTitle } from "../components/index.js";

const STATUS = {
  done: { label: "Done", color: "#10b981" },
  active: { label: "Now", color: "var(--accent)" },
  upcoming: { label: "Later", color: "var(--muted)" },
  missed: { label: "Missed", color: "#ef4444" },
};

/** Tint a block by the part of the day it starts in. */
const periodColor = (m) => (m < 300 ? "#6366f1" : m < 720 ? "#f59e0b" : m < 1020 ? "#06b6d4" : m < 1260 ? "#a855f7" : "#6366f1");

const repeatLabel = (days) => (REPEAT_OPTIONS.find((o) => o.value === days) || REPEAT_OPTIONS[0]).label;
const repeatValue = (label) => (REPEAT_OPTIONS.find((o) => o.label === label) || REPEAT_OPTIONS[0]).value;

const pctColor = (p) => (p >= 80 ? "#10b981" : p >= 50 ? "#f59e0b" : "#ef4444");

export function ScheduleTab() {
  const { schedule, tasks, selectedDay, setSelectedDay, today, isToday } = useTracker();
  const nowMin = useNow();

  const [bulk, setBulk] = useState("");
  const [bulkRepeat, setBulkRepeat] = useState(REPEAT_OPTIONS[0].label);
  const [editing, setEditing] = useState(null); // { id?, start, end, text, repeat } | null

  const list = useMemo(() => scheduleOn(schedule.all, selectedDay), [schedule.all, selectedDay]);
  const checks = tasks.day.scheduleChecks;

  const rows = list.map((item) => {
    const done = !!checks[item.id];
    return { item, done, status: blockStatus({ item, sorted: list, nowMin, dayKey: selectedDay, todayKey: today, done }) };
  });
  const summary = daySummary({ items: list, checks, dayKey: selectedDay, todayKey: today, nowMin });
  const clash = useMemo(() => overlappingIds(list), [list]);
  const gaps = useMemo(() => freeGaps(list), [list]);
  const week = useMemo(
    () => scheduleAdherence(schedule.all, tasks.dayData, getPastDaysEndingAt(selectedDay, 7)),
    [schedule.all, tasks.dayData, selectedDay],
  );

  const parsed = useMemo(() => parseScheduleText(bulk), [bulk]);
  const current = isToday ? rows.find((r) => r.status === "active") : null;
  const next = isToday ? rows.find((r) => r.status === "upcoming") : null;

  function addBulk() {
    if (schedule.addMany(parsed.items, repeatValue(bulkRepeat))) setBulk("");
  }

  function openAdd() {
    setEditing({ start: toHHMM(nowMin), end: "", text: "", repeat: REPEAT_OPTIONS[0].label });
  }

  function openEdit(item) {
    setEditing({
      id: item.id,
      start: toHHMM(item.start),
      end: item.end == null ? "" : toHHMM(item.end),
      text: item.text,
      repeat: repeatLabel(item.days),
    });
  }

  const editStart = editing ? toMinutes(editing.start) : null;
  const editEnd = editing && editing.end ? toMinutes(editing.end) : null;
  const canSave = !!editing && editStart != null && editing.text.trim() && (!editing.end || editEnd != null);

  function saveEdit() {
    if (!canSave) return;
    const block = { start: editStart, end: editEnd, text: editing.text.trim() };
    if (editing.id) schedule.update(editing.id, { ...block, days: repeatValue(editing.repeat) });
    else schedule.addMany([block], repeatValue(editing.repeat));
    setEditing(null);
  }

  const patchEdit = (patch) => setEditing((e) => ({ ...e, ...patch }));

  return (
    <div style={{ display: "grid", gap: "0.75rem" }} className="stagger">
      <DayNav />

      {list.length > 0 && (
        <Card>
          {isToday && (
            <div style={{ marginBottom: "0.9rem" }}>
              {current ? (
                <>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent)" }}>HAPPENING NOW</div>
                  <div style={{ fontSize: 18, fontWeight: 800, margin: "2px 0" }}>{current.item.text}</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {formatRange(current.item)}
                    {current.item.end != null && ` · ${formatDuration(effectiveEnd(current.item, list) - nowMin)} left`}
                  </div>
                  {current.item.end != null && (
                    <div style={{ height: 6, borderRadius: 99, background: "var(--bg-2)", marginTop: 8, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, Math.max(0, ((nowMin - current.item.start) / Math.max(1, spanOf(current.item))) * 100))}%`,
                          background: "var(--accent)",
                          borderRadius: 99,
                        }}
                      />
                    </div>
                  )}
                </>
              ) : next ? (
                <>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)" }}>NEXT UP</div>
                  <div style={{ fontSize: 18, fontWeight: 800, margin: "2px 0" }}>{next.item.text}</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {formatClock(next.item.start)} · in {formatDuration(next.item.start - nowMin)}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14, fontWeight: 700 }}>That&rsquo;s everything on today&rsquo;s plan.</div>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {[
              { label: "Done", value: `${summary.done}/${summary.total}`, color: "#10b981" },
              { label: "Missed", value: summary.missed, color: summary.missed ? "#ef4444" : "var(--muted)" },
              { label: "Planned", value: formatDuration(summary.plannedMin), color: "var(--text)" },
              { label: "Finished", value: formatDuration(summary.doneMin), color: "var(--text)" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center", padding: "0.5rem 0.2rem", borderRadius: 12, background: "var(--bg-2)" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle
          hint={`${formatDate(selectedDay)}${isToday ? "" : " — what you ticked and what slipped"}`}
          right={<Btn size="sm" onClick={openAdd}>+ Block</Btn>}
        >
          Timetable
        </SectionTitle>

        {rows.length === 0 ? (
          <Empty icon="◷">Nothing scheduled for this day. Type your routine into the box below to fill it in.</Empty>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {rows.map(({ item, done, status }) => {
              const st = STATUS[status];
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "0.6rem 0.7rem",
                    borderRadius: 14,
                    background: status === "active" ? "var(--accent-soft)" : "var(--bg-2)",
                    border: "1px solid var(--border)",
                    borderLeft: `3px solid ${periodColor(item.start)}`,
                  }}
                >
                  <button
                    type="button"
                    className="pressable"
                    onClick={() => tasks.toggleScheduleCheck(item.id)}
                    title={done ? "Mark as not done" : "Mark as done"}
                    aria-pressed={done}
                    style={{
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      borderRadius: "50%",
                      cursor: "pointer",
                      border: `2px solid ${done ? "#10b981" : "var(--border)"}`,
                      background: done ? "#10b981" : "transparent",
                      color: "#fff",
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    {done ? "✓" : ""}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, wordBreak: "break-word", textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>
                      {item.text}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span>{formatRange(item)}</span>
                      {item.end != null && <span>· {formatDuration(spanOf(item))}</span>}
                      {item.days !== "all" && <span>· {repeatLabel(item.days)}</span>}
                      {clash.has(item.id) && <span style={{ color: "#f59e0b", fontWeight: 700 }}>· overlaps</span>}
                    </div>
                  </div>

                  <span style={{ fontSize: 10.5, fontWeight: 800, color: st.color, flexShrink: 0 }}>{st.label}</span>
                  <Btn size="sm" variant="ghost" onClick={() => openEdit(item)} title="Edit">✎</Btn>
                  <Btn size="sm" variant="danger" onClick={() => schedule.archive(item.id)} title="Archive" feedback="warn">🗑</Btn>
                </div>
              );
            })}
          </div>
        )}

        {gaps.length > 0 && (
          <div style={{ marginTop: "0.8rem", fontSize: 12, color: "var(--muted)" }}>
            <strong style={{ color: "var(--text)" }}>Free: </strong>
            {gaps.map((g) => `${formatClock(g.from)} – ${formatClock(g.to)} (${formatDuration(g.minutes)})`).join("  ·  ")}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle hint="One block per line — a time, then what you're doing">
          Type your day
        </SectionTitle>
        <div style={{ display: "grid", gap: "0.6rem" }}>
          <Field
            rows={5}
            value={bulk}
            onChange={setBulk}
            placeholder={"6:30 wake up\n7 to 9 gym\n9 to 11 prepare\n1 to 2 lunch"}
          />

          {parsed.items.length > 0 && (
            <div style={{ display: "grid", gap: 3, fontSize: 12.5 }}>
              {parsed.items.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--muted)", minWidth: 150 }}>{formatRange(b)}</span>
                  <span style={{ fontWeight: 600 }}>{b.text}</span>
                </div>
              ))}
            </div>
          )}
          {parsed.errors.length > 0 && (
            <div style={{ fontSize: 12, color: "#ef4444" }}>
              Couldn&rsquo;t read: {parsed.errors.map((e) => `“${e}”`).join(", ")} — start each line with a time.
            </div>
          )}

          <Field label="Repeats" options={REPEAT_OPTIONS.map((o) => o.label)} value={bulkRepeat} onChange={setBulkRepeat} />
          {!isToday && (
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
              These start from {formatDate(selectedDay)} onward.
            </div>
          )}
          <Btn onClick={addBulk} disabled={!parsed.items.length}>
            {parsed.items.length ? `Add ${parsed.items.length} block${parsed.items.length === 1 ? "" : "s"}` : "Add to schedule"}
          </Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle hint="Tap a day to open it">Last 7 days</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {week.map((d) => (
            <button
              key={d.key}
              type="button"
              className="pressable"
              onClick={() => setSelectedDay(d.key)}
              title={d.pct == null ? "Nothing scheduled" : `${d.done} of ${d.total} done`}
              style={{
                display: "grid",
                gap: 4,
                justifyItems: "center",
                padding: "0.4rem 0",
                borderRadius: 12,
                cursor: "pointer",
                background: d.key === selectedDay ? "var(--accent-soft)" : "transparent",
                border: "none",
                color: "var(--text)",
                font: "inherit",
              }}
            >
              <div style={{ height: 52, width: 14, borderRadius: 7, background: "var(--bg-2)", display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
                {d.pct != null && (
                  <div style={{ width: "100%", height: `${Math.max(6, d.pct)}%`, background: pctColor(d.pct), borderRadius: 7 }} />
                )}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)" }}>{DAYS[dayOfWeek(d.key)][0]}</div>
              <div style={{ fontSize: 10.5, fontWeight: 700 }}>{d.pct == null ? "–" : `${d.pct}%`}</div>
            </button>
          ))}
        </div>
      </Card>

      {schedule.archived.length > 0 && (
        <Card>
          <SectionTitle hint="Past days still show them">Archived blocks ({schedule.archived.length})</SectionTitle>
          <div style={{ display: "grid", gap: 6 }}>
            {schedule.archived.map((b) => (
              <div
                key={b.id}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.6rem 0.7rem", borderRadius: 13, background: "var(--bg-2)", border: "1px solid var(--border)" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, wordBreak: "break-word" }}>{b.text}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                    {formatRange(b)} · archived {formatDate(b.archivedAt)}
                  </div>
                </div>
                <Btn size="sm" variant="ghost" onClick={() => schedule.unarchive(b.id)}>Restore</Btn>
                <Btn size="sm" variant="danger" onClick={() => schedule.purge(b.id)} title="Delete permanently" feedback="warn">🗑</Btn>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit block" : "Add block"}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
            <Btn onClick={saveEdit} disabled={!canSave}>{editing?.id ? "Save" : "Add block"}</Btn>
          </>
        }
      >
        {editing && (
          <div style={{ display: "grid", gap: "0.9rem" }}>
            <Field label="What" value={editing.text} onChange={(v) => patchEdit({ text: v })} autoFocus onEnter={saveEdit} placeholder="Gym" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
              <Field label="Starts" type="time" value={editing.start} onChange={(v) => patchEdit({ start: v })} />
              <Field label="Ends (optional)" type="time" value={editing.end} onChange={(v) => patchEdit({ end: v })} />
            </div>
            <Field label="Repeats" options={REPEAT_OPTIONS.map((o) => o.label)} value={editing.repeat} onChange={(v) => patchEdit({ repeat: v })} />
          </div>
        )}
      </Modal>
    </div>
  );
}