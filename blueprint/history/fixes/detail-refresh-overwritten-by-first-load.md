# Fix: Detail refresh overwritten by first load

**Type:** Fix
**Status:** verified
**Branch:** fix/detail-refresh-overwritten-by-first-load
**Fixes:** F-03

## The problem

In `src/hooks/useMatchDetails.ts`, `refresh()` can run while the detail view's
first (foreground) load for the same key is still in flight. `MatchDetail`
schedules kickoff checks from `shown`, which falls back to the `match` prop
until details arrive. So a check at kickoff + 1, + 3, or + 5 minutes can fire
during that load: for example when a match is opened, or Retry is pressed, a few
seconds before a check, with a request taking up to the 10 s timeout.

Both responses then write `settled` for the same key with nothing deciding which
wins. If the background refresh lands first, the older foreground response
overwrites it:
- A stale "upcoming" result undoes the switch to Live until the next check.
- A failed foreground load replaces fresh details with "Couldn't load match
  details."

This breaks feature 7's rule that an old response can never overwrite newer
data. The list hook is not affected, because it only schedules checks after a
successful load.

## The fix

Skip a background refresh while the current key's foreground load hasn't
settled. That in-flight load already returns fresh data, so nothing is lost.
- Track the key of the last settled foreground load in a ref, set where the
  load writes `settled`.
- `refresh()` returns early, without a request, when that key differs from
  `currentKey.current`.

Must not break:
- A refresh after the first load settled still works, including replacing an
  error state with fresh details.
- A Retry still drops any refresh that started before it.
- Unmount still drops late responses.
- The list hook, `useKickoffChecks`, and the request bound are unchanged. A
  skipped check sends fewer requests, never more.

No new abstraction or dependency: one ref and one early return.

## Build steps

- [x] **1. Guard refresh until the first load settles.** Apply the fix in
  `useMatchDetails.ts`.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass, and code
  inspection shows:
  - `refresh` sends no request while the current key is unsettled.
  - It still writes only when the key it started with is current.
  - Retry and unmount still drop stale responses.
  Mark F-03 `fixed` in `blueprint/context/findings.md`.

## Verify

- `npm test`, `npm run build`, `npm run lint` (no Verify command exists). Hooks
  stay out of unit tests by the coding standards, so the race is verified by code
  inspection; a fresh `/audit` re-review closes F-03.
- Manual (optional, timing-dependent): open an upcoming match's detail within a
  few seconds of kickoff + 1 minute on a slow network. The detail should end on
  the newest data, not flip back to upcoming or to the error.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2823,"specSha256":"fa21879782c157d7a8263cce64655d62d1a4e1a3809629146b9d5e42b93c95bd","branch":"refs/heads/fix/detail-refresh-overwritten-by-first-load","head":"0c41398c092f534134c52b11f6e5dd57c9a27db7","baseRef":"refs/heads/main","baseCommit":"0c41398c092f534134c52b11f6e5dd57c9a27db7","sourceTree":"76779a146292c618910e7ab96de74e2f73829900","absentOptional":[]} -->
