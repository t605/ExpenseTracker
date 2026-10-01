---
description: Safely merge features built in parallel worktrees into an integration branch, test them together, then ask before merging to main
argument-hint: <feature slug> <feature slug> ... (the names after feature/)
---

# Integrate parallel work

Features to integrate: **$ARGUMENTS** (branches `feature/<slug>`)

Integrate on a separate branch first. Stop after the integration branch is green and ASK before touching the main line. This
command never pushes.

## Step 0: preflight (stop and ask if any check fails)

1. Read this project's `CLAUDE.md` for the git program, the commands that run tests, typecheck, lint and build, and any rules.
2. I must be in the MAIN project folder, on the BASE branch the features were created from. Show the current branch and ask me to
   confirm it is the base.
3. The main folder must be clean (`git status --short` prints nothing). Every feature worktree must be clean and committed:
   `git worktree list`, then `git -C <path> status --short` for each. Any uncommitted work or a running Claude session in a
   worktree: stop and tell me.
4. Every `feature/<slug>` branch must exist. If `$ARGUMENTS` is empty, ask.
5. Write down the base commit hash now (`git rev-parse HEAD`): it is the way back if anything goes wrong.

## Step 1: predict conflicts

For each feature list the files it changed against the base (`git diff --name-only <base>...feature/<slug>`). Show the files changed by
two or more features: those are where textual conflicts will happen. Also name files that do not overlap but depend on each other
(a shared type, a layout that renders both features): those can break without any conflict. Show this before merging anything.

## Step 2: build the integration branch

1. `git switch -c integration/parallel-features <base>` (if that name exists, stop and ask).
2. Merge the features ONE AT A TIME, in the order given, each with `git merge --no-ff feature/<slug>` and a clear message.
3. After EACH merge run typecheck and the tests, so a break is traced to the merge that caused it. Do not merge the next feature
   until the previous one is green.

## Step 3: conflicts (never resolve blindly)

When a merge stops with conflicts:

1. List every conflicted file. For each, summarise what each side wanted in plain words.
2. Trivial conflicts (both sides added imports or lines next to each other, formatting): resolve and say what you kept.
3. Anything that changes behaviour (the same function, state, route or UI changed on both sides): propose a resolution that keeps BOTH
   features working, and wait for my approval before applying it.
4. Never use `-X ours`, `-X theirs`, or `git checkout --ours/--theirs` on whole files. Never drop one side to make it pass.
5. After resolving: search the files for leftover markers (`<<<<<<<`, `=======`, `>>>>>>>`), `git add` the files, and finish the merge.
6. If it goes wrong, `git merge --abort` returns to the state before that merge. Use it and tell me.

## Step 4: prove the features work together

1. Run the project's full checks: tests, typecheck, lint and production build. Report real numbers (tests passed, build result).
2. Passing tests are not enough. Start the production build and check in a real browser, with realistic data, the screens that both
   features touch (the shared hotspots from Step 1), and that each feature still does its job. Report what you saw.
3. Offer to run the read-only `qa-reviewer` agent on the integration diff (`git diff <base>..integration/parallel-features`).
4. List what you did NOT test.

## Step 5: STOP and report

Show: the merge order, the conflicts and how each was resolved, the check results, and what was not tested. Then ASK. Do not merge
into the base branch, delete anything, or push until I say yes to each of those separately.

## Step 6: only after I say yes

1. On the base branch: `git merge --no-ff integration/parallel-features`, then run the full checks again.
2. Clean up in this order: for each feature `git worktree remove <path>`, then `git branch -d feature/<slug>` (the safe delete:
   if it refuses, stop and tell me, never use `-D`), then `git branch -d integration/parallel-features`, then `git worktree prune`.
3. Show `git status --short`, `git worktree list` and `git log --oneline --graph -10`.
4. Do not push. Tell me to push (GitHub Desktop, or the push command) when I am ready, and say if pushing the base branch triggers
   a deploy in this project (see `CLAUDE.md`). Give me the base commit hash from Step 0 as the way back.

## Rules for this command

Ask before anything hard to reverse. Never push. Never force anything. Never delete a branch or worktree that is not merged.
