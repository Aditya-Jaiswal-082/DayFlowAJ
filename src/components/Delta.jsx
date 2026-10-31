/**
 * Trend text: +12% / -8% / no change. Colour carries good or bad, the sign
 * carries direction, so it still reads without colour.
 *
 * `goodWhenUp` flips the colouring: spending more is not an improvement, so
 * the expense tiles pass goodWhenUp={false}.
 */
export function Delta({ value, suffix = "%", goodWhenUp = true }) {
  const n = Math.round(Number(value) || 0);
  if (n === 0) return <span style={style("var(--muted)")}>No change</span>;
  const up = n > 0;
  const good = up === goodWhenUp;
  return (
    <span style={style(good ? "var(--accent)" : "#c0392b")}>
      {up ? "+" : "-"}{Math.abs(n)}{suffix}
    </span>
  );
}

const style = (color) => ({ fontSize: 12.5, fontWeight: 700, color, whiteSpace: "nowrap" });
