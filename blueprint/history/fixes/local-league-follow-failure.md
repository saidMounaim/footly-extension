# Fix: Local league follow failure

**Type:** Fix
**Status:** verified
**Branch:** fix/local-league-follow-failure
**Fixes:** F-08

## The problem

The local league card's **Follow** button (`followLocalLeague` in
`src/App.tsx`) toggles each suggested competition, then immediately saves the
answer `accepted`. The two saves are independent.

If writing `favoriteCompetitions` fails:

1. `useSavedValue` rolls the followed competitions back;
2. the `localLeagueSuggestion` write can still succeed;
3. the card disappears for good with nothing followed.

The shared "Couldn't save your changes. Try again." alert shows, but there is
nothing left to retry. Feature 22's spec says a failed save keeps the card.

## The fix

Record the answer only after the follows are actually saved.

- `useSavedValue`'s `toggle` returns a `Promise<boolean>`: `true` once the value
  it applied is saved, and `false` when it is ignored (not ready yet) or the save
  fails and is rolled back.
  - Existing callers ignore the result and keep working unchanged.
  - The rollback and alert behavior is untouched.
- `useFavoriteCompetitions` passes that result through (`toggle: (id) =>
  Promise<boolean>`).
- `followLocalLeague` waits for every follow it started:
  - only when all of them saved does it call `answer('accepted')` and move focus
    to Home;
  - otherwise the failed save rolls the follows back. That brings the card back
    next to the existing shared alert, so the user can tap Follow again.

  Focus moves to Home as soon as Follow is tapped, because the card hides while
  the follows apply. (Implementation note: the card can't keep focus on its
  Follow button, since it unmounts until a rollback brings it back.)

It must not break:

- **No unfollows:** Follow never toggles off an already-followed competition.
- **No Follow changes:** No thanks behaves exactly as today.
- **Every other toggle caller:** favorite teams, competitions, notifications,
  settings, and theme all behave as before.
- **No new storage keys or permissions.**

## Build steps

- [x] **1. Wait for the follow saves before accepting.**
  - Make `useSavedValue.toggle` resolve to whether its change was saved.
  - Add a focused test for that contract. The settle logic is factored into a
    small pure helper in `src/hooks/useSavedValue.ts` if needed, so it is
    testable without React.
  - Update `useFavoriteCompetitions` and `followLocalLeague` as described.

  **Done when:** `npm test`, `npx tsc -b`, `npm run lint`, and `npm run build`
  pass. Reading `followLocalLeague` shows `answer('accepted')` runs only after
  every started follow resolved `true`.

## Verify

- **Automated:** `npm test`, typecheck, lint, and build.
- **Manual, in Chrome:**
  - With the time zone set to Casablanca, tap **Follow**. Both competitions are
    followed and the card goes away, as before.
  - To check the failure path, in the popup's DevTools console run
    `chrome.storage.local.set = () => Promise.reject(new Error('test'))`, then
    tap **Follow**. The alert shows, the card stays, and reopening the popup
    still shows the card.
- After the build, `/audit` re-reviews F-08 before it can close.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3177,"specSha256":"3e24ff530d603117986f2ef70954f0d1925e92672fa1cbe25d6136cbfdc77026","branch":"refs/heads/fix/local-league-follow-failure","head":"dacef49ad03d02633822e7586c4642dedfeef903","baseRef":"refs/heads/main","baseCommit":"fbaf61412ba6afe9fdc34c448d68b20a50509de6","sourceTree":"e1cdbcca9a0d80ad11608a8847e713b2bfacf1a3","absentOptional":[]} -->

## Findings

### local-league-follow-failure/F-08 [P2] closed - A failed Follow save still records "accepted", so the card is gone with nothing followed

**File:** src/App.tsx:129
**Found:** 2026-10-06 by /audit independent (scope: current; lens: quality)
**Why it matters:** `followLocalLeague` toggles each competition and then immediately calls `localLeague.answer('accepted')`. The two saves are independent: if the `favoriteCompetitions` write fails, `useSavedValue` rolls the competitions back, but the `localLeagueSuggestion` write can still succeed. The user sees the shared alert, the card disappears permanently, and nothing is followed. The spec says a failed save keeps the card; this path only holds for a failed answer save. Rare (chrome.storage.local write failure) and recoverable by following manually in Favorites, so not a blocker.
**Suggested fix:** Record the answer only after the competitions save succeeds (for example, have the follow path wait on the favorites save result, or roll the answer back when `competitions.saveError` turns on during a follow). Requirement lost: none.
**Resolution:** Fixed on `fix/local-league-follow-failure`: `useSavedValue.toggle` now resolves whether its change was saved (`settleSave`, tested), and `followLocalLeague` records `accepted` only after every started follow resolves `true`; a failed save rolls the follows back and the card returns beside the shared alert. Awaiting `/audit` re-review.
Closed 2026-10-06 by /audit independent (scope: current; lenses: quality, security, performance, tests) at dacef49: `src/App.tsx:131-140` now calls `answer('accepted')` only inside `Promise.all(follows).then` when every result is `true`; `useSavedValue.toggle` (`src/hooks/useSavedValue.ts:93-118`) returns `settleSave`, which resolves `false` on rejection after the unchanged rollback and `saveError` path, and never rejects. A failed follow therefore leaves the answer unsaved, `suggestionFor` (`src/lib/localLeague.ts:122`) returns the suggestion again after rollback, and the card returns beside the shared alert. Every other `toggle`/`answer`/`select` caller (FavoritesPanel, SearchPanel, MatchDetail, SettingsPanel, theme and live-refresh `select`, Dismiss) ignores the result, and the narrower `() => void` interfaces still type-check; `npm test` (407 passed), `npm run lint`, `npx tsc -b`, and `npm run build` pass. No new defect from the repair; the only residual edge is tracked separately as F-10 (unverified).

## Independent review

**Status:** passed
**Target commit:** dacef49ad03d02633822e7586c4642dedfeef903
**Base commit:** fbaf61412ba6afe9fdc34c448d68b20a50509de6
**Base ref:** main
**Spec hash:** 3e24ff530d603117986f2ef70954f0d1925e92672fa1cbe25d6136cbfdc77026
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-06T20:55:33Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-06T20:56:45Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `fbaf61412ba6afe9fdc34c448d68b20a50509de6..dacef49ad03d02633822e7586c4642dedfeef903` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `npm test`: pass (18 files, 407 tests)
- `npm run lint`: pass
- `npx tsc -b`: pass
- `npm run build`: pass

## Evidence

- Preconditions: `HEAD` = target, `git merge-base main HEAD` = base, SHA-256 of `blueprint/context/current-feature.md` = spec hash, only `blueprint/context/review.md` modified in the working tree.
- Delta reviewed: `src/App.tsx`, `src/hooks/useSavedValue.ts`, `src/hooks/useSavedValue.test.ts`, `src/hooks/useFavoriteCompetitions.ts`, `blueprint/context/current-feature.md`, `blueprint/context/findings.md`.
- `followLocalLeague` (`src/App.tsx:127-141`) calls `answer('accepted')` only after every started follow resolves `true`; empty follow lists resolve to accepted.
- `settleSave` never rejects; the rollback and `saveError` behavior in `useSavedValue.toggle` is unchanged.
- All other `toggle`, `select`, and `answer` callers (FavoritesPanel, SearchPanel, MatchDetail, SettingsPanel, theme, live refresh, notification types, Dismiss) ignore the result; their `() => void` interfaces still type-check.
- Security: no new storage keys, permissions, untrusted input, or network paths. Performance: one `Promise.all` over at most a few ids per tap.
- Tests: `settleSave` success and failure contracts are covered. The App-level gating has no component test because the project has no React test harness.

## Findings

- F-08 [P2] closed: re-review confirms the answer waits for every follow save.
- F-10 [P3] unverified (new): follows can be saved while the answer stays unrecorded if the popup closes mid-save or saves partly fail.

## Remaining risk

- Check not required and not run. The manual Chrome failure-path steps in the spec were not exercised.
- `followLocalLeague` gating is verified by reading the code only, with no component or browser test.
- F-10 edge (unverified, non-blocking).
