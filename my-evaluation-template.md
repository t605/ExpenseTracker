# My evaluation template (Best-of-N and any "compare these versions" task)

Owner: Michael. Use this whenever Claude builds or compares several implementations of one feature.
Read it fully, apply it, and follow the process rules at the end. Where a project's own CLAUDE.md says something
different, the project's file wins.

## How to use it

Say, at the start of a Best-of-N task or a comparison:

```
Read D:\Michael\AI\_Shared\my-evaluation-template.md and apply it to these versions: <branches or folders>.
Fill in the "Facts for this project" block first. Produce the report in the format at the end.
```

## Facts for this project (fill in before judging; ask me if you cannot find them)

- What it is and who uses it: ...
- Environment I run it in (OS, browser, Excel and its regional settings, tools): ...
- Data it handles (languages such as Hebrew and Russian, units, formats, size): ...
- Hard rules from the project (CLAUDE.md decisions that must not be "corrected"): ...
- Will it be public? (If yes, run the Publishing check below.) ...
- Baseline (branch or commit all versions start from): ...

## Scoring

Score each version 1 to 5 per criterion. Every score needs one line of EVIDENCE (a measurement, a test result, a file and
line, or "not tested"). No evidence means no score. Weights are mine and can be changed per project.

| # | Criterion | Weight | What to check |
| --- | --- | --- | --- |
| 1 | Works in the real environment | 5 | Run it in a real browser with my real kind of data (Hebrew and Russian text, quotes, a value starting with `=`, empty data, a big list). Open exported files in the program I actually use. |
| 2 | Correctness and edge cases | 5 | Money as whole cents, dates as local strings, empty and hostile input, boundaries (exactly at the limit and one over), time zones and daylight saving. |
| 3 | Security and privacy | 5 | Untrusted input (links, files, saved data), injection (HTML, formulas, file names), size limits, what leaves the device, secrets, anything that would be unsafe if the project were public. |
| 4 | Honesty of the interface | 4 | Anything simulated is labelled as simulated. Limits are stated (cannot be recalled, runs only while open). No claim the code cannot back up. |
| 5 | Error handling and recovery | 4 | Failure shows a plain-language message, nothing is lost, the user can retry, damaged saved data cannot break the app, long actions cannot be interrupted into a bad state. |
| 6 | Tests | 4 | Count and quality. Do they test behaviour or only repeat the code? What important path has no test? Say what is untested. |
| 7 | Simplicity and maintainability | 4 | Lines, files, moving parts, new dependencies, one job per file, matches the existing code style. Is the biggest file doing too much? |
| 8 | Performance and footprint | 3 | Measure bundle size per route (not guesses), main-thread work, behaviour with large data. |
| 9 | Accessibility and phone use | 3 | Works at 375 px wide, keyboard use, labels, focus handling in dialogs, no colour-only meaning. |
| 10 | Reversibility and risk | 3 | Cost of changing direction later, lock-in, what is hard to undo, what new thing must be maintained forever. |
| 11 | Fit for the audience | 3 | Plain language for the real users, documentation matches behaviour, install and run steps work. |
| 12 | Respects project rules | 2 | Follows the project's CLAUDE.md decisions instead of "correcting" them. |

Weighted score = sum of (score x weight). Show it, but do not let it decide alone.

## Decision rules

- **Knockouts:** a version that can lose or leak data, executes untrusted input, or misleads the user about what it does is not
  recommended as-is, whatever its total. Say what it would take to fix it.
- **Tie-breaker:** the simpler version wins.
- **Prefer combining.** Say which parts of which version to keep, and in what order to merge them.
- **Different or just bigger?** State whether the versions are truly different ideas or the same idea at larger scale.

## Publishing check (only if the result may become public)

1. Is the work an assignment or course project? If so, read the course's honor code and the assignment text. Sharing solutions is often
   forbidden unless the instructor allows it. Do not publish before it is clear. Keep the instructor's permission in writing.
2. Audit what would be visible: commit author email (use the noreply address), keys and tokens, `.env` files, personal logo or photos,
   absolute paths, private names.
3. Licence: add one only after step 1 is settled. Check dependency and font licences.
4. Never push, publish or change repository settings for me. Prepare, test, and tell me what to click.

## Process rules (how Claude works while evaluating)

- **Measure, do not guess.** Use `git diff --stat` against the baseline, a clean install per version, then run tests, lint, typecheck and
  build in each, and record the real bundle sizes. Verify every count against the source before writing it down.
- **Do not switch my working branch.** Read other branches with git, or use temporary worktrees, and remove them afterwards.
- **Test in a real browser** with real data, on the production build, and check phone width.
- **Separate facts from assumptions.** Label each. Challenge the assumptions behind a version, not only its code.
- **Say what was NOT tested.** End every report with a list of what was not checked (other browsers, screen reader, real services).
- **Run a read-only QA reviewer agent** on the winning version before any push, and fix real findings with a test for each.
- **Explain in detail, in plain words.** Give a recommendation, not a survey.
- **Ask before anything hard to reverse** (deleting, moving, publishing, pushing).

## Report format

1. **Summary table:** versions in columns, criteria in rows, score plus one line of evidence per cell.
2. **Measured numbers:** files, lines, new dependencies, tests, bundle size per route.
3. **Per version:** what it is, strengths, weaknesses, risks, what was not tested.
4. **Recommendation:** adopt, combine, or reject, with the merge order and what must be fixed first.
5. **Open questions for me**, then **what was not checked.**
6. **Publish the finished report as an Artifact** (a private page on claude.ai). Do this at the end of EVERY assignment or comparison.
   Use the Artifact tool, starting with `action: "quickstart"`, and follow its page rules. Put in: the goal, the versions, the measured
   numbers, the verdict, what was not tested, and links to the repo and live site if they are public. Leave out email addresses,
   private data and anything not already public. Give me the link and say that only I can open it until I share it.
7. If the project is finished: write "the best prompt" (what I could have said at the start to reach this result in the fewest
   rounds) and the 3 to 6 detours that cost the most rounds, each with the one sentence that would have prevented it.
