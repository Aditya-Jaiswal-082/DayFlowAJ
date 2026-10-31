/** Flat bar: a hairline-free track and a solid fill. Values above 100 stay full but turn red. */
export function ProgressBar({ pct, height = 6, color }) {
  const over = pct > 100;
  const width = Math.max(0, Math.min(100, Number(pct) || 0));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
      style={{ width: "100%", height, borderRadius: 3, background: "var(--bg-2)", overflow: "hidden" }}
    >
      <div
        style={{
          width: `${width}%`,
          height: "100%",
          background: over ? "#c0392b" : color || "var(--accent)",
          transition: "width 300ms ease",
        }}
      />
    </div>
  );
}
