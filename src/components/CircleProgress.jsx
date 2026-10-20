import { useId } from "react";
import { clamp } from "../lib/format.js";
import { useCountUp } from "../hooks/useCountUp.js";

/**
 * Donut progress ring with a shaded, dimensional look: a recessed track, a
 * gradient arc, and a soft glow behind the arc.
 *
 * Only the arc is rotated (SVG <g transform>) — rotating the <svg> itself would
 * tip the percentage label over with it.
 */
export function CircleProgress({ pct, size = 128, stroke = 11, label, animate = true }) {
  const target = clamp(pct, 0, 100);
  const animated = useCountUp(target, 700);     // called unconditionally — hook rules
  const shown = animate ? animated : target;
  const id = useId().replace(/:/g, "");

  const r = Math.max(1, (size - stroke * 2) / 2);
  const circumference = 2 * Math.PI * r;
  const c = size / 2;
  const done = target >= 100;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${Math.round(target)}% complete`}
      style={{ flexShrink: 0, overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`${id}-arc`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-2)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={done ? 5 : 3} result="b" />
          <feComposite in="SourceGraphic" in2="b" operator="over" />
        </filter>
      </defs>

      <g transform={`rotate(-90 ${c} ${c})`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bg-2)" strokeWidth={stroke} />
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--border)" strokeWidth={1} opacity="0.9" />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={`url(#${id}-arc)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(shown / 100) * circumference} ${circumference}`}
          filter={`url(#${id}-glow)`}
        />
      </g>

      <text
        x={c}
        y={label ? c - 6 : c}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fill: "var(--text)", fontSize: size > 90 ? 25 : 13, fontWeight: 800, letterSpacing: -0.5 }}
      >
        {Math.round(shown)}%
      </text>

      {label && (
        <text
          x={c}
          y={c + 15}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fill: "var(--muted)", fontSize: 10, fontWeight: 600, letterSpacing: 0.4 }}
        >
          {done ? "complete" : label}
        </text>
      )}
    </svg>
  );
}
