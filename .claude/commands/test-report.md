---
description: Run all checks, write a prioritised test report as CSV, then stop and wait for my approval
argument-hint: [optional: a note for the report, e.g. the branch or feature name]
---

# Test report (quality gate)

Note for the report: **$ARGUMENTS**

## Step 1: run the checks (do not change any code)

Run these in order and record the real result of each: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.
For `npm run test`, list every individual test, not only the total. If a command cannot run, say so. Never guess a result.

## Step 2: write the report -> `reports/test-report-<YYYY-MM-DD>.csv`

Columns: Priority, Area, Check, Result (PASS/FAIL/NOT RUN), Details.
Priority: High = money, dates, saved data, CSV export. Medium = validation, filters, charts. Low = look and wording.
Sort High to Low, and put FAIL rows first inside each priority.

## Step 3: stop

Show me a short summary (counts of PASS / FAIL / NOT RUN, and the High-priority failures by name).
Then STOP and wait until I write "approved". Do not fix, commit or continue before that.
Never edit, skip or delete a test to make it pass.
