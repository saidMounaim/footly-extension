# Feature: Match Countdown

**From build-plan:** feature 7
**Build attempt:** 1
**Branch:** feature/match-countdown
**Status:** verified

## Goal

Show how long until upcoming matches kick off, and switch them to live
information automatically when they start while the popup is open.
- List rows for matches kicking off within the next hour show "in 23 min"
  instead of the kickoff time.
- The match detail view shows a ticking countdown for any upcoming match:
  "Kicks off in 2h 14m 05s".
- Once kickoff has passed but ESPN still reports the match as upcoming, it shows
  "Starting".
- Shortly after kickoff, Footly refetches that data once and retries twice more,
  so the match turns into its Live pill without the user pressing anything.

Decided 2026-10-04: the countdown appears on "soon" rows and in the detail view;
at kickoff Footly refetches about 1 minute after, retries at +3 and +5 minutes,
then stops. General state-based refresh stays in feature 11.

## In scope

- **Row countdown** (Upcoming tab and "Your teams" / "Your competitions" groups):
  - Kickoff more than 60 minutes away: kickoff time, as today.
  - Kickoff 1 to 60 minutes away: "in N min", where N is the minutes remaining
    rounded up (so 30 seconds left shows "in 1 min").
  - Kickoff now or past, status still `upcoming`: "Starting".
  - The visible text stays inside the existing `<time dateTime>` element, and
    the row's accessible name uses the same text ("Arsenal vs Chelsea, in 23
    min").
  - Rows update every 30 seconds while the list is shown.
- **Detail countdown** (score block, upcoming matches only):
  - A line under the kickoff time: "Kicks off in 3d 04h 12m" when a day or more
    away, "Kicks off in 2h 14m 05s" when under a day, "Kicks off in 14m 05s"
    when under an hour, and "Starting" once kickoff has passed.
  - It updates every second while the detail view is open. It has no
    `aria-live`, so screen readers are not interrupted every second.
  - The existing day label stays.
- **Switch to live at kickoff:**
  - For each upcoming match, Footly checks at kickoff + 1, + 3, and + 5 minutes
    while the popup is open. Matches sharing a check time share one refetch.
  - The list refetches the whole match list (the same requests as Retry). The
    detail view refetches only the open match's details.
  - A check refreshes in the background: the current list or detail stays on
    screen with no skeleton. On success the new data replaces it, so a match
    ESPN now reports as live shows its Live pill.
  - If a background refresh fails completely, the current data stays and no
    error is shown; the next scheduled check still runs. A partial failure
    behaves like a normal load: new data plus the existing "Some competitions
    couldn't be loaded." notice with Retry.
  - After + 5 minutes there are no more checks for that match. It shows
    "Starting" until the next popup open or Retry.
  - A Retry by the user cancels any pending background result from the old load,
    so an old response can never overwrite newer data.
  - Opening the popup after kickoff schedules only the checks still in the
    future. Opening it more than 5 minutes after kickoff schedules none.

## Out of scope

- Polling live matches, refreshing scores, or any refresh not tied to a kickoff
  check (feature 11). A match that is already live does not refresh.
- A live match minute, notifications (feature 8), and background or service
  worker work. Nothing runs when the popup is closed.
- Countdowns in Results, or for postponed and cancelled matches.
- Changes to the data model, ESPN mapping, or permissions.
- The open F-02 finding from feature 4; it stays in the ledger for a separate
  `/fix`.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`. `/complete` creates the single
feature commit. A test command exists, so every logic step ships passing tests.

## Build steps

- [x] **1. Countdown logic.** Add `src/lib/countdown.ts` with pure functions
  that take `now` as a parameter:
  - `rowCountdown(kickoff, now)`: `'in N min'`, `'Starting'`, or `null` (show
    the kickoff time), by the row rules above.
  - `detailCountdown(kickoff, now)`: the detail text by the rules above, with
    two-digit hours, minutes, and seconds after the leading unit.
  - `nextKickoffCheck(matches, now)`: the earliest kickoff + 1, + 3, or + 5
    minute time strictly after `now` among matches with status `upcoming`, or
    `null`.
  **Done when:** `npm test` passes, covering:
  - Row: 61 minutes gives `null`, 60 minutes gives "in 60 min", 30 seconds
    gives "in 1 min", 0 and negative give "Starting".
  - Detail: day, hour, and minute formats with zero padding; past kickoff gives
    "Starting".
  - `nextKickoffCheck`: picks the earliest across matches, skips passed
    slots, ignores non-upcoming matches, gives `null` after + 5 minutes, and
    gives one time for two matches with the same kickoff.

- [x] **2. Background refresh and kickoff checks.**
  - `useMatchList` gains `refresh()`: it refetches without showing the loading
    state, replaces the result on success (including partial success), keeps
    the current result when every competition fails, and ignores a response
    once `retry` has started a newer load.
  - `useMatchDetails` gains `refresh()` with the same rules for one match: it
    keeps the shown details when the refetch fails.
  - Add `src/hooks/useKickoffChecks.ts`: given matches and a refresh function,
    it sets one timeout for `nextKickoffCheck(matches, new Date())`, calls
    refresh when it fires, and resets when the matches change or on unmount.
  - Wire it for the list in `App.tsx` (using the loaded upcoming matches) and
    for the open match in `MatchDetail.tsx`.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass, and code
  inspection shows each switch-to-live rule above, including Retry beating an
  older background response.

- [x] **3. Row countdown.** Add `src/hooks/useNow.ts` (a `Date` that updates on
  a given interval, cleared on unmount). `App.tsx` ticks every 30 seconds and
  passes `now` through `MatchList` to `MatchRow`. `StatusText` and `statusLabel`
  take an optional `now` and use `rowCountdown` for upcoming matches.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. In Chrome,
  with the popup loaded from `dist/`:
  - A match more than an hour away shows its kickoff time.
  - A match within the hour (when one exists) shows "in N min", and the number
    drops while the popup stays open.
  - The row's accessible name matches the visible text.

- [x] **4. Detail countdown.** In `MatchDetail`'s score block, show the
  `detailCountdown` line for upcoming matches using `useNow(1000)`.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. In Chrome:
  - Opening an upcoming match shows "Kicks off in …" ticking each second.
  - Opening a live or finished match shows no countdown.
  - The console shows no errors.
  The kickoff switch itself is verified by code inspection and the
  `nextKickoffCheck` tests unless a match happens to kick off during manual
  testing.

## Files / areas

- `src/lib/countdown.ts`, `src/lib/countdown.test.ts` (new)
- `src/hooks/useNow.ts`, `src/hooks/useKickoffChecks.ts` (new)
- `src/hooks/useMatchList.ts`, `src/hooks/useMatchDetails.ts` - `refresh()`
- `src/components/matches/status.ts` - `statusLabel(match, now?)`
- `src/components/matches/MatchRow.tsx`, `MatchList.tsx`, `MatchDetail.tsx`
- `src/App.tsx`

## Data / contracts

- No new endpoints, stored data, or permissions. A kickoff check reuses
  `getMatchList()` (the same scoreboard requests as Retry) or `getMatchDetails()`
  (one summary request).
- Request bound: at most three kickoff checks per distinct kickoff time while
  the popup is open, each one list refetch, plus at most three detail refetches
  for the open match. Nothing is requested when the popup is closed.
- Times come from `Match.startTime` (ISO UTC) and the device clock. Countdown
  text uses the user's local clock; only differences are displayed.
- Error handling follows the existing rules: expected provider failures are
  silent during a background refresh, and unexpected errors are logged with
  `console.error` as in the current hooks.

## Testing

- `npm test` (Vitest) covers `rowCountdown`, `detailCountdown`, and
  `nextKickoffCheck` with fixed `now` values. No fake timers are needed because
  the functions are pure.
- Hooks and components stay out of unit tests (coding standards). Build, lint,
  code inspection, and the manual Chrome checks cover them.
- Final gate: `npm test`, `npm run build`, `npm run lint` (no Verify command exists).
- Live Chrome evidence is manual or `/check`; do not claim it unless performed.

## Notes for the AI

- Keep timers inside hooks with cleanup on unmount: one interval per `useNow`
  and one timeout per `useKickoffChecks`. No polling loops beyond these.
- Don't add a service worker, `chrome.alarms`, or a new permission.
- Background refresh must never show the skeleton or the full-page error, and
  must not reset scroll or focus.
- Keep `statusLabel` working without `now` for existing callers.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9278,"specSha256":"f8103a2c2c42b427efde1813ed72dfaf81366ca7565edce8ddc06b03861cc983","branch":"refs/heads/feature/match-countdown","head":"4ab99e20b6c340f7055c38adad945afeb44bf3c2","baseRef":"refs/heads/main","baseCommit":"2ce163a74cb39a4d8343b03320586f227014cdee","sourceTree":"31cb2f6ef5821a8ea7baf9872a5a7945a0a64729","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 4ab99e20b6c340f7055c38adad945afeb44bf3c2
**Base commit:** 2ce163a74cb39a4d8343b03320586f227014cdee
**Base ref:** refs/heads/main
**Spec hash:** f8103a2c2c42b427efde1813ed72dfaf81366ca7565edce8ddc06b03861cc983
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-04T11:44:01Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-04T11:46:11Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `2ce163a74cb39a4d8343b03320586f227014cdee..4ab99e20b6c340f7055c38adad945afeb44bf3c2` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `npm test`: pass (7 files, 127 tests)
- `npm run lint`: pass
- `npm run build`: pass (tsc -b and vite build)

### Evidence

- Freshness verified: HEAD equals target, `git merge-base refs/heads/main HEAD` equals base, spec SHA-256 matches, working tree differs only in blueprint/context/review.md.
- Reviewed the full 2ce163a..4ab99e2 delta: src/lib/countdown.ts and tests, src/hooks/useNow.ts, useKickoffChecks.ts, useMatchList.ts, useMatchDetails.ts, src/components/matches/status.ts, MatchRow.tsx, MatchList.tsx, MatchDetail.tsx, src/App.tsx, plus callers in src/api/football.ts.
- Timer lifecycles: useNow clears its interval on unmount or interval change and stops for non-upcoming detail matches; useKickoffChecks keeps one timeout, clears it on change and unmount, and guards against clock lag with the last fired check time.
- List race guards: retry and unmount bump a generation counter so older background results are dropped; total failure keeps the current list; partial failure replaces it with the normal notice; checks are only scheduled after a successful load and run one at a time.
- Request bound: nextKickoffCheck yields only kickoff + 1, 3, 5 slots strictly after the last fired check, shared across matches; the upcoming window is 7 days, so setTimeout delay overflow is unreachable; no requests run once the popup closes.
- Security: no new endpoints, permissions, storage, or untrusted-input paths; startTime is normalized via toISOString in the ESPN mapping.

### Findings

- F-03 [P2] open - detail kickoff refresh can be overwritten by the slower foreground load
- F-04 [P3] open - ellipsis character in new countdown doc comment
- F-02 [P3] open - carried from feature 4, outside this delta, not re-examined

### Remaining risk

- Hooks and components have no unit tests by project standard; timer and race behavior is verified by code inspection only.
- Check was not required and was not run; no live Chrome evidence of the countdown or the kickoff switch-to-live was gathered in this review.
- No Verify command or CI workflow exists.
