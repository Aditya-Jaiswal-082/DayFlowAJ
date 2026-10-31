import { useRef, useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { EXPENSE_CATS, SCHEMA_VERSION } from "../lib/constants.js";
import { backupFilename, downloadJSON, parseBackup, readTextFile } from "../lib/backup.js";
import { formatDate } from "../lib/dates.js";
import { inputStyle, labelStyle } from "../styles/theme.js";
import { Btn, Card, Logo, Modal, Segmented, SectionTitle } from "../components/index.js";

const RED = "#c0392b";

const NOTIFY_STATE = {
  granted: "Allowed. Reminders can alert you while the app is open.",
  denied: "Blocked in your browser. Allow notifications for this site in the browser settings, then come back.",
  default: "Not asked yet. Reminders still appear in the app.",
  unsupported: "This browser can't show notifications. Reminders still appear in the app.",
};

/** Appearance, notifications, weather, budgets, backup, archives, reset. */
export function SettingsTab() {
  const {
    notifications, expenses, tasks, exportData, importData, resetAll, toasts, weatherCtl, dark, toggleDark,
  } = useTracker();

  const fileRef = useRef(null);
  const [status, setStatus] = useState(null);           // { kind: "ok" | "error", message }
  const [confirmReset, setConfirmReset] = useState(false);
  const [purge, setPurge] = useState(null);             // { text, run } while a permanent delete awaits confirmation

  function doExport() {
    downloadJSON(backupFilename(), exportData());
    setStatus({ kind: "ok", message: "Backup downloaded. Keep the file somewhere safe." });
  }

  async function doImport(file) {
    if (!file) return;
    try {
      const data = parseBackup(await readTextFile(file));
      const c = importData(data);
      setStatus({
        kind: "ok",
        message: `Restored ${c.tasks} tasks, ${c.days} days, ${c.notes} notes, ${c.expenses} expenses, ${c.holidayTasks} holiday tasks and ${c.weekendTasks} weekend tasks. Jumped to your most recent entry. Insights measures the last 7 real days, so it fills in as you keep using the app.`,
      });
    } catch (err) {
      setStatus({ kind: "error", message: err.message });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function testNotification() {
    if (notifications.permission === "default") await notifications.request();
    const sent = await notifications.notify({ title: "DayFlow AJ", body: "Notifications are working.", tag: "test" });
    if (!sent) toasts.push({ message: "Couldn't show a system notification. Check your browser settings." });
  }

  const archives = [
    {
      title: "Archived tasks",
      hint: "Past days keep their real numbers.",
      items: tasks.archived,
      restore: tasks.unarchive,
      remove: tasks.purge,
    },
    {
      title: "Archived holiday tasks",
      hint: "Shown only on days marked as a holiday.",
      items: tasks.archivedHoliday,
      restore: tasks.unarchiveHolidayTask,
      remove: tasks.purgeHolidayTask,
    },
    {
      title: "Archived weekend tasks",
      hint: "Shown on Saturdays and Sundays.",
      items: tasks.archivedWeekend,
      restore: tasks.unarchiveWeekendTask,
      remove: tasks.purgeWeekendTask,
    },
  ];
  const anyArchived = archives.some((a) => a.items.length > 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "0.75rem", maxWidth: 680, margin: "0 auto" }}>
      <Card style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Logo size={44} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>DayFlow AJ</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Everything is stored on this device. Data format v{SCHEMA_VERSION}.
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Appearance</SectionTitle>
        <Segmented
          full
          value={dark ? "dark" : "light"}
          onChange={(v) => { if ((v === "dark") !== dark) toggleDark(); }}
          options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
        />
      </Card>

      <Card>
        <SectionTitle>Notifications</SectionTitle>
        <p style={{ margin: "0 0 0.8rem", fontSize: 14, lineHeight: 1.5 }}>
          {NOTIFY_STATE[notifications.permission] || NOTIFY_STATE.default}
        </p>
        <p style={{ margin: "0 0 0.9rem", fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>
          Alerts work while the app is open, including in a background tab. A reminder that comes
          due while the app is closed is shown the next time you open it.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {notifications.permission === "default" && <Btn onClick={notifications.request}>Allow notifications</Btn>}
          {notifications.supported && notifications.permission !== "denied" && (
            <Btn variant="ghost" onClick={testNotification}>Send a test</Btn>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle>Weather</SectionTitle>
        <p style={{ margin: "0 0 0.9rem", fontSize: 14, lineHeight: 1.5 }}>
          {weatherCtl.error
            ? weatherCtl.error
            : weatherCtl.pref === "on"
              ? "On. The temperature shows at the top of the screen."
              : "Off. Your location is never requested."}
        </p>
        <p style={{ margin: "0 0 0.9rem", fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>
          Your location is used only to fetch the temperature from Open-Meteo. Nothing else in the app uses it.
        </p>
        {weatherCtl.pref === "on"
          ? <Btn variant="ghost" onClick={weatherCtl.disable}>Turn off</Btn>
          : <Btn onClick={weatherCtl.enable}>Turn on</Btn>}
      </Card>

      <Card>
        <SectionTitle hint="Leave a category blank for no limit.">Monthly budgets</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.7rem" }}>
          {EXPENSE_CATS.map((cat) => (
            <div key={cat} style={{ minWidth: 0 }}>
              <label style={labelStyle} htmlFor={`budget-${cat}`}>{cat}</label>
              <input
                id={`budget-${cat}`}
                type="number"
                min="0"
                step="100"
                inputMode="numeric"
                value={expenses.budgets[cat] ?? ""}
                placeholder="No limit"
                onChange={(e) => expenses.setBudget(cat, e.target.value)}
                style={{ ...inputStyle, fontSize: 16, minHeight: 44 }}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Backup</SectionTitle>
        <p style={{ margin: "0 0 0.9rem", fontSize: 14, lineHeight: 1.5 }}>
          Clearing this browser&rsquo;s site data wipes everything, so export a copy now and then.
        </p>
        <p style={{ margin: "0 0 0.9rem", fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>
          Older backups are upgraded automatically when you import them.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={doExport}>Export backup</Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>Import backup</Btn>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => doImport(e.target.files?.[0])}
            style={{ display: "none" }}
          />
        </div>
        {status && (
          <p
            role="status"
            style={{
              margin: "0.9rem 0 0",
              padding: "0.65rem 0.75rem",
              borderRadius: 8,
              fontSize: 13.5,
              lineHeight: 1.5,
              background: "var(--bg-2)",
              borderLeft: `3px solid ${status.kind === "error" ? RED : "var(--accent)"}`,
            }}
          >
            {status.message}
          </p>
        )}
      </Card>

      {anyArchived ? (
        archives.filter((a) => a.items.length).map((a) => (
          <Card key={a.title} style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "0.95rem 1rem 0.5rem" }}>
              <SectionTitle hint={a.hint}>{`${a.title} (${a.items.length})`}</SectionTitle>
            </div>
            {a.items.map((t, i) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0.55rem 0.5rem 0.55rem 1rem",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, wordBreak: "break-word" }}>{t.text}</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {t.cat}, archived {formatDate(t.archivedAt)}
                  </div>
                </div>
                <Btn size="sm" variant="ghost" onClick={() => a.restore(t.id)}>Restore</Btn>
                <Btn
                  size="sm"
                  variant="danger"
                  feedback="warn"
                  onClick={() => setPurge({ text: t.text, run: () => a.remove(t.id) })}
                >
                  Delete
                </Btn>
              </div>
            ))}
          </Card>
        ))
      ) : (
        <Card>
          <SectionTitle hint="Tasks you archive from their edit sheet are kept here, and can be restored.">Archive</SectionTitle>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>Nothing archived.</div>
        </Card>
      )}

      <Card style={{ borderColor: `${RED}55` }}>
        <SectionTitle>Delete all data</SectionTitle>
        <p style={{ margin: "0 0 0.9rem", fontSize: 14, lineHeight: 1.5 }}>
          Removes every task, day, note, expense, reminder, holiday task and weekend task from this device.
        </p>
        <Btn variant="ghost" style={{ color: RED, borderColor: `${RED}55` }} onClick={() => setConfirmReset(true)}>
          Delete all data
        </Btn>
      </Card>

      <Modal
        open={!!purge}
        onClose={() => setPurge(null)}
        title="Delete permanently?"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setPurge(null)}>Cancel</Btn>
            <Btn
              feedback="warn"
              style={{ background: RED, borderColor: RED }}
              onClick={() => { purge.run(); setPurge(null); }}
            >
              Delete
            </Btn>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
          &ldquo;{purge?.text}&rdquo; will be removed for good. Past days that included it lose it from their history too.
          To keep that history, restore the task or leave it archived instead.
        </p>
      </Modal>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Delete everything?"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Btn>
            <Btn
              feedback="warn"
              style={{ background: RED, borderColor: RED }}
              onClick={() => {
                const snapshot = exportData();
                resetAll();
                setConfirmReset(false);
                toasts.push({ message: "All data deleted.", undo: () => importData(snapshot.data), ttl: 12000 });
              }}
            >
              Delete everything
            </Btn>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
          You can undo this from the message that appears afterwards, but only for a few seconds.
          Export a backup first if you aren&rsquo;t sure.
        </p>
      </Modal>
    </div>
  );
}
