---
description: Write a manual test plan with edge cases for a feature, using the real screen labels
argument-hint: <feature name> [optional: where it lives]
---

# Manual test plan

Feature: **$ARGUMENTS**. If it is empty, stop and ask which feature. Do not guess.

## Step 1: understand the feature (no guessing)

Read `CLAUDE.md` and the code of this feature (Grep for its names and on-screen labels). Expected results must come from what the
code really does, not from what you think it should do. If code and common sense disagree, list it as a possible bug.

## Step 2: write the plan -> `docs/qa/<feature-slug>-test-plan.md`

A table with columns: ID, Priority, Steps (one action each, using the exact button and field names), Test data, Expected result.
Cover: the normal path; empty state; each validation rule at, just below and just above its limit (for example 0.01, 0, 999999999.99,
1000000000); a description with quotes, a comma, Hebrew text and `=SUM(1+1)`; 29 Feb and the 31 Dec / 1 Jan boundary; a phone-width
screen; reload and cleared browser storage.

## Step 3: finish

Do not run the app and do not change any code. Add a section "Not verified" listing every expected result you could not confirm from
the code. Report the file path, the number of cases per priority, and any possible bugs you noticed.
