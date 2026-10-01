---
description: Write developer documentation and a user guide for a feature that already exists in this project
argument-hint: <feature name> [optional hint: where it lives, or who the guide is for]
---

# Document a feature

Feature to document: **$ARGUMENTS**

You write two documents about this ONE feature: a technical document for developers and a simple guide for end users.
Both must describe what the code really does today. Documentation that invents behaviour is worse than none.

## Step 0: read the rules first

1. Read this project's `CLAUDE.md`. Its decisions are deliberate: describe them, never "correct" them. Note the files list.
2. If `$ARGUMENTS` is empty, stop and ask which feature to document. Do not guess.
3. Make a slug from the feature name: lower case, words joined by hyphens, ASCII only (for example `share-links`).

## Step 1: find the feature in the code (do not guess)

1. Search with Grep and Glob for the feature's words in file names, component names, exported functions, UI labels and tests.
2. Read the git history that touches those files. Git is not on PATH here: use the GitHub Desktop `git.exe` named in `CLAUDE.md`
   (read-only commands only: `log`, `show`, `diff`).
3. Read every file that belongs to the feature completely: logic, components, routes, tests, config. Follow imports one level out.
4. If the name matches several features or nothing, list the candidates with file paths and ask me to choose. Do not pick one silently.

## Step 2: write the developer document -> `docs/dev/<slug>.md`

Audience: a developer who has never seen this code. Use these sections, in this order, and skip none (write "None" when empty):

1. **Overview**: what the feature does and why it exists, in 3 to 5 sentences.
2. **Files**: a table of every file (path, one-line job). Mark new versus changed when git shows it.
3. **How it works**: the data flow from user action to result, step by step, naming the real functions and components.
4. **Public API**: each exported function, type and component with its real signature, what it returns, and what it throws.
5. **State and storage**: React state, context, localStorage keys, URL parts. Say what is read when and what is written when.
6. **Dependencies**: libraries and browser APIs, with why each is used.
7. **Security and privacy**: untrusted input, limits, what leaves the device, what is validated. State the known weak spots honestly.
8. **Errors and edge cases**: what happens on bad input, empty data, failures. Point to the code that handles each.
9. **Tests**: test files, what they cover, what is NOT covered, and the command to run them.
10. **Extending it**: the exact steps to add the usual next thing (a new option, format, destination...).
11. **Known limits**: what it cannot do, and anything simulated or planned.
12. **History**: the commits that built it (short hash and subject).

Keep short code excerpts to what explains the point (under 15 lines each). Use real names only.

## Step 3: write the user guide -> `docs/user/<slug>.md`

Audience: a person who uses the app, not a developer. Plain words, short sentences, no code, no internal names.

1. **What it is** (2 or 3 sentences) and **when to use it**.
2. **What you need** (data, a browser, anything to set up first).
3. **Step by step**: numbered steps. Each step is ONE action, then what the person sees next. Use the exact button, tab and
   field names that appear on screen (copy them from the components) in **bold**.
4. After each main step, a screenshot placeholder in exactly this form, with a descriptive alt text:

   ```
   ![Screenshot 1: the Export tab with Tax report selected](../images/<slug>-1.png)
   *Screenshot to add: <what must be visible, what to click first>*
   ```
5. **Tips**: 3 to 5 short practical hints.
6. **Troubleshooting**: a table of problem, likely cause, what to do. Use only problems the code can really produce
   (its real error messages).
7. **What it cannot do**: honest limits, including anything that is a demo or simulated, in plain words.
8. **Privacy**: where the person's data goes (or that it never leaves the device).

## Step 4: index and style

- Create or update `docs/README.md` with one line per feature, linking both documents. Never remove other lines.
- Write in English, in the same plain style as this project's `README.md`. Write dates as `1 Oct 2026`.
- If a document already exists, do NOT overwrite it: read it, change only what is out of date, and say what you changed.
- Do not change any code, test, or config file. Write only under `docs/`.
- Never put real user data, emails, keys or personal details in the documents.

## Step 5: check your own work before you finish

1. For every file path, function, type and UI label you wrote, confirm it exists with Grep. Fix or remove anything that does not.
2. Quote a test count or a size only if you measured it just now (run `npm run test` if you cite tests). Otherwise leave it out.
3. Anything you could not verify goes into a section at the end of the developer document called **Not verified**.

## Final message to me

Report in plain language: the two files written (with paths), the number of names and labels you verified, the list of
screenshots I still have to take (number and what each must show), anything under "Not verified", and any behaviour you
found that looks like a bug. Do not claim the documents are complete beyond what you checked.
