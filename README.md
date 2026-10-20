<div align="center">

<img src="public/favicon.svg" width="76" alt="DayFlow AJ logo" />

# DayFlow AJ

**Your day, tracked and understood — routine, mood, notes, money and a shared-expense khata, in one local-first app.**

Mobile-first, installable, with per-task reminders at a time you pick and dashboards that
explain themselves when you tap them.

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev)
[![PWA](https://img.shields.io/badge/PWA-installable-5b5bf0)](public/manifest.webmanifest)
[![Tests](https://img.shields.io/badge/tests-249%20passing-brightgreen)](tests/lib.test.mjs)
[![Licence](https://img.shields.io/badge/licence-MIT-blue)](LICENSE)

</div>

---

## Screenshots

> Run `npm run dev`, then drop your own images in `docs/screenshots/` — see the
> [shot list](docs/screenshots/README.md).

| Today | Insights |
| :---: | :---: |
| ![Today tab](docs/screenshots/today.png) | ![Insights tab](docs/screenshots/analysis.png) |

| Money | Split |
| :---: | :---: |
| ![Expenses tab](docs/screenshots/expenses.png) | ![Split tab](docs/screenshots/split.png) |

## Why this exists

Most habit trackers either live on someone else's server, or forget what you did last week
the moment you change your routine. DayFlow AJ keeps everything in your browser, and records
*when* each task entered and left your routine — so last week's 100% stays 100%.

And a dashboard that only shows you a line isn't worth much. Here, every number is a tap
target: tap a day, a month, a category, a task or a person and you get sentences, not just
pixels — "₹1,500 across 2 entries, 63% of everything you spent in March", "strongest on
Tuesday, weakest on Sunday", "Rahul owes you ₹300 from 2 shared bills".

Shared costs live in the same place. Add the people you split with once, then split any bill
between however many of them you like and the khata keeps the running balance for you.

## Features

### Built for a phone

- **Bottom tab bar** with the five most-used destinations, sized for thumbs and padded around the home indicator
- **Swipe left or right** to move between tabs; gestures that start on a control or run vertically are left alone
- **Installable** — add to your home screen and it opens fullscreen with no browser chrome
- **Haptic feedback** on ticking a task, adding one, and destructive actions, where the browser supports it
- Dialogs anchor to the bottom on small screens with actions pinned below the scroll
- 16px inputs so iOS never zooms the page when you focus a field

### Tactile depth

Layered shadows with a hairline of light along each card's top edge, buttons that press *in*
rather than dim, a gradient-shaded progress ring that animates as you tick things off,
count-up numbers, staggered entry, and a hero card that tilts towards the pointer on desktop.
All of it collapses to plain fades under `prefers-reduced-motion`.

### Insights that say something

Five kinds, one panel, all derived from your own data:

| Tap | You get |
| --- | --- |
| A day — in History, a chart point, a note's date | Completion, what was missed by name, spend, comparison against your 7-day average, the day's note |
| A month — a stat tile or the month picker | Average completion, perfect days, best and weakest day, spend and its per-day rate, top category, month-over-month change, average mood |
| An expense category — a budget row or pie slice | Month total, share of spend, entry count and average, biggest single entry, change vs last month, budget progress |
| A task — its name on the Today tab | Completion rate over 30 days, current run, strongest and weakest weekday, when you last did it |
| A person — on the Split tab | Net balance, their share of bills you covered, your share of theirs, payments already made, largest shared bill |

Plus a weekday pattern strip showing which days your routine actually holds up.

### Reminders per task, at a time you choose

Adding a task offers a reminder: four one-tap presets (in 15 min, in 1 hour, this evening,
tomorrow 9am) plus an exact date and time. Marking a task **high priority** switches the
reminder on for you.

Reminders are stored as absolute timestamps, so they survive a reload. Anything that came due
while the app was closed fires the next time you open it, labelled as delivered late.

### Notifications

With permission granted, reminders raise a real system notification even when the tab is in
the background, and clicking it focuses the app. Reminders also always appear as an in-app
toast, so a blocked permission never means a missed reminder.

> **Honest limit:** notifications need the app running in a tab. Alerts with the app **fully
> closed** would require Web Push and a server, which this project doesn't have.

### Split bills — a khata that keeps itself

Add the people you share costs with once; they become fixed accounts you pick from
whenever you log an expense.

- Flip on **Split this bill** in the expense form: choose who's in, who paid, and whether it's equal or custom amounts
- **2 / 3 / 4 / 5 people** is one tap — it picks you plus the first people on your list
- A live per-head figure as you type the amount, and a plain-English summary: *"You paid. Rahul owes ₹300, Priya owes ₹300."*
- Custom amounts show what's still unassigned, and saving is blocked until the shares add up
- Every split lands on the **Split tab**: what you'll get, what you'll pay, a balance per person, and each shared bill with everyone's share
- **Settle up** records a payment in either direction, full or partial, and the balance moves accordingly
- Tap anyone for their whole ledger — their share of bills you covered, your share of theirs, payments made, biggest shared bill

Three deliberate choices worth knowing:

- **Shares always add up to the bill.** ₹100 three ways is ₹33.34 / ₹33.33 / ₹33.33 — the leftover paisa goes somewhere rather than evaporating. Verified for every split from 2 to 9 ways.
- **Only your edges are tracked.** If Rahul pays and Priya joins in but you don't, that's between them — it never enters your khata. This is a personal ledger, not a group settlement solver.
- **People in a shared bill can't be deleted**, since removing them would rewrite those bills. The app says so instead of failing quietly. Settle up, then remove.

### Any day, not just today

The day chip at the top of Today isn't just a label — step back and forward with
the arrows, or open the calendar (📅) to jump straight to any date. Whatever tasks were active on
that day render with their real ticked/missed state, so a Tuesday from three
weeks ago looks exactly like it did at the time — same checklist, same mood, same
note. "Day insight" on that same card breaks the day down in a sentence: what got
done, what got missed by name, and how it compares to your recent average.

Mark a day as a holiday and a second, separate task list — things you actually do
on a day off — takes over the spotlight alongside your regular tasks, without
touching their completion % or streak. Marking today "Diwali" doesn't rewrite what
100% has meant on every ordinary day before it. Saturdays and Sundays get the same
treatment with their own weekend task list.

### One list, with an optional time

There's no separate planner: a task can simply *have a time*. Add one with **At a time**
and a start (and optional end), and it sits on a **Timeline** at the top of Today in clock
order; tasks without a time stay in the **Anytime** list below. It's all one list, so one
completion %, one streak and one set of Insights.

Or type your day the way you'd say it — **+ Add → Type several** — `6:30 wake up`,
`7 to 9 gym`, `9 to 11 prepare`, `call the bank` — one per line. It reads the times, works
out am/pm from the order of the lines, treats a line with no time as an anytime task, and
previews what it understood before adding anything.

Each task can repeat every day, weekdays or weekends (a weekdays-only task doesn't count
against a Sunday). On today the timeline shows what's happening now, what's next and how
long is left; step back to a past day and every timed task is either done or missed.
Overlapping tasks are flagged and open stretches are listed as free time. Tap ✎ to edit
any task — its time, repeat or priority.

### The rest

- **Undo on every delete** — tasks, notes, expenses, extras, people, payments, cancelled reminders, even *delete all data*. No "are you sure?" dialogs.
- **Tasks archive rather than vanish**, so past days keep their real numbers. Restore or purge from Settings.
- **Monthly budgets** per category with progress bars and overspend warnings.
- **Export / import** everything as dated JSON, validated and auto-migrated on the way in — including a straight export from the app this one grew out of, upgraded on the way in rather than rejected.
- **Versioned storage** with migrations that run before the app mounts.
- **Notes** can be colour-coded, tagged, pinned to the top, and searched by title, body or tag.
- Weekend and holiday quotes swap in automatically for the day you're viewing.
- Light and dark themes, and keys `1`–`9` for tabs on desktop.

## Quick start

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone https://github.com/<your-username>/dayflowaj.git
cd dayflowaj
npm install
npm run dev          # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production bundle in `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | 249 logic assertions in plain Node — no browser, no test framework |
| `npm run verify` | Repo self-check: JSX parses, imports resolve, no circular deps, no dead code, no hooks behind an `if`, docs links work |
| `npm run check` | Both of the above |

### Notes on running it

- **Notifications, geolocation and install need a secure context.** `localhost` counts; deploy over HTTPS.
- **The service worker is served from `public/sw.js`** at the site root. Under a sub-path, adjust the registration in `src/main.jsx`.
- **Weather is optional** — Open-Meteo, no API key. Deny location and the app just omits the chip.
- **To test the phone layout**, open dev tools' device toolbar, or visit your machine's LAN address from your phone (`npm run dev -- --host`).

## Tech stack

| | |
| --- | --- |
| **UI** | React 18, no component library — inline styles over CSS custom properties |
| **Build** | Vite 5 |
| **Charts** | Recharts |
| **State** | React Context composed from small domain hooks. No Redux, no Zustand. |
| **Storage** | `localStorage`, wrapped so it can't throw, with an in-memory fallback |
| **Tests** | Plain Node assertions against the pure `lib/` modules |

Runtime dependencies: **react**, **react-dom**, **recharts**. That's it.

## Project structure

```
public/               service worker, manifest, AJ icons
src/
├── tabs/             one file per tab + a registry (add a tab = add one line)
├── context/          composes the domain hooks into one useTracker() API
├── hooks/            useTasks · useNotes · useExpenses · useReminders · useToasts
│                     useNotifications · useStorage · useSwipe · useMediaQuery · useCountUp
├── lib/              pure logic: dates · stats · insights · splits · reminders · schema · backup
├── components/       Btn · Card · Field · Modal · TaskRow · CircleProgress · ProgressBar
│                     Segmented · TiltCard · Logo · AppBar · DayNav · BottomNav · InsightSheet
│                     Avatar · SplitPicker
└── styles/           palettes, depth tokens, small global sheet
tests/                the logic suite
tools/verify.mjs      repo self-check (npm run verify)
```

Two rules keep it untangled: nothing in `lib/` imports React, and nothing in `components/`
imports `tabs/`. There are no circular imports.

**→ See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full file map, how to add a tab,
a persisted field or a new kind of insight, and the decisions worth not "fixing".

## Your data

Everything lives in your browser's `localStorage`. No account, no server, no analytics —
nothing leaves your device except the anonymous weather lookup, if you allow location.

The flip side: **clearing site data deletes everything.** Settings → *Export backup* writes a
JSON file you can re-import later.

## Roadmap

- [ ] Edit tasks, notes and expenses in place (currently delete + re-add)
- [ ] Group settlement: simplify who-pays-whom across three or more people
- [ ] Share a khata balance as an image or text message
- [ ] Recurring rules per task — weekdays only, every other day, specific days
- [ ] A separate weekend routine that swaps in for regular tasks on Sat/Sun
- [ ] Drag-and-drop task reordering
- [ ] Web Push so reminders fire with the app fully closed
- [ ] Year view and month-over-month comparison charts
- [ ] Optional encrypted sync between devices

## Contributing

Issues and pull requests are welcome.

1. Fork and branch
2. Put new logic in `src/lib/` as a pure function where you can, and add assertions to `tests/lib.test.mjs`
3. Run `npm test` and `npm run build` before opening the PR
4. Keep the two structure rules above intact

## Licence

[MIT](LICENSE) — do what you like, no warranty.
