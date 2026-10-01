# Expense Tracker

A personal expense tracker that runs entirely in your browser. Add expenses, see where the money goes,
filter and search, and export your data.

Built with Next.js 14 (App Router), TypeScript and Tailwind CSS as a project for the Vanderbilt course
"Claude Code: Software Engineering with Generative AI Agents".

**Live site:** `https://t605.github.io/ExpenseTracker/` (available after the first successful deploy)

## Your data stays with you

There is no server and no account. Your expenses are saved in your own browser (`localStorage`) and never
leave your device. Clearing your browser data erases them, so export a CSV now and then.

## What it does

- **Dashboard**: totals, this month versus last month, spending by category, the last six months.
- **Expenses**: add, edit, delete; search; filter by category and dates; sort; export the visible rows to CSV.
- **Currency**: show amounts in shekel, dollar or euro. This changes the symbol only; nothing is converted.
- **Export & Share (a demo)**: report templates (Tax report, Monthly summary, Category analysis, Full data),
  schedules, history with file fingerprints, and share links with QR codes.

### About the "Export & Share" page

Only part of it is real, and the page says so:

| Real | Simulated (demo only) |
| --- | --- |
| Download to your device, the report numbers, SHA-256 fingerprints, share links, QR codes | Email, Google Sheets, Google Drive, Dropbox and OneDrive: no email is sent, no service is contacted, no sign-in happens |

Share links work without a server: the report is packed into the part of the link after `#`, which browsers
never send over the network. This means anyone who has the link can read the report, a link cannot be recalled,
and the expiry date is checked only by the page that opens the link. Schedules run while the app is open and
catch up when you open it again; a web page cannot run in the background.

## Run it on your computer

```
npm install
npm run dev
```

Open http://localhost:3000 (add `-- -p 3123` to use another port).

Checks used before every commit:

```
npm run test
npm run typecheck
npm run lint
npm run build
```

## How it is published

Every push to `main` runs the checks and publishes the site to GitHub Pages
(`.github/workflows/deploy.yml`). The workflow builds a static site (`STATIC_EXPORT=1`) under the repository
name (`NEXT_PUBLIC_BASE_PATH`). Locally these settings are off, so `npm run dev` and `npm start` work as usual.

## Design decisions

- Money is stored as whole cents and parsed from text, never as floating-point numbers.
- Dates are `YYYY-MM-DD` strings in local time, never parsed through UTC.
- No chart library: the charts are plain SVG and CSS.
- Fonts are the system stack, so the build needs no network.
- Next.js 14 is pinned on purpose (the course assignment specifies it).
- CSV cells that start with `=`, `+`, `-` or `@` get a leading apostrophe so a spreadsheet cannot run them as formulas.
- One extra dependency, `qrcode-generator`, for real QR codes.

`README.txt` holds the manual test checklist.
