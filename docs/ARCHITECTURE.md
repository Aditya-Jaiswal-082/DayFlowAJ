# Architecture

How DayFlow AJ is laid out, where to put new code, and which odd-looking decisions are
deliberate. For features and setup, see the [README](../README.md).

## File map

```
public/
├── sw.js                     service worker — owns notifications, caches nothing
├── manifest.webmanifest      PWA metadata
├── favicon.svg               the AJ mark, vector
└── icon-*.png                192/512/maskable/apple-touch, generated from the same mark

src/
├── main.jsx                  runs migrations, registers the SW, mounts React
├── App.jsx                   shell: app bar, nav, swipe, toasts, insight panel
│
├── tabs/                     ── ONE FILE PER TAB ──
│   ├── index.js              the tab registry (add a tab = add one line)
│   ├── TodayTab.jsx          checklists, priority, per-task reminders, mood, note
│   ├── AnalysisTab.jsx       KPI tiles, charts, weekday pattern — all tappable
│   ├── ExpensesTab.jsx       logging, split editor, month switcher, budget rows
│   ├── SplitTab.jsx          the khata: balances, shared bills, settling up
│   ├── RemindersTab.jsx      upcoming + already-fired reminders
│   ├── HistoryTab.jsx        past days by month; tap one for its insight
│   ├── NotesTab.jsx          note composer, search, list
│   └── SettingsTab.jsx       notifications, budgets, backup, archive, reset
│
├── context/
│   └── TrackerContext.jsx    composes the domain hooks into one useTracker() API
│
├── hooks/                    ── ONE CONCERN EACH ──
│   ├── useStorage.js         useState that persists (localStorage-safe)
│   ├── useTasks.js           regular + holiday tasks, holiday marking, per-day records
│   ├── useNotes.js           notes + search
│   ├── useExpenses.js        expenses + budgets
│   ├── usePeople.js          the people you split with + payments between you
│   ├── useReminders.js       the scheduler
│   ├── useNotifications.js   permission + system notifications
│   ├── useToasts.js          transient messages with undo
│   ├── useWeather.js         Open-Meteo fetch + cache
│   ├── useQuote.js           quote of the day
│   ├── useMediaQuery.js      useIsMobile — drives nav and layout
│   ├── useSwipe.js           horizontal tab gestures
│   └── useCountUp.js         animated numbers
│
├── lib/                      ── PURE, NO REACT — this is what `npm test` covers ──
│   ├── constants.js          categories, priorities, moods, storage keys, schema version
│   ├── dates.js              YYYY-MM-DD day keys, formatting, date windows
│   ├── format.js             money(), clamp(), sumBy()
│   ├── stats.js              completion %, streak, task lifecycle, chart series, budgets
│   ├── insights.js           the day / month / category / task insight engine
│   ├── splits.js             bill splitting + the per-person khata ledger
│   ├── reminders.js          scheduling maths, presets, formatting
│   ├── schema.js             stored-data versioning + migrations
│   ├── backup.js             export / import with validation
│   ├── legacyImport.js       upgrades a pre-dayflowaj export into this app's shape
│   ├── storage.js            localStorage wrapper that cannot throw
│   └── haptics.js            guarded navigator.vibrate
│
├── components/               ── REUSABLE UI ──
│   ├── index.js              barrel: import { Card, Btn } from "../components/index.js"
│   ├── Btn · Card/StatTile · Field · Modal · SectionTitle/Empty · TaskRow
│   ├── CircleProgress · ProgressBar · Delta · Segmented · TiltCard · ChartFrame
│   ├── Logo/Wordmark · AppBar · DayNav · TabBar · BottomNav · Avatar · SplitPicker
│   └── ToastHost · InsightSheet · WhenPicker
│
└── styles/
    ├── theme.js              light/dark palettes, depth tokens, shared input styles
    └── global.css            reset, depth utilities, keyframes, reduced-motion

tests/lib.test.mjs            249 assertions, runs in plain node
tools/verify.mjs              repo self-check: parsing, imports, cycles, dead code
```

## The two structure rules

1. **Nothing in `lib/` imports React.** That's what makes the logic testable in plain Node
   with no framework, no jsdom and no build step.
2. **Nothing in `components/` imports `tabs/`.** `TabBar` and `BottomNav` receive the tab list
   as a prop. Components also import each other by direct path (`./Btn.jsx`), never through
   `components/index.js`.

Together these guarantee no circular imports.

## Data flow

```
lib/*  (pure functions — stats, insights, reminders, schema)
  ↑
hooks/use{Tasks,Notes,Expenses,Reminders,Toasts,Notifications}   ← own the state
  ↑
context/TrackerContext.jsx   ← composes them, derives `stats`, builds insights
  ↑
tabs/*  +  components/*      ← read and call, never touch storage directly
```

`TrackerContext` holds no business logic. It wires hooks together, memoises the derived
numbers into one `stats` object, and turns an `openInsight({kind, …})` request into a rendered
panel. If you find yourself writing a calculation there, it belongs in `lib/`.

## The depth system

Three ingredients, all in `styles/`:

- **`.tile`** — card background, hairline border, ambient `--shadow-1`, and a `::before`
  pseudo-element painting 1px of `--card-hi` along the top edge. That top highlight is what
  reads as thickness; without it a shadow alone looks like a sticker.
- **`.pressable`** — `scale(0.965)` plus an inset shadow on `:active`, so controls depress
  instead of merely changing colour. Every `Btn` has it.
- **`.lift`** — a 2px rise and a deeper shadow, gated behind `@media (hover: hover)` so
  touch devices never get a stuck hover state.

`TiltCard` adds pointer-tracked rotation for hero cards only, and ignores `pointerType:
"touch"` — a tilt you can't see under your thumb is just jitter. Everything collapses under
`prefers-reduced-motion`.

## Common changes

### Add a tab

Create `tabs/MyTab.jsx`, then add one line to `tabs/index.js`:

```jsx
{ id: "goals", label: "Goals", icon: "◈", Component: GoalsTab },
```

Desktop nav, number-key shortcut and swipe order all follow that array. **The first five
entries also become the phone's bottom bar**, so order by how often you'd use them — anything
past five lives behind "More", which cycles through the remainder.

### Add a kind of insight

1. Write `thingInsight({ … })` in `lib/insights.js` returning the shared shape:
   `{ kind, key, title, subtitle, pct?, stats: [{label, value}], rows: [{label, meta, value, ok}], facts: [string], delta?, budget? }`
2. Add a branch to `openInsight` in `TrackerContext.jsx`
3. Call `openInsight({ kind: "thing", … })` from anywhere

`InsightSheet` needs no changes — it renders whatever that shape describes. Facts are written
as whole sentences with real numbers in them; that's the part people actually read.

### Add a field that persists

Add it to the matching domain hook, expose it from `TrackerContext`, then read it via
`useTracker()`. Register the key in `STORAGE_KEYS` (`lib/constants.js`) **and** `DATA_MAP`
(`lib/schema.js`) so it's included in backups.

### Change a stored shape

1. Bump `SCHEMA_VERSION` in `lib/constants.js`
2. Add an `if (v < N) { … }` block to `migrateBundle()` in `lib/schema.js`
3. Add an assertion to the *migrations* group in `tests/lib.test.mjs`

### Change colours or depth

`styles/theme.js`. Components use `var(--card)`, `var(--text)`, `var(--accent)`,
`var(--shadow-2)`. Recharts can't read CSS variables, so charts get concrete values through
`chart` from `useTracker()` — both come from the same palette.

### Replace the logo

The real app icon lives at `public/logo-mark.png` (128×128) and is what `components/Logo.jsx`
renders. It, `public/icon-*.png`, `public/apple-touch-icon.png` and `public/favicon.svg` are all
generated from the same master artwork — regenerate the set together if you change it, and re-derive
`icon-maskable-512.png` with real padding (its content has to survive a circular safe-zone crop, not
just a square one).

## Decisions worth not "fixing"

- **Day keys are local-time `YYYY-MM-DD`.** Don't switch to `toISOString()` — it converts to
  UTC and can land on the wrong day for anyone east or west of it.
- **`getPastDays()` normalises to midnight.** Without it, a DST shift produces a duplicate day.
- **`storage` never throws.** Private-mode Safari and sandboxed iframes make `localStorage`
  unavailable — even *reading* the property can throw. It falls back to an in-memory `Map`.
- **`emptyDay()` is a factory, not a constant.** A shared constant would hand the same
  `checks` object and `extra` array to every day.
- **`dayOf()` copies the day's collections.** A plain spread returns the array that lives in
  the store; mutating it changes state without a re-render.
- **Tasks carry `createdAt` / `archivedAt`.** This is the whole reason history stays accurate —
  see `tasksActiveOn()`. Deleting tasks outright would rewrite the past.
- **`presetTime(preset, now)` takes `now`** and never reads the clock itself. That's the only
  reason reminder scheduling is testable, and it was a real bug before the tests caught it.
- **Chart rows keep their `key`.** That's what lets a tapped point resolve to a day insight.
- **Reminders store an absolute timestamp**, not a duration, so they survive a reload.
- **`useReminders` keeps an `announced` ref.** React StrictMode runs effects twice in dev;
  without it you'd get two notifications per reminder.
- **`CircleProgress` rotates only the arc** via an SVG `<g transform>`. Rotating the `<svg>`
  would tip the percentage label over with it. It also calls `useCountUp` unconditionally —
  hooks can't live behind an `if`.
- **Migrations skip a first run.** Otherwise the v1→v2 step would write empty arrays over the
  default tasks before you ever saw them.
- **`ChartFrame` sets an explicit height** and marks itself `data-noswipe`, so Recharts renders
  and horizontal drags on a chart don't change tabs.
- **`useSwipe` ignores gestures starting on a control** or running mostly vertically, so it
  can't fight checkboxes, sliders or scrolling.

## Tests

```bash
npm test
```

215 assertions against `lib/`, in plain Node. Groups: dates, format, storage, task lifecycle,
stats, budgets, reminders, migrations, backup, insights, splits, config.

`npm run verify` is the other half: it converts every JSX file to plain JS and runs
`node --check` on it, then checks that imports resolve, named imports are actually
exported, there are no circular dependencies, no unused imports or locals, no exports
nothing calls, no hooks behind an `if`, every tab is registered, and every doc link and
manifest icon resolves.

Notable coverage: DST-safe 365-day windows, NaN-safety on money and completion %, the storage
fallback under a *throwing* `localStorage`, reminder rollover to tomorrow, missed reminders,
v1→v2 migration, five malformed-backup rejections, and every insight kind including
month-boundary and empty-data cases.

The suite is also run under four timezones (`Asia/Kolkata`, `America/New_York`, `UTC+14`,
`UTC-11`) — date-keyed logic is exactly where a passing test in one zone means nothing.

Money splitting is covered hardest, because rounding errors there are silent: shares must
sum to the bill exactly for every split from 2 to 9 ways, a part payment must leave the
right remainder, and a bill between two other people must never enter your ledger.

Three real bugs came out of these tests: `presetTime()` reading the wall clock instead of its
argument, the v1→v2 migration wiping default tasks on a fresh install, and `dayOf()` handing
out mutable references into the store.
