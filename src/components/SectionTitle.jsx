/** Section heading with an optional action on the right. */
export function SectionTitle({ children, right, hint }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: "0.7rem",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: -0.1 }}>{children}</h3>
        {hint && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{hint}</div>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ children }) {
  return (
    <div
      style={{
        padding: "0.85rem 0.9rem",
        borderRadius: 10,
        background: "var(--bg-2)",
        color: "var(--muted)",
        fontSize: 13.5,
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  );
}
