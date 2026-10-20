/**
 * Trend chip: +12% / −8% / flat.
 *
 * `goodWhenUp` flips the colouring — spending more is not an improvement, so
 * the expense tiles pass goodWhenUp={false}.
 */
export function Delta({ value, suffix = "%", goodWhenUp = true }) {
  const n = Math.round(Number(value) || 0);
  if (n === 0) {
    return <Chip color="var(--muted)">no change</Chip>;
  }
  const up = n > 0;
  const good = up === goodWhenUp;
  return (
    <Chip color={good ? "#10b981" : "#ef4444"}>
      {up ? "▲" : "▼"} {Math.abs(n)}{suffix}
    </Chip>
  );
}

function Chip({ children, color }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 999,
        color,
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
