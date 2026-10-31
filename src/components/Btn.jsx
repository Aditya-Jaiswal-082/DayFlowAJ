import { haptic } from "../lib/haptics.js";

const SIZES = {
  sm: { padding: "0.35rem 0.7rem", fontSize: 13, borderRadius: 8 },
  md: { padding: "0.6rem 1rem", fontSize: 14, borderRadius: 8 },
  lg: { padding: "0.8rem 1.2rem", fontSize: 15, borderRadius: 10 },
  icon: { padding: "0.45rem", fontSize: 15, borderRadius: 8, lineHeight: 1, minWidth: 40 },
};

const VARIANTS = {
  primary: {
    background: "var(--accent)",
    color: "#fff",
    border: "1px solid var(--accent)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text)",
    border: "1px solid var(--border)",
  },
  quiet: {
    background: "transparent",
    color: "var(--muted)",
    border: "1px solid transparent",
  },
  danger: {
    background: "transparent",
    color: "#c0392b",
    border: "1px solid transparent",
  },
};

/**
 * variant: primary | ghost | quiet | danger — size: sm | md | lg | icon
 * Presses in on tap (see .pressable) and fires a short haptic tick.
 */
export function Btn({
  children, onClick, variant = "primary", size = "md",
  disabled, title, style, full, feedback = "tap",
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={size === "icon" ? title : undefined}
      disabled={disabled}
      className="pressable"
      onClick={disabled ? undefined : (e) => { haptic(feedback); onClick?.(e); }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontWeight: 600,
        width: full ? "100%" : undefined,
        minHeight: size === "sm" ? 36 : 42,          // comfortable touch target
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...SIZES[size],
        ...VARIANTS[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
