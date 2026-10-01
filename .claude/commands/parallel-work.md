---
description: Set up Git worktrees so several features can be built in parallel without conflicts
argument-hint: <feature one>, <feature two>, ... (or a sentence describing the work to split)
---

# Parallel work with Git worktrees

Work to do in parallel: **$ARGUMENTS**

Set up one isolated worktree per feature. Create nothing until the plan in Step 2 is confirmed. This command only sets things up:
it never pushes, never deletes anything, and never changes a remote.

## Step 0: preflight (stop and ask if any check fails)

1. Read this project's `CLAUDE.md` for the git program to use (git may not be on PATH), the install, test and run commands, and any
   rules. Its decisions win over this file.
2. Identify the repo folder name, the current branch (the BASE the features start from) and whether the working tree is clean
   (`git status --short` must print nothing). If it is not clean, stop and tell me what is uncommitted.
3. Run `git worktree list` and `git branch --list "feature/*"`. If a folder or a branch you would create already exists, stop and ask.
   Never overwrite, move or delete one.
4. If `$ARGUMENTS` is empty, ask what to build.

## Step 1: divide the work (unless it is already clearly divided)

1. Turn the request into separate features. Give each a short lower-case slug of letters, digits and hyphens (for example `export`).
2. Read the code and list, per feature, the files and folders it will most likely create or change.
3. Find the shared hotspots: files two or more features will want to change (layouts, routers, headers, shared types, config,
   `package.json`). Decide which ONE feature owns each hotspot and how the others will avoid editing it (for example by adding a new
   file instead). Say plainly if the features overlap so much that parallel work is a bad idea.

## Step 2: show me the plan, then wait

Show a table: feature, slug, branch `feature/<slug>`, worktree path, files it owns, hotspots it must not touch, dev-server port.
Default worktree path: `../_worktrees/<repo-folder>-<slug>` (a separate folder, so worktrees are not mistaken for projects).
Default ports: the project's normal port + 1, +2, ... Wait for my yes before creating anything.

## Step 3: create the worktrees

For each feature, from the BASE branch:

```
git worktree add <path> -b feature/<slug> <base>
```

One command per feature. Never use `--force`. Do not check out the same branch in two worktrees.

## Step 4: prepare each worktree

1. Install dependencies inside the worktree with the project's exact install command (`npm ci` for a lockfile project). Do NOT link or
   copy `node_modules` from the main folder: it breaks builds.
2. Untracked files (such as `.env.local`) are not in a new worktree. List which ones the main folder has and ask me; never copy secrets
   yourself.
3. Confirm project tooling committed inside `.claude/` (hooks, commands) is present, and that anything it needs (for example a local
   formatter) is installed in the worktree.
4. In each worktree run the project's tests once, to prove the starting point is green. Report the result.

## Step 5: confirm and explain

1. Run `git worktree list` and show it.
2. In each worktree show `git branch --show-current` and `git status --short`.
3. Explain, per worktree: path, branch, purpose, the files it owns, its port, and what is isolated (its own files, branch and
   staging area) versus shared (one `.git`: the same history, branches and remote). Say that a commit in one is visible from the others.
4. Give working rules: one Claude session per worktree, started inside that folder; commit often; do not switch branches inside a
   worktree; each dev server needs its own port; stay out of the hotspot files you do not own; never push.
5. Finish with a ready-to-paste start prompt for each worktree session, and remind me that `/integrate-parallel-work <slug> <slug>`
   merges the features back, from the main folder, after the other Claude sessions are closed.

## Rules for this command

Ask before anything hard to reverse. Never push. Never delete a branch, folder or worktree. Report what you did NOT test.
