import { TrackerProvider, useTracker } from "./context/TrackerContext.jsx";
import { AppBar, TabBar, BottomNav, ToastHost, InsightSheet } from "./components/index.js";
import { TABS, getTab } from "./tabs/index.js";
import { APP_FONT } from "./styles/theme.js";
import { useSwipe } from "./hooks/useSwipe.js";

/**
 * App shell. Renders the chrome and hands off to whichever tab is active — all
 * feature code lives in src/tabs/, all state in src/context/.
 */
export default function App() {
  return (
    <TrackerProvider>
      <Shell />
    </TrackerProvider>
  );
}

function Shell() {
  const { theme, tab, setTab, isMobile } = useTracker();
  const { Component } = getTab(tab);
  const index = TABS.findIndex((t) => t.id === tab);

  // Swipe moves one tab at a time and stops at the ends, so you always know
  // where you are.
  const swipe = useSwipe({
    onLeft: () => TABS[index + 1] && setTab(TABS[index + 1].id),
    onRight: () => TABS[index - 1] && setTab(TABS[index - 1].id),
  });

  return (
    <div
      style={{
        ...theme,                       // sets --bg, --text, … for everything below
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: APP_FONT,
        paddingBottom: isMobile ? "calc(86px + env(safe-area-inset-bottom))" : "1.5rem",
      }}
    >
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "0 0.9rem" }} {...(isMobile ? swipe : {})}>
        <AppBar />
        {!isMobile && <TabBar tabs={TABS} />}
        <main key={tab} className="rise">
          <Component />
        </main>
      </div>

      {isMobile && <BottomNav tabs={TABS} />}
      <ToastHost />
      <InsightSheet />
    </div>
  );
}
