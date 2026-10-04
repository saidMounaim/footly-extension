# Fix: Test team catalog unexpected error rethrow

**Type:** Fix
**Status:** verified
**Branch:** fix/test-team-catalog-unexpected-error-rethrow
**Fixes:** F-02

## The problem

Feature 4's spec requires `getTeamCatalog` (`src/api/football.ts`) to follow the
match list's error rules: expected provider failures land in
`failedCompetitionIds`, and unexpected errors are rethrown. The tests in
`src/api/football.test.ts` cover partial and total expected failures, but not
the rethrow. A regression that folded every error into `failedCompetitionIds`
would hide programming errors as a "Some competitions couldn't be loaded."
notice and go unnoticed. `getMatchDetails` already has the equivalent test
("does not wrap unexpected errors").

The ledger's suggested test, a `fetchImpl` that throws, would not prove this:
`fetchJson` wraps anything `fetchImpl` throws as an expected
`ProviderRequestError`, so that error is correctly counted as a failed
competition.

## The fix

Add one test to the `getTeamCatalog` block. Its `fetchImpl` resolves an `ok`
response whose `json()` returns an object with a `children` getter that throws
a `RangeError`, the same technique as the `getMatchDetails` test. The error
then comes from inside `normalizeTeams`, outside the expected-failure types.
Assert that `getTeamCatalog` rejects with that exact error (`rejects.toBe`).

Must not break: test-only change. No product code, and the existing catalog
tests stay unchanged.

## Build steps

- [x] **1. Add the rethrow test.** Add the test above.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass, and
  the new test fails if the `throw result.reason` line in `getTeamCatalog` is
  temporarily replaced by `failedCompetitionIds.push(...)`. Check this locally
  and revert it; don't commit the mutation. Mark F-02 `fixed` in
  `blueprint/context/findings.md`.

## Verify

- `npm test`, `npm run build`, `npm run lint` (no Verify command exists).
- The temporary mutation check above shows the test can fail.
- A review pass (`/audit`) can then close F-02.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2058,"specSha256":"e37ed51f57b641dd4cd72a7a9110525f6bd8f178307e953d13361c05f79f88ac","branch":"refs/heads/fix/test-team-catalog-unexpected-error-rethrow","head":"682cb5cd8f13e874422af9ee61e52935e5256518","baseRef":"refs/heads/main","baseCommit":"682cb5cd8f13e874422af9ee61e52935e5256518","sourceTree":"0bb77e065c5862df785d438dccebba40bb4acde6","absentOptional":[]} -->

## Findings

### test-team-catalog-unexpected-error-rethrow/F-04 [P3] closed - Ellipsis character in new countdown doc comment

**File:** src/lib/countdown.ts:18
**Found:** 2026-10-04 by /audit independent (scope: current; lens: quality)
**Why it matters:** The coding standards' Writing section says to avoid the ellipsis character in comments. The `detailCountdown` doc comment uses it twice.
**Suggested fix:** Write the examples out in full or use "...". Requirement lost: none.
**Resolution:** Fixed on fix/ellipsis-in-countdown-doc-comment: the `detailCountdown` doc comment now writes each example in full ("Kicks off in 2h 14m 05s", "Kicks off in 14m 05s"); `grep -n "…" src/lib/countdown.ts` finds nothing. Awaiting re-review. Re-reviewed 2026-10-04 by /audit (scope: fix commit 5eaea06..682cb5c; all lenses): the comment-only change removes both ellipsis characters, its examples match the three formats `detailCountdown` returns, no code changed, and no ellipsis remains in src/lib. No new defect. Closed.
