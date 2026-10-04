# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-02 [P3] fixed - getTeamCatalog's unexpected-error rethrow is untested

**File:** src/api/football.ts:174
**Found:** 2026-10-04 by /audit independent (scope: current; lens: tests)
**Why it matters:** The spec requires `getTeamCatalog` to follow the same expected-vs-unexpected error rules as the match list. `src/api/football.test.ts` covers partial and total expected failures, but no test proves that an unexpected error (for example a programming error thrown from the fetch stub) is rethrown instead of being folded into `failedCompetitionIds`. `getMatchDetails` has that test ("does not wrap unexpected errors"), so a regression in the catalog path would go unnoticed.
**Suggested fix:** Add one test where `fetchImpl` throws a non-network error and assert `getTeamCatalog` rejects with that same error. Requirement lost: none.
**Resolution:** Fixed on fix/test-team-catalog-unexpected-error-rethrow: `src/api/football.test.ts` adds "does not fold unexpected errors into failed competitions", which resolves an ok response whose JSON `children` getter throws a RangeError and asserts `getTeamCatalog` rejects with that exact error (a throwing `fetchImpl` would be wrapped as an expected failure by `fetchJson`, so the suggested approach could not prove it). Removing the rethrow line makes the test fail; restored. Awaiting re-review.

### F-06 [P3] unverified - A postponed match that is rescheduled under the same id is never watched again

**File:** src/lib/notifications.ts:164
**Found:** 2026-10-04 by /audit independent (scope: current; lens: quality)
**Why it matters:** `mergePlan` keeps the stored status for a known match and refreshes its `startTime`, and `watchWindow` skips `postponed`. If the provider later reschedules the same match id to a new date within the 7-day list while its stored status is still `postponed`, the watched entry keeps `postponed` and gets no kick-off, half-time, or full-time alerts. This follows the spec's "known matches keep their last notified status" rule literally; whether ESPN reuses ids for rescheduled fixtures within the list window is not verified.
**Suggested fix:** If confirmed, let `mergePlan` take the fresh status when the stored one is `postponed` and the fresh one is `upcoming` (a silent reset that cannot send a false alert). Requirement lost: none. Needs a spec decision before changing.
**Resolution:**
