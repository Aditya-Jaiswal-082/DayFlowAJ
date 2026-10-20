/**
 * The real DayFlow AJ app icon — served straight from /public rather than
 * bundled, so the in-app mark always matches the actual app icon exactly.
 * Its rounded corners are baked into the PNG's own alpha channel, so no
 * extra styling is applied on top of it.
 */
export function Logo({ size = 32, title = "DayFlow AJ" }) {
  return (
    <img
      src="/logo-mark.png"
      width={size}
      height={size}
      alt={title}
      style={{ flexShrink: 0, display: "block", objectFit: "contain" }}
      draggable={false}
    />
  );
}

/** Icon + wordmark, for the app bar. */
export function Wordmark({ size = 30 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <Logo size={size} />
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, letterSpacing: -0.2 }}>
        <span style={{ fontSize: 17, fontWeight: 800 }}>DayFlow</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            padding: "1px 5px",
            borderRadius: 6,
            color: "var(--accent)",
            background: "var(--accent-soft)",
          }}
        >
          AJ
        </span>
      </span>
    </span>
  );
}
