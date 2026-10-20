import { TodayTab } from "./TodayTab.jsx";
import { AnalysisTab } from "./AnalysisTab.jsx";
import { ExpensesTab } from "./ExpensesTab.jsx";
import { SplitTab } from "./SplitTab.jsx";
import { RemindersTab } from "./RemindersTab.jsx";
import { HistoryTab } from "./HistoryTab.jsx";
import { NotesTab } from "./NotesTab.jsx";
import { SettingsTab } from "./SettingsTab.jsx";

/**
 * The only place that knows which tabs exist.
 *
 * To add one: create tabs/MyTab.jsx, then add an entry here — the desktop nav,
 * the number-key shortcut and swipe order all follow this array. The first five
 * also become the phone's bottom bar, so order matters: most-used first.
 */
export const TABS = [
  { id: "today", label: "Today", icon: "◉", Component: TodayTab },
  { id: "expenses", label: "Money", icon: "▤", Component: ExpensesTab },
  { id: "split", label: "Split", icon: "◑", Component: SplitTab },
  { id: "analysis", label: "Insights", icon: "◫", Component: AnalysisTab },
  { id: "reminders", label: "Alerts", icon: "◔", Component: RemindersTab },
  { id: "history", label: "History", icon: "◵", Component: HistoryTab },
  { id: "notes", label: "Notes", icon: "▭", Component: NotesTab },
  { id: "settings", label: "Settings", icon: "⚙", Component: SettingsTab },
];

export function getTab(id) {
  return TABS.find((t) => t.id === id) || TABS[0];
}
