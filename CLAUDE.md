# CLAUDE.md - Expense Tracker

## What it is
A personal expense tracker (Next.js 14 App Router, TypeScript, Tailwind). Built as Assignment 1 of the
Vanderbilt course "Claude Code: Software Engineering with Generative AI Agents", and used as the
base for the Best-of-N pattern exercises. Public GitHub repository (`t605/ExpenseTracker`) with a live site on
GitHub Pages. Publishing was cleared with the course instructor by email on 2026-10-01 (keep that email: the Coursera
Honor Code forbids sharing assignment solutions unless the instructor or assessment allows it). License: MIT.

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
- **Currency (ILS / USD / EUR) is a display choice only.** Amounts are plain cents with no currency; switching
  changes the symbol, never the numbers. Always format money with `useCurrency().formatMoney`.
- **The "Cloud" page (`/cloud`) is a SIMULATION.** No email is sent, no service is contacted, no credentials are
  asked for; the "connected account" is a fixed demo name. Say so in the UI (it does). Do not make it look real.
  Exception, and the real parts: the "This device" download, the report templates (real numbers), the SHA-256
  fingerprints, the share links and the QR codes.
- **Share links need no server:** the report is deflated into the `#fragment` of `/shared#...`. Consequences that
  are shown to the user: anyone with the link can read it, it cannot be recalled (Revoke works on this browser only),
  expiry is checked by the viewer page (courtesy, not security). Decoded links are untrusted: size-capped and
  validated in `lib/cloud/share.ts`.
- **Schedules cannot run while the page is closed.** They run while the app is open (every 30 s) and make up a
  missed run when the app is opened ("catch-up" in History). Do not claim real background jobs without a server.
- **One added dependency: `qrcode-generator`** (tiny, no dependencies) for real QR codes.
- Cloud settings/history/shares live in localStorage `expense-tracker:cloud:v1`, read in an effect and not written
  before the first successful read (same rule as the expenses).

## Files
- `app/page.tsx` Dashboard, `app/expenses/page.tsx` list + filters + export, `app/layout.tsx` providers.
- `components/` UI. `ExpensesProvider` (data), `ExpenseActions` (add/edit/delete dialogs), `Toasts`.
- `lib/` all logic and the only place with rules: `format`, `validation`, `filter`, `analytics`, `csv`, `storage`, `types`.
- `lib/currency.ts`, `components/CurrencyProvider.tsx`, `CurrencySelect.tsx` currency choice.
- `lib/cloud/` logic of the Cloud page: `templates` (Tax report, Monthly summary, Category analysis, Full data),
  `schedule`, `share`, `health` (pre-flight data check), `simulate`, `state` (validates saved data), `catalog`, `util`.
- `components/cloud/` UI: `CloudProvider` (state, scheduler), `CloudHub` (tabs), `ExportTab`, `SchedulesTab`,
  `ConnectionsTab`, `ConnectModal`, `SharesTab`, `QRCode`, `HistoryTab`, `SyncStatusBar`, `SharedViewer`.
  Routes: `app/cloud/page.tsx`, `app/shared/page.tsx`.
- `tests/lib.test.ts`, `tests/currency.test.ts`, `tests/cloud.test.ts` unit tests for `lib/`.

## Prompt for a similar project
Written at the wrap-up (2026-10-01): the single prompt that would have reached this result in the fewest rounds.
Copy it, replace the facts in <>, keep the structure.
```
Project: <what it is, stack>. Goal: <outcome>. Baseline: <branch/commit>.
My environment: <OS, tools, locale, how I open the results (e.g. Excel with ";" list separator)>.
Data facts: <languages (Hebrew/Russian), formats, units, what must never change (money = whole cents)>.
Versions/steps: <one short brief each, ALL pasted now: V1 simple, V2 advanced local, V3 cloud demo>.
Hard rules: branch names are exact (if one exists, rename the old one to <name>-old and tell me, never delete);
never push, publish or change GitHub settings; never contact a real service; label everything simulated in the UI.
Done means: tests + typecheck + lint + build pass before each commit; checked in the real browser with real data
(Hebrew, quotes, a "=" description); tell me what was NOT tested; leave the test server running until I say stop.
After: <publish plan: where, which version, what must not be public (email, logo, secrets)>.
```
Biggest detours it prevents: V3 brief arriving late; branch-name clashes; CSV opening in one column (semicolon Excel);
ambiguous "currency change" (display symbol only); unclear "original branch"; going public decided only at the end.

## Running
`npm install`, then `npm run dev` (add `-- -p 3123` for another port).

## Testing
`npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` must all pass before a commit.
Screens are tested by hand: see README.txt section 4. Browser screenshots were unreliable in the
desktop app pane (timeouts); use page text / DOM checks if that happens.

## Git
Branch `master` is the baseline (commit `22aafb2`). Best-of-N attempts go on their own branches
(or worktrees) cut from the baseline commit, never on `master`.

Export attempts (local branches, not pushed): `feature-data-export-v1` (one button), `-v1-excel-fix`,
`-v2` (advanced dialog), `-v3` (cloud demo + currency), `-v3-currency-menu` (earlier mid-way v3).
**`main` = the public release line** = V3 (currency + cloud demo) plus the GitHub Pages setup.

## Public release (GitHub Pages)
Owner decision (2026-10-01): publish V3 only, like ClaudeCodeTipCalculator; the other versions stay local.
- `.github/workflows/deploy.yml` tests, type-checks, lints, builds a static export and deploys on push to `main`.
- `next.config.mjs`: `STATIC_EXPORT=1` -> `output: "export"`, `NEXT_PUBLIC_BASE_PATH=/<repo>` -> `basePath`. Both are
  OFF locally, so `npm run dev` / `npm start` are unchanged. Share links add the base path (`buildShareUrl`).
- Order matters on GitHub (free plan: Pages needs a PUBLIC repo): make the repo public, then Settings > Pages >
  Source = "GitHub Actions", then push `main`, then Settings > Branches > default branch = `main`.
- Audit before going public (done): commits use the GitHub noreply address; no keys, tokens, `.env`, or personal logo;
  the favicon is the Next.js default. No LICENSE file yet (owner's choice; without one, all rights are reserved).
- Known harmless noise: under a sub-path Next requests `/<repo>.txt` for the home link prefetch and gets a 404.
Windows: `git` is not on PATH; use GitHub Desktop's bundled `git.exe`.
