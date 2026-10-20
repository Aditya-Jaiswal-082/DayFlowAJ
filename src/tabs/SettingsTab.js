import { useRef, useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { EXPENSE_CATS, SCHEMA_VERSION } from "../lib/constants.js";
import { backupFilename, downloadJSON, parseBackup, readTextFile } from "../lib/backup.js";
import { formatDate } from "../lib/dates.js";
import { gridCols, inputStyle, labelStyle } from "../styles/theme.js";
import { Btn, Card, Empty, Logo, Modal, SectionTitle } from "../components/index.js";

/** Notifications, budgets, backup/restore, archived tasks, reset. */
export function SettingsTab() {
  const { notifications, expenses, tasks, exportData, importData, resetAll, toasts } = useTracker();

  const fileRef = useRef(null);
  const [status, setStatus] = useState(null);      // {kind:"ok"|"error", message}
  const [confirmReset, setConfirmReset] = useState(false);

  function doExport() {
    downloadJSON(backupFilename(), exportData());
    setStatus({ kind: "ok", message: "Backup downloaded." });
  }

  async function doImport(file) {
    if (!file) return;
    try {
      const data = parseBackup(await readTextFile(file));
      const c = importData(data);
      setStatus({
        kind: "ok",
        message: `Restored ${c.tasks} tasks, ${c.days} days, ${c.notes} notes, ${c.expenses} expenses, ${c.holidayTasks} holiday tasks, ${c.weekendTasks} weekend tasks, ${c.schedule} schedule blocks. Jumped to your most recent entry so you can see it — Analysis still measures the last 7 real days, so that catches up once you've used the app a bit.`,
      });
    } catch (err) {
      setStatus({ kind: "error", message: err.message });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function testNotification() {
    if (notifications.permission === "default") await notifications.request();
    const sent = await notifications.notify({
      title: "DayFlow AJ", body: "Notifications are working.", tag: "test",
    });
    if (!sent) toasts.push({ message: "Couldn't show a system notification — check your browser settings." });
  }

  return (
    <div style={{ display: "grid", gap: "0.75rem" }} className="stagger">
      <Card style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Logo size={46} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>DayFlow AJ</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Local-first · schema v{SCHEMA_VERSION} · installable from your browser menu
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle hint={`Permission: ${notifications.permission}`}>Notifications</SectionTitle>
        <p style={{ margin: "0 0 0.8rem", fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
          Reminders alert you while the app is open in a tab — including in the background.
          Anything due while it&rsquo;s fully closed is delivered the next time you open it.
          Alerts with the app closed would need a push server.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {notifications.permission === "default" && <Btn onClick={notifications.request}>Enable notifications</Btn>}
          <Btn variant="ghost" onClick={testNotification}>Send a test</Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle hint="Blank means no limit">Monthly budgets</SectionTitle>
        <div style={{ ...gridCols(130), gap: "0.6rem" }}>
          {EXPENSE_CATS.map((cat) => (
            <div key={cat}>
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
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Backup</SectionTitle>
        <p style={{ margin: "0 0 0.8rem", fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
          Everything is stored in this browser only. Clearing site data wipes it, so export a
          copy now and then. Older backups are upgraded automatically on import.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={doExport}>Export backup</Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>Import backup…</Btn>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => doImport(e.target.files?.[0])}
            style={{ display: "none" }}
          />
        </div>
        {status && (
          <p style={{ margin: "0.8rem 0 0", fontSize: 13, color: status.kind === "error" ? "#ef4444" : "#10b981" }}>
            {status.message}
          </p>
        )}
      </Card>

      <Card>
        <SectionTitle hint="Past days keep their real numbers">
          Archived tasks ({tasks.archived.length})
        </SectionTitle>
        {tasks.archived.length === 0 ? (
          <Empty icon="○">Nothing archived.</Empty>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {tasks.archived.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0.6rem 0.7rem",
                  borderRadius: 13,
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, wordBreak: "break-word" }}>{t.text}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                    {t.cat} · archived {formatDate(t.archivedAt)}
                  </div>
                </div>
                <Btn size="sm" variant="ghost" onClick={() => tasks.unarchive(t.id)}>Restore</Btn>
                <Btn size="sm" variant="danger" onClick={() => tasks.purge(t.id)} title="Delete permanently (rewrites history)" feedback="warn">🗑</Btn>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle hint="Shown only on days marked as a holiday">
          Archived holiday tasks ({tasks.archivedHoliday.length})
        </SectionTitle>
        {tasks.archivedHoliday.length === 0 ? (
          <Empty icon="○">Nothing archived.</Empty>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {tasks.archivedHoliday.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0.6rem 0.7rem",
                  borderRadius: 13,
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, wordBreak: "break-word" }}>{t.text}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                    {t.cat} · archived {formatDate(t.archivedAt)}
                  </div>
                </div>
                <Btn size="sm" variant="ghost" onClick={() => tasks.unarchiveHolidayTask(t.id)}>Restore</Btn>
                <Btn size="sm" variant="danger" onClick={() => tasks.purgeHolidayTask(t.id)} title="Delete permanently" feedback="warn">🗑</Btn>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle hint="Shown alongside regular tasks on a Saturday or Sunday">
          Archived weekend tasks ({tasks.archivedWeekend.length})
        </SectionTitle>
        {tasks.archivedWeekend.length === 0 ? (
          <Empty icon="○">Nothing archived.</Empty>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {tasks.archivedWeekend.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0.6rem 0.7rem",
                  borderRadius: 13,
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, wordBreak: "break-word" }}>{t.text}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                    {t.cat} · archived {formatDate(t.archivedAt)}
                  </div>
                </div>
                <Btn size="sm" variant="ghost" onClick={() => tasks.unarchiveWeekendTask(t.id)}>Restore</Btn>
                <Btn size="sm" variant="danger" onClick={() => tasks.purgeWeekendTask(t.id)} title="Delete permanently" feedback="warn">🗑</Btn>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ borderColor: "#ef444455" }}>
        <SectionTitle>Danger zone</SectionTitle>
        <p style={{ margin: "0 0 0.8rem", fontSize: 13, color: "var(--muted)" }}>
          Deletes every task, day, note, expense, reminder, holiday task and weekend task.
        </p>
        <Btn variant="ghost" style={{ color: "#ef4444", borderColor: "#ef444455" }} onClick={() => setConfirmReset(true)}>
          Delete all data
        </Btn>
      </Card>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Delete everything?"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Btn>
            <Btn
              style={{ background: "linear-gradient(180deg,#f87171,#ef4444)" }}
              feedback="warn"
              onClick={() => {
                const snapshot = exportData();
                resetAll();
                setConfirmReset(false);
                toasts.push({ message: "All data deleted.", undo: () => importData(snapshot.data), ttl: 12000 });
              }}
            >
              Delete
            </Btn>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
          This can&rsquo;t be undone once the Undo toast disappears. Export a backup first if
          you&rsquo;re not sure.
        </p>
      </Modal>
    </div>
  );
}