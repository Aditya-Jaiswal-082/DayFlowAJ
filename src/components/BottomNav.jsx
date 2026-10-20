import { useTracker } from "../context/TrackerContext.jsx";
import { haptic } from "../lib/haptics.js";

/**
 * Thumb-reachable navigation for phones.
 *
 * Five primary destinations; anything past that lives behind "More", which
 * cycles through the remainder rather than opening another layer. Sits above
 * the home indicator via env(safe-area-inset-bottom).
 */
export function BottomNav({ tabs, primary = 5 }) {
  const { tab, setTab } = useTracker();

  const shown = tabs.slice(0, primary);
  const rest = tabs.slice(primary);
  const restActive = rest.some((t) => t.id === tab);

  function go(id) {
    haptic("tap");
    setTab(id);
  }

  function more() {
    const i = rest.findIndex((t) => t.id === tab);
    go(rest[(i + 1) % rest.length].id);
  }

  return (
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
        <NavItem key={t.id} icon={t.icon} label={t.label} on={tab === t.id} onClick={() => go(t.id)} />
      ))}
      {rest.length > 0 && (
        <NavItem
          icon={restActive ? (rest.find((r) => r.id === tab) || {}).icon : "···"}
          label={restActive ? (rest.find((r) => r.id === tab) || {}).label : "More"}
          on={restActive}
          onClick={more}
        />
      )}
    </nav>
  );
}

function NavItem({ icon, label, on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={on ? "page" : undefined}
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
