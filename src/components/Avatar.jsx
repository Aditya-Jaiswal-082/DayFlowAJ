import { initialsOf, ME, personColor } from "../lib/splits.js";

/** Initials disc. "You" always renders in the accent colour. */
export function Avatar({ id, name, size = 38, dim }) {
  const isMe = id === ME;
  const color = isMe ? "var(--accent)" : personColor(id);

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * (isMe ? 0.3 : 0.36),
        fontWeight: 800,
        letterSpacing: -0.2,
        color: isMe ? "#fff" : color,
        background: isMe ? "linear-gradient(180deg, var(--accent-2), var(--accent))" : `${color}22`,
        border: isMe ? "1px solid transparent" : `1px solid ${color}44`,
        boxShadow: "var(--shadow-1)",
        opacity: dim ? 0.55 : 1,
      }}
    >
      {isMe ? "YOU" : initialsOf(name)}
    </span>
  );
}
