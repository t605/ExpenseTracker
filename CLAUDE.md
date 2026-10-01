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
- **Exports never overlap:** every export (manual or scheduled) goes through one serial queue
  (`lib/cloud/queue.ts`). An empty scheduled run is recorded as "skipped" (nothing sent). A failed scheduled run is
  NOT retried automatically (decision after the QA review, 2026-10-01). A share link is only created if the viewer's
  own limits accept it (`checkShareable`, max 5000 rows / 1 MB) and it decodes again.
- **Formatting is automatic: Prettier (printWidth 120, line endings left as they are).** A project-level PostToolUse hook
  (`.claude/settings.json` -> `.claude/hooks/format.mjs`) runs the LOCAL Prettier on every `.ts/.tsx/.mjs/.css/.json` file
  right after Claude edits or writes it. It never blocks an edit (always exit 0), skips node_modules/.next/out/package-lock
  and anything outside the project, and does not touch Markdown. `npm run format` / `npm run format:check` do the same by
  hand. It is deliberately NOT a CI gate, so a hand-edited file can never stop a deploy. After an edit, if the next Edit
  fails to match, Read the file first: the hook may have reformatted it.
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
This is the QA plan. Work through the levels in order and report real numbers, never "should pass".

1. **Before every commit of code:** `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` must all pass.
   `npm run format:check` must be clean (the Prettier hook formats after each edit; `npm run format` fixes the rest).
2. **A fix or feature needs a test.** Add a unit test for each new rule in `lib/` and for each bug fixed. Say what is NOT covered
   (components have no automated tests: the project has no component test setup).
3. **Before every push of code to `main`:** run the read-only `qa-reviewer` agent on the diff since the last push
   (`git diff <last pushed commit>..HEAD`; the agent runs read-only, not on docs-only changes). Fix real findings with a test each,
   and list what it did not review. Also run the Pages build:
   `STATIC_EXPORT=1 NEXT_PUBLIC_BASE_PATH=/ExpenseTracker npm run build`, because that is what the deploy builds.
4. **Screens are tested by hand** (README.txt section 4), on the PRODUCTION build (`npm run build`, then `npm run start -- -p 3123`;
   stop the server afterwards). Use realistic data: Hebrew and Russian text, quotes, a description starting with `=`, an empty state,
   and for share links a list over 5000 rows. Check phone width (375 px). Browser screenshots were unreliable in the desktop app pane
   (timeouts); use page text and DOM checks if that happens.
5. **After features are merged together** (see `/integrate-parallel-work`): re-run levels 1 to 4, and in the browser check every
   shared hotspot screen (`app/page.tsx`, `components/Header.tsx`, `app/layout.tsx`) with both features, not only the unit tests.
6. **After a push to `main`:** the GitHub Actions run for the newest commit must say Success, and the live site must load without
   failed requests (read-only check in the browser pane; the user does the pushing and the GitHub settings).
7. **Docs:** when a documented feature changes, update `docs/dev/<feature>.md` and `docs/user/<feature>.md` (`/document-feature`
   verifies every name and screen label against the code).
8. **Always end a QA report with what was NOT tested.** Standing gaps today: Safari and Firefox support for the compression API
   behind share links, a screen-reader pass, exported CSV opened in Excel on other regional settings, scanning a QR code with a real
   phone, and any real email or cloud service (all simulated).

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
