/** Recessed track with a raised fill. Values above 100 stay full but turn red. */
export function ProgressBar({ pct, height = 10, color }) {
  const over = pct > 100;
  const width = Math.max(0, Math.min(100, Number(pct) || 0));

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 999,
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-press)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${width}%`,
          height: "100%",
          borderRadius: 999,
          background: over
            ? "linear-gradient(180deg,#f87171,#ef4444)"
            : color || "linear-gradient(180deg, var(--accent-2), var(--accent))",
          boxShadow: "0 1px 0 rgba(255,255,255,0.35) inset",
          transition: "width 520ms cubic-bezier(.22,.61,.36,1)",
        }}
      />
    </div>
  );
}
