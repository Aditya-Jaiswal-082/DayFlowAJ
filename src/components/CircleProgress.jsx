import { clamp } from "../lib/format.js";

/**
 * Flat progress ring: a track, a solid arc and the percentage in the middle.
 * Only the arc is rotated (SVG <g transform>) so the label stays upright.
 */
export function CircleProgress({ pct, size = 128, stroke = 11, label }) {
  const value = clamp(pct, 0, 100);
  const r = Math.max(1, (size - stroke) / 2);
  const circumference = 2 * Math.PI * r;
  const c = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${Math.round(value)}% complete`}
      style={{ flexShrink: 0 }}
    >
      <g transform={`rotate(-90 ${c} ${c})`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bg-2)" strokeWidth={stroke} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
        />
      </g>
      <text
        x={c}
        y={label ? c - 6 : c}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fill: "var(--text)", fontSize: size > 90 ? 22 : 12, fontWeight: 700 }}
      >
        {Math.round(value)}%
      </text>
      {label && (
        <text x={c} y={c + 14} textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--muted)", fontSize: 10 }}>
          {label}
        </text>
      )}
    </svg>
  );
}
