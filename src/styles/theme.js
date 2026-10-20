/**
 * Theme tokens are CSS custom properties set on the app root, so components can
 * use var(--card) without importing anything. Charts need real values → chartTheme().
 *
 * The depth model: every raised surface gets a soft ambient shadow plus a 1px
 * top highlight (--card-hi). That pairing is what reads as physical thickness —
 * not a heavy drop shadow.
 */

const LIGHT = {
  "--bg": "#f4f6fb",
  "--bg-2": "#eceff7",
  "--card": "#ffffff",
  "--card-hi": "rgba(255,255,255,0.9)",
  "--text": "#101829",
  "--muted": "#647084",
  "--border": "#e3e8f2",
  "--accent": "#5b5bf0",
  "--accent-2": "#8b87f5",
  "--accent-soft": "rgba(91,91,240,0.10)",
  "--shadow-1": "0 1px 2px rgba(16,24,41,0.05), 0 2px 8px rgba(16,24,41,0.05)",
  "--shadow-2": "0 2px 4px rgba(16,24,41,0.06), 0 10px 24px rgba(16,24,41,0.08)",
  "--shadow-3": "0 8px 16px rgba(16,24,41,0.10), 0 24px 56px rgba(16,24,41,0.16)",
  "--shadow-press": "inset 0 2px 6px rgba(16,24,41,0.12)",
  "--glass": "rgba(244,246,251,0.82)",
};

const DARK = {
  "--bg": "#080c17",
  "--bg-2": "#0f1524",
  "--card": "#141b2d",
  "--card-hi": "rgba(255,255,255,0.06)",
  "--text": "#eef2fa",
  "--muted": "#93a0b8",
  "--border": "#233049",
  "--accent": "#7c7cf7",
  "--accent-2": "#a5a1fb",
  "--accent-soft": "rgba(124,124,247,0.16)",
  "--shadow-1": "0 1px 2px rgba(0,0,0,0.4)",
  "--shadow-2": "0 2px 6px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.4)",
  "--shadow-3": "0 10px 20px rgba(0,0,0,0.5), 0 28px 64px rgba(0,0,0,0.55)",
  "--shadow-press": "inset 0 2px 8px rgba(0,0,0,0.5)",
  "--glass": "rgba(8,12,23,0.82)",
};

export const getTheme = (dark) => (dark ? DARK : LIGHT);

/** Recharts can't read CSS variables, so hand it concrete colours. */
export function chartTheme(theme) {
  return {
    grid: theme["--border"],
    axis: theme["--muted"],
    accent: theme["--accent"],
    accent2: theme["--accent-2"],
    text: theme["--text"],
    tip: {
      background: theme["--card"],
      border: `1px solid ${theme["--border"]}`,
      borderRadius: 12,
      color: theme["--text"],
      fontSize: 12,
      boxShadow: theme["--shadow-2"],
    },
  };
}

export const inputStyle = {
  width: "100%",
  padding: "0.7rem 0.8rem",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--bg-2)",
  color: "var(--text)",
  fontSize: 15,          // 16px-ish stops iOS zooming the page on focus
  outline: "none",
  boxSizing: "border-box",
  boxShadow: "var(--shadow-press)",
};

export const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: 5,
};

export const APP_FONT =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";

/** Responsive card grid, no CSS file needed. */
export const gridCols = (min = 260) => ({
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
});
