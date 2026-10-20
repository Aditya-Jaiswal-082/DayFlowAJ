import { haptic } from "../lib/haptics.js";

const SIZES = {
  sm: { padding: "0.4rem 0.65rem", fontSize: 12, borderRadius: 10 },
  md: { padding: "0.6rem 0.95rem", fontSize: 13.5, borderRadius: 12 },
  lg: { padding: "0.8rem 1.1rem", fontSize: 15, borderRadius: 14 },
  icon: { padding: "0.5rem", fontSize: 15, borderRadius: 12, lineHeight: 1 },
};

const VARIANTS = {
  primary: {
    background: "linear-gradient(180deg, var(--accent-2), var(--accent))",
    color: "#fff",
    border: "1px solid transparent",
    boxShadow: "var(--shadow-1)",
  },
  ghost: {
    background: "var(--card)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-1)",
  },
  quiet: {
    background: "transparent",
    color: "var(--muted)",
    border: "1px solid transparent",
  },
  danger: {
    background: "transparent",
    color: "#ef4444",
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
        minHeight: size === "sm" ? 32 : 40,          // comfortable touch target
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
