import { useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { formatDate } from "../lib/dates.js";
import { NOTE_COLORS } from "../lib/constants.js";
import { Btn, Card, Empty, Field, SectionTitle } from "../components/index.js";

export function NotesTab() {
  const { notes, openInsight } = useTracker();

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [query, setQuery] = useState("");

  function save() {
    if (notes.add({ title, text, tags, color })) {
      setTitle("");
      setText("");
      setTags("");
      setColor(NOTE_COLORS[0]);
    }
  }

  const visible = notes.search(query);

  return (
    <div style={{ display: "grid", gap: "0.75rem" }} className="stagger">
      <Card>
        <SectionTitle right={<Btn size="sm" onClick={save} disabled={!text.trim()}>Save</Btn>}>New note</SectionTitle>
        <div style={{ display: "grid", gap: "0.6rem" }}>
          <Field label="Title" value={title} onChange={setTitle} placeholder="Optional" />
          <Field label="Note" rows={4} value={text} onChange={setText} placeholder="Write something…" />
          <Field label="Tags" value={tags} onChange={setTags} placeholder="comma, separated, tags — optional" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Colour</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="pressable"
                  onClick={() => setColor(c)}
                  title={c}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: c,
                    border: color === c ? "2px solid var(--text)" : "2px solid transparent",
                    boxShadow: color === c ? "var(--shadow-1)" : "none",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle hint="Tap the date to see that day">
          Saved notes ({query ? `${visible.length} of ${notes.all.length}` : notes.all.length})
        </SectionTitle>

        {notes.all.length > 0 && (
          <Field value={query} onChange={setQuery} placeholder="Search notes or tags…" style={{ marginBottom: "0.8rem" }} />
        )}

        {visible.length === 0 ? (
          <Empty icon="▭">{query ? "Nothing matches that search." : "No notes yet."}</Empty>
        ) : (
          <div style={{ display: "grid", gap: 7 }}>
            {visible.map((n) => (
              <article
                key={n.id}
                style={{
                  padding: "0.75rem 0.8rem",
                  borderRadius: 15,
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderLeft: `3px solid ${n.color || NOTE_COLORS[0]}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {n.pinned && <span title="Pinned" aria-hidden="true">📌</span>}
                      <div style={{ fontSize: 14.5, fontWeight: 700, wordBreak: "break-word" }}>{n.title}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openInsight({ kind: "day", key: n.date })}
                      style={{
                        background: "none", border: "none", padding: 0, marginTop: 2, cursor: "pointer",
                        fontSize: 11.5, color: "var(--accent)", fontWeight: 600,
                      }}
                    >
                      {formatDate(n.date)}
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={() => notes.togglePin(n.id)}
                      title={n.pinned ? "Unpin" : "Pin to top"}
                    >
                      📌
                    </Btn>
                    <Btn variant="danger" size="sm" onClick={() => notes.remove(n.id)} title="Delete note" feedback="warn">🗑</Btn>
                  </div>
                </div>
                <p style={{ margin: "0.5rem 0 0", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {n.text}
                </p>
                {n.tags && n.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                    {n.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "0.2rem 0.5rem",
                          borderRadius: 999,
                          color: n.color || NOTE_COLORS[0],
                          background: `${n.color || NOTE_COLORS[0]}1f`,
                          border: `1px solid ${n.color || NOTE_COLORS[0]}33`,
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
