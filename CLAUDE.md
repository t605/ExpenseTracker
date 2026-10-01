# CLAUDE.md - Expense Tracker

## What it is
A personal expense tracker (Next.js 14 App Router, TypeScript, Tailwind). Built as Assignment 1 of the
Vanderbilt course "Claude Code: Software Engineering with Generative AI Agents", and used as the
base for the Best-of-N pattern exercises. Private GitHub repository (`t605/ExpenseTracker`).

## Decisions (do not "correct")
- **Next.js 14 pinned**, as the assignment specifies. Do not upgrade to the newest Next.js.
- **vitest 3, not 5**: vitest 5 needs `@types/node` 22+, which conflicts with the Next 14 scaffold.
- **Money is whole cents** (`amountCents`), parsed from text, never floats. Display only via `formatCurrency`.
- **Dates are `YYYY-MM-DD` strings in local time.** Never `new Date("2026-10-01")` (that is UTC and can
  shift the day). Use `lib/format.ts`.
- **Fixed month names** in `lib/format.ts`, not `toLocaleDateString`, so text is identical everywhere.
- **localStorage only** (assignment says demo). Read happens in an effect; nothing is written back
  before the first successful read, or saved data could be wiped.
- **No chart library.** Charts are plain SVG/CSS in `components/Charts.tsx`.
- **No dark mode.** Light only (`color-scheme: light`).
- CSV cells starting with `= + - @` get a leading apostrophe (spreadsheet formula injection).
- Fonts are the system stack on purpose: no network needed to build.

## Files
- `app/page.tsx` Dashboard, `app/expenses/page.tsx` list + filters + export, `app/layout.tsx` providers.
- `components/` UI. `ExpensesProvider` (data), `ExpenseActions` (add/edit/delete dialogs), `Toasts`.
- `lib/` all logic and the only place with rules: `format`, `validation`, `filter`, `analytics`, `csv`, `storage`, `types`.
- `tests/lib.test.ts` unit tests for `lib/`.

## Running
`npm install`, then `npm run dev` (add `-- -p 3123` for another port).

## Testing
`npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` must all pass before a commit.
Screens are tested by hand: see README.txt section 4. Browser screenshots were unreliable in the
desktop app pane (timeouts); use page text / DOM checks if that happens.

## Git
Branch `master` is the baseline (commit `22aafb2`). Best-of-N attempts go on their own branches
(or worktrees) cut from the baseline commit, never on `master`.
Windows: `git` is not on PATH; use GitHub Desktop's bundled `git.exe`.
