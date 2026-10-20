import { useEffect } from "react";
import { useTracker } from "../context/TrackerContext.jsx";

/**
 * Desktop navigation. On phones BottomNav takes over instead.
 *
 * `tabs` is passed in (rather than imported from ../tabs) so this file stays
 * independent of the tab modules — no circular imports. Keys 1–9 jump between
 * tabs unless you're typing in a field.
 */
export function TabBar({ tabs }) {
  const { tab, setTab } = useTracker();

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)) return;
      const i = Number(e.key) - 1;
      if (Number.isInteger(i) && tabs[i]) setTab(tabs[i].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTab, tabs]);

  return (
    <nav
      className="no-scrollbar"
      style={{
        display: "flex",
        gap: 5,
        marginBottom: "1rem",
        overflowX: "auto",
        padding: 4,
        borderRadius: 999,
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-press)",
      }}
    >
      {tabs.map(({ id, label, icon }, i) => {
        const on = tab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            title={`${label} (${i + 1})`}
            aria-current={on ? "page" : undefined}
            className="pressable"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              padding: "0.5rem 0.9rem",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: "1px solid transparent",
              background: on ? "var(--card)" : "transparent",
              borderColor: on ? "var(--border)" : "transparent",
              boxShadow: on ? "var(--shadow-1)" : "none",
              color: on ? "var(--text)" : "var(--muted)",
              transition: "background 160ms ease, color 160ms ease",
            }}
          >
            <span aria-hidden="true">{icon}</span> {label}
          </button>
        );
      })}
    </nav>
  );
}
