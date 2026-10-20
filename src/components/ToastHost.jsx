import { useTracker } from "../context/TrackerContext.jsx";
import { useIsMobile } from "../hooks/useMediaQuery.js";

/** Transient messages with an Undo. Sits above the bottom nav on a phone. */
export function ToastHost() {
  const { toasts } = useTracker();
  const mobile = useIsMobile();
  if (!toasts.list.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: mobile ? "calc(78px + env(safe-area-inset-bottom))" : 22,
        zIndex: 950,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "min(440px, calc(100vw - 1.5rem))",
      }}
    >
      {toasts.list.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="slide-up"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0.7rem 0.9rem",
            borderRadius: 16,
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-3)",
            fontSize: 13,
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>{toast.message}</span>

          {toast.undo && (
            <button
              type="button"
              onClick={() => toasts.runUndo(toast)}
              className="pressable"
              style={{
                background: "var(--accent-soft)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "0.3rem 0.6rem",
                cursor: "pointer",
                color: "var(--accent)",
                fontWeight: 800,
                fontSize: 12.5,
              }}
            >
              Undo
            </button>
          )}

          <button
            type="button"
            onClick={() => toasts.dismiss(toast.id)}
            title="Dismiss"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0, fontSize: 14 }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
