/**
 * Theme tokens are CSS custom properties set on the app root, so components can
 * use var(--card) without importing anything. Charts need real values → chartTheme().
 *
 * Flat by design: surfaces are separated by a 1px border, not by shadows or
 * gradients. Accent green comes from the logo.
 */

const LIGHT = {
  "--bg": "#f3f5f4",
  "--bg-2": "#e8ecea",
  "--card": "#ffffff",
  "--card-hi": "rgba(255,255,255,0)",
  "--text": "#141918",
  "--muted": "#5c6663",
  "--border": "#dce2df",
  "--accent": "#1d7a4f",
  "--accent-2": "#2c9163",
  "--accent-soft": "rgba(29,122,79,0.10)",
  "--shadow-1": "none",
  "--shadow-2": "0 4px 14px rgba(20,25,24,0.08)",
  "--shadow-3": "0 10px 36px rgba(20,25,24,0.22)",
  "--shadow-press": "none",
  "--glass": "rgba(243,245,244,0.94)",
};

const DARK = {
  "--bg": "#0d1110",
  "--bg-2": "#161c1a",
  "--card": "#1a211f",
  "--card-hi": "rgba(255,255,255,0)",
  "--text": "#e8eeeb",
  "--muted": "#97a39f",
  "--border": "#2a3431",
  "--accent": "#4cc38a",
  "--accent-2": "#6ad3a0",
  "--accent-soft": "rgba(76,195,138,0.14)",
  "--shadow-1": "none",
  "--shadow-2": "0 4px 14px rgba(0,0,0,0.4)",
  "--shadow-3": "0 12px 40px rgba(0,0,0,0.55)",
  "--shadow-press": "none",
  "--glass": "rgba(13,17,16,0.94)",
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
      borderRadius: 8,
      color: theme["--text"],
      fontSize: 12,
      boxShadow: theme["--shadow-2"],
    },
  };
}

export const inputStyle = {
  width: "100%",
  padding: "0.7rem 0.8rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  fontSize: 15,          // 16px-ish stops iOS zooming the page on focus
  outline: "none",
  boxSizing: "border-box",
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
  gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`,
});
