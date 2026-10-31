import { useEffect, useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { haptic } from "../lib/haptics.js";

/**
 * Phone navigation: a flat bar along the bottom edge.
 *
 * The first five tabs get an icon and a label each; the current one is marked
 * with the accent colour and a bar on top. Everything past that is behind a
 * Menu button that opens a sheet, so any section is one tap away — no cycling.
 * (On one of those sections the button shows that section's name.)
 *
 * Sits above the home indicator via env(safe-area-inset-bottom).
 */

/** 24×24 stroke icons by tab id — drawn here so the dock doesn't depend on font glyphs. */
const ICONS = {
  today: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.5" /></>,
  expenses: <><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18" /><circle cx="16.5" cy="15" r="1.2" /></>,
  split: <><circle cx="9" cy="12" r="5.5" /><circle cx="15" cy="12" r="5.5" /></>,
  analysis: <path d="M5 20V12M12 20V4M19 20v-5" />,
  reminders: <><path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
  history: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /><path d="M12 8v4l3 2" /></>,
  notes: <><path d="M6 3h9l4 4v14H6z" /><path d="M9 12h7M9 16h5" /></>,
  settings: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
};

function Icon({ id, fallback, size = 22 }) {
  const shape = ICONS[id];
  if (!shape) return <span style={{ fontSize: size - 4, lineHeight: 1 }} aria-hidden="true">{fallback}</span>;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {shape}
    </svg>
  );
}

export function BottomNav({ tabs, primary = 5 }) {
  const { tab, setTab } = useTracker();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const shown = tabs.slice(0, primary);
  const rest = tabs.slice(primary);
  const current = rest.find((t) => t.id === tab);

  function go(id) {
    haptic("tap");
    setOpen(false);
    setTab(id);
  }

  function toggleMenu() {
    haptic("tap");
    setOpen((o) => !o);
  }

  return (
    <>
      {open && rest.length > 0 && (
        <>
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            className="fade"
            style={{ position: "fixed", inset: 0, zIndex: 898, background: "rgba(8,12,23,0.4)" }}
          />
          <div
            role="menu"
            aria-label="More sections"
            className="slide-up"
            style={{
              position: "fixed",
              left: 12,
              right: 12,
              bottom: "calc(66px + env(safe-area-inset-bottom))",
              zIndex: 899,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
              gap: 6,
              padding: 8,
              borderRadius: 12,
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-3)",
            }}
          >
            {rest.map((t) => {
              const on = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="menuitem"
                  className="pressable"
                  onClick={() => go(t.id)}
                  aria-current={on ? "page" : undefined}
                  style={{
                    display: "grid",
                    justifyItems: "center",
                    gap: 6,
                    padding: "0.85rem 0.4rem 0.7rem",
                    borderRadius: 8,
                    border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                    background: on ? "var(--accent-soft)" : "transparent",
                    color: on ? "var(--accent)" : "var(--text)",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Icon id={t.id} fallback={t.icon} size={24} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      <nav
        aria-label="Main"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 900,
          display: "flex",
          padding: "0 4px env(safe-area-inset-bottom)",
          background: "var(--glass)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid var(--border)",
        }}
      >
        {shown.map((t) => (
          <NavItem key={t.id} id={t.id} icon={t.icon} label={t.label} on={tab === t.id && !open} onClick={() => go(t.id)} />
        ))}
        {rest.length > 0 && (
          <NavItem
            id={current && !open ? current.id : "menu"}
            icon="☰"
            label={current && !open ? current.label : "Menu"}
            on={!!current || open}
            expanded={open}
            onClick={toggleMenu}
          />
        )}
      </nav>
    </>
  );
}

function NavItem({ id, icon, label, on, onClick, expanded }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={on && expanded === undefined ? "page" : undefined}
      aria-expanded={expanded}
      aria-haspopup={expanded === undefined ? undefined : "menu"}
      style={{
        position: "relative",
        flex: "1 1 0",
        minWidth: 0,
        height: 58,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        padding: 0,
        border: "none",
        background: "none",
        color: on ? "var(--accent)" : "var(--muted)",
        cursor: "pointer",
        touchAction: "manipulation",
      }}
    >
      <span
        aria-hidden="true"
        style={{ position: "absolute", top: 0, left: "28%", right: "28%", height: 2, background: on ? "var(--accent)" : "transparent" }}
      />
      <Icon id={id} fallback={icon} size={22} />
      <span style={{ fontSize: 11, fontWeight: on ? 700 : 500, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </button>
  );
}
