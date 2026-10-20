import { useEffect, useState } from "react";
import { useTracker } from "../context/TrackerContext.jsx";
import { haptic } from "../lib/haptics.js";

/**
 * Thumb-reachable navigation for phones.
 *
 * Five primary destinations; everything past that lives behind a ☰ Menu button
 * that opens a small sheet listing the rest, so any section is one tap away
 * (no cycling). Sits above the home indicator via env(safe-area-inset-bottom).
 */
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
  const restActive = rest.some((t) => t.id === tab);

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
            style={{ position: "fixed", inset: 0, zIndex: 898, background: "rgba(8,12,23,0.35)" }}
          />
          <div
            role="menu"
            aria-label="More sections"
            style={{
              position: "fixed",
              left: 12,
              right: 12,
              bottom: "calc(78px + env(safe-area-inset-bottom))",
              zIndex: 899,
              display: "grid",
              gap: 4,
              padding: 8,
              borderRadius: 18,
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 12px 36px rgba(8,12,23,0.28)",
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
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "0.8rem 0.9rem",
                    borderRadius: 13,
                    border: "1px solid transparent",
                    borderColor: on ? "var(--border)" : "transparent",
                    background: on ? "var(--accent-soft)" : "transparent",
                    color: on ? "var(--accent)" : "var(--text)",
                    fontSize: 15,
                    fontWeight: 700,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 18, width: 24, textAlign: "center" }} aria-hidden="true">{t.icon}</span>
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
          justifyContent: "space-around",
          gap: 2,
          padding: "6px 6px calc(6px + env(safe-area-inset-bottom))",
          background: "var(--glass)",
          backdropFilter: "blur(14px)",
          borderTop: "1px solid var(--border)",
          boxShadow: "0 -8px 24px rgba(8,12,23,0.10)",
        }}
      >
        {shown.map((t) => (
          <NavItem key={t.id} icon={t.icon} label={t.label} on={tab === t.id && !open} onClick={() => go(t.id)} />
        ))}
        {rest.length > 0 && (
          <NavItem icon="☰" label="Menu" on={restActive || open} onClick={toggleMenu} expanded={open} />
        )}
      </nav>
    </>
  );
}

function NavItem({ icon, label, on, onClick, expanded }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={on && expanded === undefined ? "page" : undefined}
      aria-expanded={expanded}
      aria-haspopup={expanded === undefined ? undefined : "menu"}
      className="pressable"
      style={{
        flex: 1,
        maxWidth: 84,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "7px 2px 5px",
        borderRadius: 14,
        border: "1px solid transparent",
        background: on ? "var(--accent-soft)" : "transparent",
        borderColor: on ? "var(--border)" : "transparent",
        color: on ? "var(--accent)" : "var(--muted)",
        cursor: "pointer",
        transition: "background 180ms ease, color 180ms ease",
      }}
    >
      <span style={{ fontSize: 17, lineHeight: 1 }} aria-hidden="true">{icon}</span>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: -0.1 }}>{label}</span>
      <span
        aria-hidden="true"
        style={{
          width: on ? 16 : 0,
          height: 2.5,
          borderRadius: 999,
          background: "var(--accent)",
          transition: "width 220ms cubic-bezier(.34,1.56,.64,1)",
        }}
      />
    </button>
  );
}
