# Fix: Keep list score when summary score is unusable

**Type:** Fix
**Status:** verified
**Branch:** fix/keep-list-score-when-summary-score-is-unusable
**Fixes:** F-02

## The problem

`normalizeSummary` in [espn.ts](../../src/api/espn.ts) (lines 226-232) applies a
valid summary status, then deletes the score whenever the summary's competitor
scores can't be parsed, including for `live`, `halftime`, and `finished`. The
feature 2 contract says the list's values are kept when the summary's are
missing or invalid. For example, a match listed as `Live 1–0` whose summary has
a live status but no usable scores opens with the kickoff time where `1–0`
should be. Real ESPN summaries have always carried scores so far, so this is
unlikely, and no test covers it.

## The fix

When the summary gives a usable score, use it (unchanged). When it doesn't:

- For statuses that have a score (`live`, `halftime`, `finished`), keep the
  list match's score if it has one.
- For statuses without a score (`upcoming`, `postponed`, `cancelled`), remove
  the score, as today. `Match.score` is only set for live, halftime, and
  finished.

Must not change: the status mapping, event handling, the scoreboard path, or
the "header unusable, keep everything" case. No new helpers, files, or
dependencies.

## Build steps

- [x] **1. Keep the list score on an unusable summary score.** Adjust the score
  branch at the end of `normalizeSummary` and add cases to the "takes status and
  score from the header" test in `src/api/espn.test.ts`:
  - A list match `Live 1–0` plus a live header with missing or malformed scores
    stays `live` with `{ home: 1, away: 0 }`.
  - The same with a halftime header gives `halftime` with `{ home: 1, away: 0 }`.
  - A list match with a score plus a postponed header still loses its score.
    This case already exists; keep it.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. The new
  live and halftime cases fail without the code change and pass with it.

## Verify

- Automated: `npm test` (the new `normalizeSummary` cases), `npm run build`,
  `npm run lint`.
- No manual popup check is needed: real ESPN summaries haven't hit this path,
  and the unit cases cover it directly.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2233,"specSha256":"7c90c8b22580c8fea12d4d564262fb4b32b29cbd3ceda8e737a3c0a2da5c8496","branch":"refs/heads/fix/keep-list-score-when-summary-score-is-unusable","head":"4567a1726c055910758a34aae0d10426f87c800a","baseRef":"refs/heads/main","baseCommit":"4567a1726c055910758a34aae0d10426f87c800a","sourceTree":"0c2b77233cf76e96de4a9ca06a086841be2e4840","absentOptional":[]} -->
