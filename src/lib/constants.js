export const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16",
];

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const TASK_CATS = ["Work", "Health", "Learning", "Personal", "Chores", "Other"];

export const EXPENSE_CATS = [
  "Food", "Transport", "Shopping", "Health",
  "Entertainment", "Bills", "Education", "Other",
];

export const PRIORITIES = [
  { val: "high", label: "High", color: "#ef4444" },
  { val: "normal", label: "Normal", color: "#1d7a4f" },
  { val: "low", label: "Low", color: "#94a3b8" },
];

/** Sort weight — high priority floats to the top of the list. */
export const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 };

export const MOOD_OPTS = [
  { val: "great", label: "Great", emoji: "😄", color: "#10b981" },
  { val: "good", label: "Good", emoji: "🙂", color: "#2c9163" },
  { val: "okay", label: "Okay", emoji: "😐", color: "#f59e0b" },
  { val: "low", label: "Low", emoji: "😔", color: "#f97316" },
  { val: "bad", label: "Bad", emoji: "😞", color: "#ef4444" },
];

/** Chart value per mood. Keys must match MOOD_OPTS.val. */
export const MOOD_SCORE = { great: 5, good: 4, okay: 3, low: 2, bad: 1 };

export const WEATHER_ICONS = {
  Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️",
  Snow: "❄️", Thunderstorm: "⛈️", Fog: "🌫️", default: "🌤️",
};

/** Open-Meteo WMO codes → a key of WEATHER_ICONS. */
export const WEATHER_CODES = {
  0: "Clear", 1: "Clear", 2: "Clouds", 3: "Clouds",
  45: "Fog", 48: "Fog",
  51: "Drizzle", 53: "Drizzle", 55: "Drizzle",
  61: "Rain", 63: "Rain", 65: "Rain",
  71: "Snow", 73: "Snow", 75: "Snow",
  80: "Rain", 81: "Rain", 82: "Rain",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
};

export const QUOTES = [
  { text: "The secret of getting ahead is getting started.", auth: "Mark Twain" },
  { text: "Don't watch the clock; do what it does. Keep going.", auth: "Sam Levenson" },
  { text: "Small steps every day lead to big results.", auth: "Unknown" },
  { text: "Focus on progress, not perfection.", auth: "Unknown" },
  { text: "Today's actions are tomorrow's results.", auth: "Unknown" },
  { text: "Your future is created by what you do today.", auth: "Robert Kiyosaki" },
  { text: "Discipline is choosing between what you want now and what you want most.", auth: "Abraham Lincoln" },
];

/** Shown instead of QUOTES on a Saturday or Sunday. */
export const WEEKEND_QUOTES = [
  { text: "Rest when you're weary. Refresh and renew yourself.", auth: "Unknown" },
  { text: "Weekends are a bit like rainbows — beautiful from a distance.", auth: "John Shirley" },
  { text: "Recharge. Reflect. Be ready to shine.", auth: "Unknown" },
  { text: "The best of all gifts is a restful Saturday.", auth: "Unknown" },
];

/** Shown instead of QUOTES on a day marked as a holiday. */
export const HOLIDAY_QUOTES = [
  { text: "All you need is love, laughter and a little holiday.", auth: "Unknown" },
  { text: "Take a rest; a field that has rested gives a bountiful crop.", auth: "Ovid" },
  { text: "A day off is not a day wasted, it is a day invested.", auth: "Unknown" },
];

/** Swatches for colour-coding a note. */
export const NOTE_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#f43f8e", "#06b6d4", "#a855f7", "#f97316",
];

/**
 * A fresh, independent day record.
 * It's a factory, not a constant: a shared constant would hand the same
 * `checks` object and `extra` array to every day.
 */
export const emptyDay = () => ({
  checks: {}, extra: [], special: [], mood: "", note: "", holidayChecks: {}, weekendChecks: {},
});

export const DEFAULT_TASKS = [
  { id: 1, text: "Morning workout", cat: "Health", priority: "normal", createdAt: null, archivedAt: null },
  { id: 2, text: "Read for 30 min", cat: "Learning", priority: "low", createdAt: null, archivedAt: null },
  { id: 3, text: "Review emails", cat: "Work", priority: "normal", createdAt: null, archivedAt: null },
];

/** Shown only on days marked as a holiday — a separate, persistent list. */
export const DEFAULT_HOLIDAY_TASKS = [
  { id: 901, text: "Plan the day", cat: "Personal", priority: "normal", createdAt: null, archivedAt: null },
  { id: 902, text: "Rest & enjoy", cat: "Personal", priority: "normal", createdAt: null, archivedAt: null },
  { id: 903, text: "Zero screens hour", cat: "Health", priority: "low", createdAt: null, archivedAt: null },
];

/** Shown alongside regular tasks on a Saturday or Sunday — a separate, persistent list. */
export const DEFAULT_WEEKEND_TASKS = [
  { id: 801, text: "Meal prep for the week", cat: "Chores", priority: "normal", createdAt: null, archivedAt: null },
  { id: 802, text: "Call family", cat: "Personal", priority: "normal", createdAt: null, archivedAt: null },
];

/** Bump this whenever a stored shape changes, and add a step in lib/schema.js. */
export const SCHEMA_VERSION = 4;

/** Every persisted key, in one place. */
export const STORAGE_KEYS = {
  version: "rt_version",
  dark: "rt_dark",
  regular: "rt_regular",
  dayData: "rt_daydata",
  notes: "rt_notes",
  expenses: "rt_expenses",
  reminders: "rt_reminders",
  budgets: "rt_budgets",
  people: "rt_people",
  settlements: "rt_settlements",
  weather: "rt_weather",
  weatherPref: "rt_weather_pref",   // "on" | "off" — null until asked
  holidayTasks: "rt_holidaytasks",
  holidays: "rt_holidays",
  weekendTasks: "rt_weekendtasks",
  /** Legacy — the standalone Plan tab (v3). Read once by the v4 migration, never written. */
  schedule: "rt_schedule",
};

/** Quick "split between N" picks in the split editor. */
export const SPLIT_COUNTS = [2, 3, 4, 5];

export const DEFAULT_TAB_ID = "today";

export const CURRENCY = { symbol: "₹", locale: "en-IN" };

/** How often the scheduler checks for due reminders. */
export const TICK_MS = 15000;

export const TOAST_MS = 6000;
