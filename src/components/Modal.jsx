import { useEffect } from "react";
import { useIsMobile } from "../hooks/useMediaQuery.js";

/**
 * Dialog. On a phone it anchors to the bottom, spans the full width and keeps
 * its actions pinned below the scrolling body — reachable with a thumb. On a
 * larger screen it's a centred card.
 */
export function Modal({ open, onClose, title, children, footer }) {
  const mobile = useIsMobile();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";      // stop the page scrolling behind
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fade"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: mobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: mobile ? 0 : "1rem",
        background: "rgba(6,10,20,0.55)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={mobile ? "slide-up" : "pop"}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: mobile ? "none" : 440,
          maxHeight: mobile ? "92vh" : "85vh",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: mobile ? "22px 22px 0 0" : 20,
          boxShadow: "var(--shadow-3)",
          paddingBottom: mobile ? "env(safe-area-inset-bottom)" : 0,
        }}
      >
        {mobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--border)" }} />
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            padding: mobile ? "0.7rem 1.1rem 0.6rem" : "1.1rem 1.2rem 0.6rem",
          }}
        >
          <span style={{ fontSize: 16.5, fontWeight: 700 }}>{title}</span>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="pressable"
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              width: 32,
              height: 32,
              cursor: "pointer",
              color: "var(--muted)",
              fontSize: 15,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "0 1.1rem 0.4rem", WebkitOverflowScrolling: "touch" }}>
          {children}
        </div>

        {footer && (
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              flexWrap: "wrap",
              padding: "0.9rem 1.1rem",
              borderTop: "1px solid var(--border)",
              background: "var(--card)",
              borderRadius: mobile ? 0 : "0 0 20px 20px",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
