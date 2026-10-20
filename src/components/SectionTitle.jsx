/** Section heading with an optional action on the right. */
export function SectionTitle({ children, right, hint }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: "0.75rem",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, letterSpacing: -0.2 }}>{children}</h3>
        {hint && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{hint}</div>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ children, icon = "○" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "1rem 0.9rem",
        borderRadius: 14,
        border: "1px dashed var(--border)",
        color: "var(--muted)",
        fontSize: 13,
      }}
    >
      <span aria-hidden="true" style={{ opacity: 0.6 }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}
