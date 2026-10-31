import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTracker } from "../context/TrackerContext.jsx";
import { APP_FONT } from "../styles/theme.js";
import { useIsMobile } from "../hooks/useMediaQuery.js";
import { useVisualViewport } from "../hooks/useVisualViewport.js";

/**
 * Dialog. On a phone it anchors to the bottom, spans the full width and keeps
 * its actions pinned below the scrolling body — reachable with a thumb. On a
 * larger screen it's a centred card.
 *
 * It is rendered into <body> through a portal. Inside a tab it was being
 * positioned against an animated ancestor (a CSS transform makes `position:
 * fixed` stick to that element instead of the screen), so the top or bottom of
 * the sheet could sit off-screen and the body couldn't scroll into view. The
 * theme variables are re-applied on the overlay, and touches are kept from
 * bubbling to the swipe-between-tabs handler.
 *
 * It is sized to the *visible* screen (see useVisualViewport), not 100vh — on a
 * phone the keyboard and address bar make those different, and sizing to 100vh
 * pushed the footer's Save button off-screen. The body scrolls; the title and
 * the footer never do.
 */
export function Modal({ open, onClose, title, children, footer }) {
  const mobile = useIsMobile();
  const view = useVisualViewport(open);
  const { theme } = useTracker();

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

  const stopTouch = (e) => e.stopPropagation();

  return createPortal(
    <div
      className="fade"
      onClick={onClose}
      onTouchStart={stopTouch}
      onTouchMove={stopTouch}
      onTouchEnd={stopTouch}
      style={{
        ...theme,
        color: "var(--text)",
        fontFamily: APP_FONT,
        position: "fixed",
        left: 0,
        right: 0,
        ...(view ? { top: view.top, height: view.height } : { top: 0, bottom: 0 }),
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
          minWidth: 0,
          width: "100%",
          maxWidth: mobile ? "none" : 440,
          maxHeight: mobile ? "94%" : "85%",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: mobile ? "14px 14px 0 0" : 12,
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
            flexShrink: 0,
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
              borderRadius: 8,
              width: 36,
              height: 36,
              cursor: "pointer",
              color: "var(--muted)",
              fontSize: 15,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            minWidth: 0,
            overflowX: "hidden",
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: "0 1.1rem 0.6rem",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              flexWrap: "wrap",
              flexShrink: 0,
              padding: "0.8rem 1.1rem",
              borderTop: "1px solid var(--border)",
              background: "var(--card)",
              borderRadius: mobile ? 0 : "0 0 12px 12px",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
