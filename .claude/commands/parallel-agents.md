---
description: Build features in parallel with Git worktrees and one subagent per feature (ExpenseTracker), then verify and summarise
argument-hint: <slug>: <what it should do>; <slug>: <what it should do> (at most 3 features)
---

# Parallel features with worktrees and subagents (ExpenseTracker)

Features to build in parallel: **$ARGUMENTS**

## Fixed facts for this project (use these exact values, do not guess)

- MAIN_REPO: `D:\Michael\AI\Work In Progress\ExpenseTracker` (the folder that contains `.git`). Run EVERY git command with
  `git -C "<path>"` or full absolute paths, so it works wherever this session was started and whatever the current folder is.
- Git is not on PATH. Use `C:\Users\Victoria\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd\git.exe` (check that the
  folder exists; the version number changes with GitHub Desktop updates).
- BASE branch: the branch checked out in MAIN_REPO now (show it and ask me to confirm it).
- Worktree for feature `<slug>`: `D:\Michael\AI\Work In Progress\_worktrees\ExpenseTracker-<slug>`, branch `feature/<slug>`.
- Reports: `D:\Michael\AI\Work In Progress\_worktrees\_reports\<slug>.work.txt` (outside the repo on purpose, so a report can never be
  committed or published by accident).
- Checks, in each worktree: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`. Install with `npm ci`.
- Read MAIN_REPO's `CLAUDE.md`. Its decisions (Next.js 14 pinned, money in whole cents, local-date strings, no chart library, no dark
  mode, simulated features labelled as simulated ...) bind every subagent. Tell each subagent to read it first.

## Phase 0: preflight and plan (STOP for my yes before creating anything)

1. If `$ARGUMENTS` is empty or lists more than 3 features, ask me. Subagents are expensive: each can use a large part of my usage limit.
2. Check MAIN_REPO is clean (`git status --short` prints nothing), the BASE branch, `git worktree list`, and that none of the worktree
   folders or `feature/<slug>` branches exist. If one does, stop and ask. Never overwrite or delete.
3. Read the code and divide the work: per feature the files it owns, and the shared hotspot files (for example `app/layout.tsx`,
   `app/page.tsx`, `components/Header.tsx`, `lib/types.ts`, `package.json`). Each hotspot has ONE owner; the others add new files
   instead of editing it. If the features overlap too much, say parallel work is a bad idea and stop.
4. Show a table: feature, slug, branch, worktree path, owned files, hotspots it must not edit, what "done" means. Wait for my yes.

## Phase 1: set up the worktrees (after my yes)

For each feature, from BASE: `git -C "<MAIN_REPO>" worktree add "<path>" -b feature/<slug> <BASE>`, then `npm ci` inside it (never link
or copy `node_modules`, never copy `.env*` files). Run the four checks once inside each worktree to prove the start is green. Create the
`_reports` folder if needed. Show `git worktree list`.

## Phase 2: spawn the subagents (all in ONE step, so they run in parallel)

Start one general-purpose subagent per feature, in a single message. Each gets a complete, self-contained prompt, because it cannot see
this conversation. The prompt must contain:

- The absolute worktree path. "Work ONLY inside this folder. Use absolute paths and `git -C`. Never touch MAIN_REPO or another worktree,
  except to write your report file."
- The feature description from me, its owned files, and the hotspots it must not edit.
- "First read CLAUDE.md in your worktree and follow its decisions. Match the surrounding code style."
- Implement the feature completely, with error handling and tests (the project uses vitest in `tests/`). Add no dependency without
  listing it and giving a reason.
- "Run `npm run test`, `typecheck`, `lint` and `build`. Do NOT start the app or any dev server (no `npm run dev`, no `npm start`)."
- Commit your work on your branch in small, clear commits (never use double quotes inside a commit message). Do NOT push, merge,
  rebase, switch branches, or delete anything.
- When finished write the report at the `.work.txt` path above with: what was implemented, files created and changed, dependencies added,
  how it was tested and the real check results, commit hashes, hotspot files touched (should be none), integration notes (what could
  conflict with the other features), and what was NOT tested.
- "If you are blocked or something is unclear, stop and say so in the report. Do not guess and do not work outside your folder."

## Phase 3: verify, do not just trust

Wait for all subagents. Then, yourself, for each worktree: `git status --short` (must be clean), `git log --oneline <BASE>..HEAD`,
and run the four checks again. Confirm each report file exists. Compare each report with the real diff
(`git diff --stat <BASE>..feature/<slug>`): note anything the report claims that the diff does not show, and any change to a hotspot.
If a subagent failed, say so and why. Do not silently retry and do not fix its code unless I ask.

## Phase 4: final summary

Read all reports. Give me: per feature the status (done, partly done, failed), files, tests (real numbers), dependencies added, hotspot
touches, risks and what was not tested; an overlap table of files changed by two or more features; and the next step:
`/integrate-parallel-work <slug> <slug>`, run from MAIN_REPO after these worktree sessions are closed. Do not integrate, merge, push or
delete anything in this command. Worktrees and branches stay until integration.

## Rules

Ask before anything hard to reverse. Never push. Never use force flags. Report what was not tested. Keep every path absolute.
