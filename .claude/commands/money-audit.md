---
description: Check the code against this project's money, date and storage rules and list every violation
argument-hint: [optional: a folder or file to limit the check, default is the whole project]
---

# Money and data rules audit (read only)

Scope: **$ARGUMENTS** (if empty, check `app/`, `components/` and `lib/`).

## Step 1: read the rules

Read `CLAUDE.md`, section "Decisions". The rules to check are: money is whole cents and is shown only through the currency
formatter; dates are `YYYY-MM-DD` strings in local time; CSV text starting with `= + - @` is made safe; localStorage is read in
an effect and nothing is written before the first successful read.

## Step 2: search for each rule with Grep

Look for: decimal or float maths on amounts, hand-written `toFixed`/`$` formatting outside the formatter, `new Date("YYYY-MM-DD")`
or `toISOString()` used for a calendar date, CSV code that skips the formula guard, storage written before it was read.

## Step 3: report (do not change any file)

A table: file and line, rule broken, what the code does, severity (High/Medium/Low), suggested fix in one sentence.
Read the surrounding code before you call something a violation. If a case is only a possible problem, say "possible".
End with the list of rules where you found nothing, and anything you could not check.
