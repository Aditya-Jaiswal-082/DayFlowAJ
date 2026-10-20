import { useMemo, useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { formatDate } from "../lib/dates.js";
import { NOTE_COLORS } from "../lib/constants.js";
import { Btn, Card, Empty, Field, Modal, SectionTitle } from "../components/index.js";

/** Every tag gets a colour of its own (the same tag is always the same colour). */
const TAG_COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4", "#a855f7", "#ef4444", "#84cc16"];

function tagColor(tag) {
  let h = 0;
  for (const ch of String(tag).toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length];
}

const splitTags = (raw) => String(raw || "").split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);

const blank = () => ({ id: null, title: "", text: "", tags: "", color: NOTE_COLORS[0], pinned: false, date: null });

/** Notes as small pocket-sized cards; tap one to open it for editing. */
export function NotesTab() {
  const { notes, openInsight } = useTracker();

  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(null);   // the note being written / edited, or null
  const patch = (p) => setEditor((e) => ({ ...e, ...p }));

  const visible = notes.search(query);

  function openNote(n) {
    setEditor({
      id: n.id,
      title: n.title === "Untitled" ? "" : n.title,
      text: n.text,
      tags: (n.tags || []).join(", "),
      color: n.color || NOTE_COLORS[0],
      pinned: !!n.pinned,
      date: n.date,
    });
  }

  function save() {
    if (!editor) return;
    const ok = editor.id ? notes.update(editor.id, editor) : notes.add(editor);
    if (ok) setEditor(null);
  }

  function removeNote() {
    notes.remove(editor.id);
    setEditor(null);
  }

  function togglePin() {
    notes.togglePin(editor.id);
    patch({ pinned: !editor.pinned });
  }

  const editorTags = useMemo(() => splitTags(editor?.tags), [editor?.tags]);

  return (
    <div style={{ display: "grid", gap: "0.75rem" }} className="stagger">
      <Card>
        <SectionTitle
          hint="Tap a note to open and edit it"
          right={<Btn size="sm" onClick={() => setEditor(blank())}>+ New note</Btn>}
        >
          Notes ({query ? `${visible.length} of ${notes.all.length}` : notes.all.length})
        </SectionTitle>

        {notes.all.length > 0 && (
          <Field value={query} onChange={setQuery} placeholder="Search notes or tags…" style={{ marginBottom: "0.8rem" }} />
        )}

        {visible.length === 0 ? (
          <Empty icon="▭">{query ? "Nothing matches that search." : "No notes yet — tap + New note."}</Empty>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {visible.map((n) => (
              <PocketNote key={n.id} note={n} onOpen={() => openNote(n)} />
            ))}
          </div>
        )}
      </Card>

      {editor && (
        <Modal
          open
          onClose={() => setEditor(null)}
          title={editor.id ? "Note" : "New note"}
          footer={
            <>
              {editor.id && (
                <>
                  <Btn variant="danger" size="sm" onClick={removeNote} feedback="warn" title="Delete note">🗑 Delete</Btn>
                  <Btn variant="ghost" size="sm" onClick={togglePin}>{editor.pinned ? "📌 Unpin" : "📌 Pin"}</Btn>
                  <span style={{ flex: 1 }} />
                </>
              )}
              <Btn onClick={save} disabled={!editor.text.trim()}>{editor.id ? "Save" : "Add note"}</Btn>
            </>
          }
        >
          <div style={{ display: "grid", gap: "0.8rem" }}>
            <Field label="Heading" value={editor.title} onChange={(v) => patch({ title: v })} placeholder="Title (optional)" />
            <Field
              label="Note"
              rows={7}
              value={editor.text}
              onChange={(v) => patch({ text: v })}
              placeholder="Write something…"
              autoFocus={!editor.id}
            />
            <Field label="Tags" value={editor.tags} onChange={(v) => patch({ tags: v })} placeholder="comma, separated, tags" />
            {editorTags.length > 0 && <TagRow tags={editorTags} />}

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Colour</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="pressable"
                    onClick={() => patch({ color: c })}
                    title={c}
                    aria-label={`Colour ${c}`}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: c,
                      border: editor.color === c ? "2px solid var(--text)" : "2px solid transparent",
                      boxShadow: editor.color === c ? `0 0 10px ${c}` : "none",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>

            {editor.date && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 11.5, color: "var(--muted)" }}>
                <span>Written {formatDate(editor.date)}</span>
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => { const key = editor.date; setEditor(null); openInsight({ kind: "day", key }); }}
                >
                  See that day
                </Btn>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/** One small card: heading, a short preview, then the tags as glowing chips. */
function PocketNote({ note, onOpen }) {
  const color = note.color || NOTE_COLORS[0];
  return (
    <button
      type="button"
      className="pressable"
      onClick={onOpen}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 128,
        padding: "0.75rem 0.8rem 0.7rem",
        textAlign: "left",
        borderRadius: 18,
        cursor: "pointer",
        color: "var(--text)",
        font: "inherit",
        background: `linear-gradient(155deg, ${color}26, var(--bg-2) 70%)`,
        border: `1px solid ${color}55`,
        boxShadow: `0 4px 14px ${color}1f`,
        overflow: "hidden",
      }}
    >
      <span
        aria-hidden="true"
        style={{ position: "absolute", top: 0, left: 14, width: 26, height: 3, borderRadius: "0 0 4px 4px", background: color, boxShadow: `0 0 8px ${color}` }}
      />
      {note.pinned && <span title="Pinned" aria-hidden="true" style={{ position: "absolute", top: 6, right: 8, fontSize: 12 }}>📌</span>}

      <div
        style={{
          fontSize: 14, fontWeight: 800, lineHeight: 1.25, marginTop: 4, paddingRight: note.pinned ? 16 : 0,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word",
        }}
      >
        {note.title}
      </div>

      <div
        style={{
          fontSize: 12.5, lineHeight: 1.4, color: "var(--muted)", flex: 1,
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word",
        }}
      >
        {note.text}
      </div>

      {note.tags && note.tags.length > 0 && <TagRow tags={note.tags.slice(0, 3)} extra={note.tags.length - 3} small />}
    </button>
  );
}

/** Tags as softly glowing chips, each its own colour. */
function TagRow({ tags, extra = 0, small }) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {tags.map((t) => {
        const c = tagColor(t);
        return (
          <span
            key={t}
            style={{
              fontSize: small ? 10 : 11,
              fontWeight: 800,
              padding: small ? "0.15rem 0.45rem" : "0.22rem 0.6rem",
              borderRadius: 999,
              color: c,
              background: `${c}1a`,
              border: `1px solid ${c}88`,
              boxShadow: `0 0 8px ${c}55, inset 0 0 6px ${c}22`,
              textShadow: `0 0 6px ${c}66`,
              whiteSpace: "nowrap",
            }}
          >
            #{t}
          </span>
        );
      })}
      {extra > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", alignSelf: "center" }}>+{extra}</span>}
    </div>
  );
}