# Code analysis: three implementations of data export

Project: Expense Tracker (Next.js 14 App Router, TypeScript, Tailwind, localStorage only, no backend).
Baseline: branch `n-pattern-a` (commit `20d7743`). Analysis date: 2026-10-01.

| Version | Branch | Idea |
| --- | --- | --- |
| V1 | `feature-data-export-v1` | One "Export Data" button, CSV, Date / Category / Amount / Description |
| V2 | `feature-data-export-v2` | Local "power user" dialog: CSV / JSON / PDF, date range, categories, preview, file name, loading state |
| V3 | `feature-data-export-v3` | Cloud-style "Export & Share" page (simulated services), report templates, schedules, history, share links with QR, plus a currency selector |

Two side branches also exist: `feature-data-export-v1-excel-fix` (V1 plus a `sep=,` first line) and
`feature-data-export-v3-currency-menu` (an earlier, simpler V3 that was replaced). `main` is V3 plus a QA-review
fix commit, a license, a GitHub Pages workflow and Prettier; it is mentioned where it changes a conclusion.

## How this analysis was made

- Each branch was read with `git diff n-pattern-a..<branch>` and checked out into its own temporary worktree (not by switching
  the working branch). Every worktree got a clean `npm ci`, then `npm run test`, `npm run lint` and `npm run build` were run.
- The numbers below (lines, files, tests, bundle sizes) are measured. Everything labelled "assessment" is judgement.
- NOT tested here: Safari and Firefox behaviour, a screen-reader pass, opening the CSV in Excel on other regional settings
  (a semicolon-list-separator Excel was seen to break V1 and V2 files that lack `sep=,`, see below), real email / cloud
  services (V3 simulates all of them).

## At a glance (measured)

| Measure | V1 | V2 | V3 |
| --- | --- | --- | --- |
| Files changed vs baseline | 3 | 9 | 42 |
| Lines added / removed (without lockfile) | +25 / -2 | +963 / -5 | +3,865 / -64 |
| New source files (without tests) | 0 | 4 | 27 (incl. 2 routes) |
| New dependencies | none | none | `qrcode-generator` (MIT, no dependencies) |
| Tests after the change (baseline: 18) | 19 | 53 | 65 |
| Lint / build | pass / pass | pass / pass | pass / pass |
| Route size `/` (First Load JS) | 3.67 kB (104 kB) | 8.66 kB (109 kB) | 2.06 kB (104 kB) |
| Other routes | `/expenses` 3.32 kB | `/expenses` 3.3 kB | `/cloud` 20.6 kB (118 kB), `/shared` 3.34 kB (109 kB), `/expenses` 2.01 kB |
| Shared JS (all pages) | 87.3 kB | 87.3 kB | 87.3 kB |

Shared JavaScript is identical (87.3 kB) in all three: none of the versions made the common bundle heavier. V2's cost sits on the
dashboard route (+5 kB), V3's on its own `/cloud` route (20.6 kB), so a user who never opens the Cloud page pays nothing for it.

---

## V1: the one-button export

### Files created or modified
- `lib/csv.ts` (+9): new `expensesToExportCSV(expenses)`.
- `app/page.tsx` (+11 / -1): header row with an "Export Data" button.
- `tests/lib.test.ts` (+5 / -1): one test for the column order and quoting.

### Architecture
No new structure. It reuses the helpers that already existed in `lib/csv.ts`: `csvCell` (quoting plus the `= + - @` formula guard)
and `downloadCSV` (Blob, object URL, temporary `<a download>`, UTF-8 BOM). The new function is a second serializer with a different
column order than the existing `expensesToCSV` (which exports Date, Category, Description, Amount for the Expenses page).

### Key components and responsibilities
- `expensesToExportCSV`: pure function, data in, CSV text out.
- Dashboard button: `onClick={() => downloadCSV("expenses.csv", expensesToExportCSV(expenses))}`.

### Libraries
None.

### Implementation patterns
Pure serializer plus the existing download helper. No state, no context, no component of its own.

### Complexity assessment
Very low. 25 lines. A reader understands all of it in a minute. Cyclomatic complexity is essentially one.

### Error handling
None added, and none was needed for correctness of the happy path: the button only renders when the dashboard has expenses (the empty
state returns earlier), so an empty export cannot happen from the UI. `downloadCSV` can throw if the browser refuses a Blob URL, and
V1 does not catch it, so such a failure would be silent. There is no success or failure message.

### Security considerations
- Spreadsheet formula injection is handled through `csvCell` (leading apostrophe on `= + - @ tab CR`).
- No user-supplied file name (fixed `expenses.csv`), so no file-name injection.
- Data never leaves the browser.

### Performance implications
One synchronous pass over the expenses, string concatenation, one Blob. Fine for thousands of rows; it would block the main thread
for very large lists (tens of thousands), which is not a realistic localStorage size.

### Extensibility and maintainability
Easy to read and to change, but nothing in it is designed to grow: a second format, a filter or a file name would each need new
parameters or a rewrite. The duplicated column logic (two near-identical serializers) is the main maintenance smell.

### Technical deep dive
- **How it works:** rows are `[Date, Category, Amount, Description]`; amount is `(amountCents / 100).toFixed(2)`, so no floating-point
  money maths is involved beyond a display division; each cell goes through `csvCell`; rows are joined with CRLF.
- **File generation:** client side `Blob` with a BOM, downloaded through a temporary anchor.
- **User interaction:** a single click; no feedback.
- **State management:** none (it reads `expenses` from the existing provider).
- **Edge cases:** commas, quotes and newlines in descriptions (quoted by `csvCell`), formulas (guarded), Hebrew and Cyrillic text (BOM
  makes Excel read UTF-8). **Found in real use:** on an Excel installation whose list separator is `;` (Russian regional settings) all
  columns landed in column A. The fix (`sep=,` first line) lives on `feature-data-export-v1-excel-fix`; the trade-off is that other
  programs then see that line as a data row.

---

## V2: the advanced local dialog

### Files created or modified
- `lib/export.ts` (new, 314 lines): all logic.
- `components/export/ExportDialog.tsx` (new, 138): orchestration and state.
- `components/export/ExportOptionsForm.tsx` (new, 217): the left column of controls.
- `components/export/ExportPreview.tsx` (new, 91): summary and preview table.
- `components/Modal.tsx` (+6 / -2): optional `wide` prop.
- `app/page.tsx` (+15 / -2): button plus dialog mount.
- `tests/export.test.ts` (new, 170): 35 tests. `README.txt`, `CLAUDE.md`: documentation.

### Architecture
A clean three-layer split inside one feature folder:
1. **Pure logic** (`lib/export.ts`): option types, defaults, `selectForExport`, `validateOptions`, `presetRange`, `sanitizeFilename`,
   serializers `toCSV` / `toJSON` / `toPrintHTML`, and (the only browser-dependent part) `downloadText`, `printHTML`, `runExport`.
2. **Container** (`ExportDialog`): owns the options state, derives the selection and summary with `useMemo`, runs the export.
3. **Presentational** (`ExportOptionsForm`, `ExportPreview`): receive props, no data fetching or side effects.

### Key components and responsibilities
- `ExportDialog`: holds `ExportOptions`, `working`, `failure`; computes `records` and per-category counts; guards closing while an
  export runs; enforces a 600 ms minimum spinner so the loading state is visible.
- `ExportOptionsForm`: format radio cards, date presets, date inputs, category chips with counts, file-name field with a live
  "will be saved as" hint, the CSV "Excel fix" checkbox.
- `ExportPreview`: record count, total, date span, scope text, file name, and the first 8 rows.

### Libraries
None. PDF is produced by the browser: an HTML report is written into a hidden `<iframe srcdoc>` and `window.print()` is called, so
the user chooses "Save as PDF". This was a deliberate decision: standard PDF fonts cannot draw Hebrew or Cyrillic, which this data
contains. The cost is one extra step and that the file name is only a suggestion from the page title.

### Implementation patterns
- Container / presentational split; options as one typed object updated immutably.
- Derived state with `useMemo` (selection, counts) instead of duplicated state.
- Input validation as a pure function returning a problems object; the UI only renders it.
- `<fieldset disabled>` locks all controls during export; a ref-backed guard stops Escape / backdrop from closing mid-export.

### Complexity assessment
Moderate. About 960 lines, but each file has one job and the logic file is fully unit tested. The riskiest part is the iframe print
path, which cannot be unit tested.

### Error handling
`runExport` is wrapped in try/catch; a failure shows a role="alert" message and re-enables the form. Validation errors (start after
end, no category) disable the Export button with an inline message. A zero-record selection disables export. Print failures
(blocked iframe) show a specific message.

### Security considerations
- Every piece of user text placed in the print HTML goes through `escapeHtml` (tested with `<script>` and a hostile `<title>`).
- File name sanitising: removes characters Windows forbids, strips leading dots, dashes and spaces, blocks reserved device names
  (CON, NUL ...), limits length, avoids a doubled extension.
- CSV formula guard through `csvCell`. The print iframe is same-origin `srcdoc` with escaped content.

### Performance implications
Selection is recomputed only when the date range, categories or data change. The preview renders only 8 rows regardless of size.
Export itself is synchronous string building; the PDF path builds a DOM document, which is heavier for thousands of rows but still
acceptable. Route cost: dashboard 8.66 kB (+5 kB over V1).

### Extensibility and maintainability
Good. Adding a format means one `FORMATS` entry, one serializer and one `case` in `runExport`. Adding a filter means a field in
`ExportOptions`, one line in `selectForExport` and one control. Because logic is pure and separate, it can be reused by another UI.

### Technical deep dive
- **How it works:** the dialog turns options into a selection (inclusive date range, category set, sorted oldest first); the chosen
  serializer produces text; `downloadText` creates the file (BOM only for CSV); PDF goes through the print iframe.
- **File generation:** client side Blob (CSV: comma separated with optional `sep=,`; JSON: pretty printed, amounts as exact cents
  plus a 2-decimal string, with a filters block); PDF: printable HTML.
- **User interaction:** modal with a live preview that updates as options change; one primary action; toast on success.
- **State management:** local `useState` in the dialog; no global store, no persistence (options reset each time).
- **Edge cases handled:** empty selection, reversed dates, no category, reserved or illegal file names, over-long names, a dangling
  hyphen after cleaning, Unicode text, formulas, hostile HTML. **Not handled:** very large exports are not chunked; the PDF file
  name cannot be forced.

---

## V3: the cloud-style Export & Share page

### Files created or modified
42 files (+3,865 / -64). Grouped:
- **Currency** (carried in as its own commit): `lib/currency.ts`, `components/CurrencyProvider.tsx`, `CurrencySelect.tsx`, edits to
  `lib/format.ts`, `Header`, `Charts`, `SummaryCards`, `ExpenseList`, `ExpenseActions`, `ExpenseForm`, `app/expenses/page.tsx`.
- **Logic** `lib/cloud/` (9 modules, about 960 lines): `catalog` (destinations and templates), `templates` (four report builders),
  `schedule` (next-run maths), `share` (link encoding, validation), `health` (data checks), `simulate` (delivery simulation),
  `state` (validates saved data), `types`, `util` (SHA-256, formatting, email check).
- **UI** `components/cloud/` (13 files, about 2,180 lines): `CloudProvider` (435), `ExportTab` (368), `SchedulesTab` (316), `SharesTab`
  (211), `ConnectionsTab`, `HistoryTab`, `SyncStatusBar`, `ConnectModal`, `QRCode`, `ReportTable`, `SharedViewer`, `CloudHub`, `ui`.
- **Routes:** `app/cloud/page.tsx`, `app/shared/page.tsx`. **Wiring:** `app/layout.tsx` (providers), `app/page.tsx` (link).
- **Tests:** `tests/cloud.test.ts` (397 lines), `tests/currency.test.ts` (60).

### Architecture
An application inside the application, with a clear seam between logic and UI:
- **Domain layer** (`lib/cloud`): pure, unit-tested, no React. Four report templates produce a plain table (`Report`), and every
  destination consumes the same table (CSV, share link, preview). This "report as the unit of export" idea is the main architectural
  difference from V1 and V2, which export the raw expense list.
- **State layer** (`CloudProvider`): React context holding connections, schedules, history and shares; persisted to its own
  localStorage key with the same read-first, write-after rule as the expenses; runs the scheduler.
- **View layer**: a tabbed hub (`CloudHub`) with one component per concern.
- **Second entry point** (`/shared`): a read-only viewer that is independent of the provider's data.

### Key components and responsibilities
- `CloudProvider`: connections, schedules, history, shares, `runExport`, `createShare`, the 30-second scheduler with catch-up.
- `ExportTab`: template and destination pickers, live preview with a data-health check, progress steps, result card with fingerprint.
- `SchedulesTab` (with its `ScheduleCard`): create, pause, run now, "simulate being away" (shows catch-up).
- `SharesTab` + `QRCode` + `SharedViewer`: create a link, show a real QR code, open and validate a link.
- `HistoryTab`: filterable list with status, trigger, size and SHA-256 fingerprint; retry for failures.
- `SyncStatusBar`: aggregate status and live progress.

### Libraries
- `qrcode-generator` (MIT, zero dependencies): the only addition, used to draw a real scannable QR code as one SVG path.
- Browser APIs: `CompressionStream` / `DecompressionStream` ("deflate-raw"), `crypto.subtle` (SHA-256), `localStorage`, Blob download.

### Implementation patterns
- Context provider plus refs for "latest value" access from timers; an effect-based scheduler (`setInterval` + immediate check).
- Validation at every trust boundary: saved state is sanitised on read; share links are size-capped and schema-validated on open.
- Simulation behind a narrow interface (`simulate.ts`): steps, a deterministic failure rule (`@fail.example` bounces), and an
  injectable `sleep` so tests do not wait.
- Status as discriminated data (`success | failed | skipped`, trigger `manual | schedule | catch-up`).

### Complexity assessment
High, and mostly essential complexity given the feature list. About 3,900 lines across 42 files, with the single largest unit
(`CloudProvider`) at 435 lines mixing persistence, the scheduler, exporting and sharing. That file is the main maintainability risk.

### Error handling
- Export failures are caught, recorded in History with a message, shown on a result card, and can be retried.
- Saved data that is damaged is dropped entry by entry instead of breaking the app; a storage write failure shows a banner.
- A bad, truncated, oversized, expired or revoked share link produces a specific page (not a crash).
- A QR that cannot fit shows an explanation.

### Security considerations
- The viewer decodes attacker-controlled input. Mitigations: streaming inflate with a 1 MB cap (zip-bomb safe), at most 5,000 rows,
  12 columns, 400 characters per cell, a strict schema check that copies only known fields, and React text nodes only (no
  `innerHTML`). The file name is reduced to `[A-Za-z0-9_.-]`.
- CSV formula guard on every download path.
- By design, share links put the data in the URL fragment: anyone with the link can read it, it cannot be recalled, "revoke" only
  works on the same browser, and expiry is enforced by the viewer page (a courtesy, not security). The UI states this.
- Nothing is sent to any third party; all "cloud" destinations are labelled as simulated.
- A QA review of this branch (done afterwards, fixes are on `main`) found seven real issues, listed below.

### Performance implications
- `/cloud` costs 20.6 kB and only loads on that page. The scheduler wakes every 30 seconds and does a cheap date comparison.
- Share-link encoding and decoding run on the main thread but are capped at 1 MB. A QR for a 500-character link is an 85-module grid
  (about 41,000 characters of SVG path), which is fine.
- Each export builds the full report and a SHA-256 in memory.

### Extensibility and maintainability
- Adding a template: one builder in `templates.ts` plus a catalog entry. Adding a destination: a catalog entry and its steps.
- Making it real means replacing `simulateDelivery` with calls to a server (OAuth, mail, storage APIs). That seam exists, but a real
  version needs a backend, which this app does not have, so V3 as shipped is a demonstration of flows, not an integration.
- Weak spots: the 435-line provider; the browser-only code paths (scheduler, provider) have no component tests; behaviour on
  Safari and Firefox for the compression API is unverified.

### Technical deep dive
- **How it works:** a template builds a `Report` (columns, rows, optional totals row). Export serialises it to CSV, hashes it
  (SHA-256 "fingerprint") and hands it to the destination: a real download, or a simulated multi-step delivery that ends in a History
  entry. Sharing compresses the report as JSON into the link fragment; `/shared` reverses and validates it.
- **File generation:** client side only: CSV Blob (BOM), deflate-raw plus base64url for links, SVG for QR codes.
- **User interaction:** a guided flow (report, destination, details, preview, send) with a stepper, toasts, a result card, a status
  bar and tabs; keyboard support on the tabs.
- **State management:** React context, persisted JSON with schema validation, refs for timers; all exports go through a serial queue
  (added after the review) so two exports never overlap.
- **Edge cases handled:** empty data, reversed or missing schedule inputs, paused or deleted schedules mid-run, disconnected services,
  invalid email, bounce, oversized or hostile links, hostile saved data, daylight-saving and month-end schedule times (days limited to
  1 to 28), a tax year that falls back to the latest year with data.
- **Findings from the QA review (all fixed on `main`):** (1) a link could be created that the viewer then rejected as damaged
  (limits differed); (2) manual and scheduled exports could overlap; (3) an empty scheduled export was logged as delivered; (4) the
  saved-state check used `in`, so names like `constructor` passed; (5) a saved share link was not checked for an http(s) scheme;
  (6) a schedule paused mid-run could still run once; (7) the preview date could go stale. Each now has a test.

---

## Side by side

| Dimension | V1 | V2 | V3 |
| --- | --- | --- | --- |
| Unit of export | the expense list | the expense list, filtered | a report (table), several templates |
| Where state lives | none | one dialog's `useState` | context + persisted JSON |
| New persistence | none | none | cloud settings, history, schedules, shares |
| Formats | CSV | CSV, JSON, PDF (via print) | CSV, plus links and QR codes |
| Filtering | none | date range, categories | per-template scope (tax year etc.) |
| User feedback | none | preview, summary, spinner, toast, errors | stepper, status bar, history, health checks |
| Tests added | 1 | 35 | 47 |
| Biggest strength | simplicity, almost no risk | control with clear structure, no dependencies | rich workflow, safe handling of untrusted input |
| Biggest weakness | no feedback or error handling; Excel regional issue | PDF is a print step; options not remembered | mostly simulated; one large provider; needs a server to be real |

## Are these truly different solution spaces?

Partly. V1 and V2 are the same pipeline (expenses to text to a downloaded file) with V2 adding control and feedback layers: V2 is an
evolution of V1, not a different idea. V3 changes the pipeline itself: the unit of export becomes a report, there is state and a
lifecycle (schedules, history, links), and it introduces a second entry point (`/shared`). So the set explores two distinct spaces
(direct export vs. report-and-workflow) with three levels of ambition, rather than three unrelated architectures.

## Assessment and ways to combine them

1. Keep V1's idea as the fast path: a one-click export is what most people need most of the time (and it shipped as the base of
   V3's "This device" download).
2. Take V2's controls (date range, categories, file name, preview) as the options step of V3's export flow. V2's `lib/export.ts` is
   pure and reusable; its JSON and CSV serializers already carry exact cents.
3. Take V3's report templates and share links; they add the most distinctive value for a no-backend app (a tax report, a
   no-server share link).
4. Do not ship V3's simulated destinations as if they were real. They are useful as a product mock-up; a real version needs a server.
5. Fix the Excel issue once, in the shared CSV function (an "Excel fix" option exists in V2; V1 has the fix on a side branch).
6. Split `CloudProvider` into persistence, scheduler and share actions before adding more features.

## Open questions and limits of this analysis

- Execution paths that need a real browser (print window, scheduler timing over hours, Safari / Firefox) were not measured.
- Bundle sizes are from Next.js build output, not from real network timing.
- "Complexity" and "maintainability" are judgements, based on line counts, file structure and the number of moving parts.
