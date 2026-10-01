EXPENSE TRACKER - version 1.0
================================

A personal expense tracker. You add what you spend, and it shows you where the
money goes. Built with Next.js 14 (App Router), TypeScript and Tailwind CSS.
It was made as the first assignment of the course "Claude Code: Software
Engineering with Generative AI Agents".

CONTENTS
  1. What it does
  2. What you need
  3. Running it
  4. Testing every feature by hand
  5. Automated checks
  6. Where your data is kept
  7. Troubleshooting
  8. What it cannot do
  9. Files in this project


1. WHAT IT DOES
---------------
- Add an expense: date, amount, category, description (with checks on every field).
- Edit or delete any expense (delete asks you to confirm).
- Categories: Food, Transportation, Entertainment, Shopping, Bills, Other.
- Expenses page: search, filter by category and date range, sort, and export
  the list you are looking at to a CSV file.
- Dashboard: total spending, spending this month (and change versus last
  month), average expense, top category, a chart of spending by category and a
  chart of the last six months.
- Works on a phone-sized screen as well as a desktop.


2. WHAT YOU NEED
----------------
- Node.js 18.17 or newer (this was built with Node 24). Check with:  node -v
- A modern browser (Chrome, Edge, Firefox, Safari).
- An internet connection only for the first "npm install".


3. RUNNING IT
-------------
Open a terminal in this folder, then:

  npm install        (first time only)
  npm run dev        starts the app at http://localhost:3000

If port 3000 is busy, use another one:  npm run dev -- -p 3123

For a faster, production-style run:

  npm run build
  npm run start


4. TESTING EVERY FEATURE BY HAND
--------------------------------
Start with an empty app (see "Where your data is kept" to reset it).

 a) Empty state
    The Dashboard shows a welcome message and an "Add your first expense" button.

 b) Validation
    Click "+ Add expense" and press "Add expense" with everything empty.
    You should see an error under Amount, Category and Description (the date is
    pre-filled with today). Try an amount of "abc", "-5" or "1.234": each should
    be refused with a message.

 c) Add
    Enter 12.50, Food, "Lunch with Dana". A green "Expense added" message
    appears and the Dashboard fills in.

 d) Edit
    Expenses page -> Edit on a row -> change the amount -> "Save changes".
    The row and the totals update.

 e) Delete
    Delete on a row -> a confirmation window shows the expense -> Delete.
    Cancel (or Esc) leaves it alone.

 f) Filters and search
    Add expenses in different categories and months. Then try: the Category
    list, the From / To dates, the search box, and the Sort list. The line
    "Showing X of Y - total ..." follows your filters. "Clear all filters"
    resets them. A From date later than the To date shows a warning.

 g) CSV export
    Click "Export CSV". A file named expenses-YYYY-MM-DD.csv downloads and holds
    exactly the rows you are looking at (filters apply). Open it in Excel or
    Notepad. A description that starts with = + - or @ is saved with a leading
    apostrophe so a spreadsheet cannot run it as a formula.

 g2) Currency
    The box in the top bar offers shekel, dollar and euro. It changes only the
    symbol shown everywhere; amounts are NOT converted. It is remembered.

 g3) Cloud page (menu "Cloud") - a DEMO: nothing leaves this computer
    Export tab:  choose a report (Full data, Tax report, Monthly summary,
      Category analysis) and a destination. "This device" really downloads a
      CSV. Email, Google Sheets, Google Drive, Dropbox and OneDrive are
      simulated: progress is shown and the result is stored in History, but no
      email is sent and no service is contacted. The preview shows the real
      numbers and a data check (duplicates, future dates...). Try the address
      bounce@fail.example to see a failed delivery, then "Retry" in History.
    Connections: "Connect" shows a pretend consent screen (no password).
    Schedules:   daily / weekly / monthly. They run while the app is open and
      are made up when you open it again ("catch-up"). "Simulate being away"
      demonstrates this. A web page cannot run while it is closed.
    Share links: the report is packed into the link (nothing is uploaded).
      Anyone with the link can read it; it cannot be recalled (Revoke works on
      this browser only). A QR code is shown. Opening the link shows the
      report on the /shared page. The link only works where the app is
      reachable: on this computer it opens here only.
    History:     every export with time, status, size and a SHA-256 fingerprint.

 h) Dashboard
    Check that "Spent in <month>" and the 6-month bars match what you entered,
    and that the category percentages add up to 100%.

 i) Persistence
    Reload the page, or close and reopen the browser: the expenses are still there.

 j) Phone layout
    Make the browser window narrow (about 375 px wide). Nothing should scroll
    sideways, and the Add / Edit window should fill the bottom of the screen.


5. AUTOMATED CHECKS
-------------------
  npm run test        18 unit tests: money, dates, validation, filters,
                      statistics, CSV, damaged-data handling
  npm run typecheck   TypeScript
  npm run lint        ESLint
  npm run build       production build

The tests cover the logic only. The screens (forms, dialogs, charts) are not
covered by automated tests: use section 4.


6. WHERE YOUR DATA IS KEPT
--------------------------
In your browser's localStorage, under the key  expense-tracker:v1.
There is no server and no account. Amounts are stored as whole cents so totals
never show rounding errors (no 0.1 + 0.2 problem).

To start fresh: in the browser developer tools (F12) -> Application ->
Local Storage -> delete the key  expense-tracker:v1  and reload.


7. TROUBLESHOOTING
------------------
- "npm is not recognized": install Node.js from nodejs.org and open a new terminal.
- "Port 3000 is in use": run  npm run dev -- -p 3123
- A red bar says expenses cannot be read or saved: the browser is blocking or
  has filled its storage (private windows sometimes do this). Use a normal
  window, or clear the key shown in section 6.
- My expenses vanished: localStorage belongs to one browser, one profile and
  one address. http://localhost:3000 and http://localhost:3123 are different
  places, and so are Chrome and Edge.


8. WHAT IT CANNOT DO
--------------------
- Keep data safe. localStorage is not a backup: clearing browser data deletes
  everything. Export a CSV now and then. There is no CSV import yet.
- Sync between devices or browsers, or have several users.
- Handle currencies other than US dollars (the symbol is fixed to $).
- Recurring expenses, budgets, receipts or bank import.
- Undo a delete.
So it is a good demo and a usable personal tool on one computer, but it is not
"production ready" for real financial records.


9. FILES IN THIS PROJECT
------------------------
  app\                  pages and layout (Dashboard, Expenses)
  components\           screens and parts (form, dialogs, charts, filters, ...)
  lib\                  the logic: types, money and dates, validation, filters,
                        statistics, CSV, storage
  tests\                unit tests
  package.json          scripts and dependencies
  README.txt            this file
