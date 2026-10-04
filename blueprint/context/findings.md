# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-02 [P3] open - getTeamCatalog's unexpected-error rethrow is untested

**File:** src/api/football.ts:174
**Found:** 2026-10-04 by /audit independent (scope: current; lens: tests)
**Why it matters:** The spec requires `getTeamCatalog` to follow the same expected-vs-unexpected error rules as the match list. `src/api/football.test.ts` covers partial and total expected failures, but no test proves that an unexpected error (for example a programming error thrown from the fetch stub) is rethrown instead of being folded into `failedCompetitionIds`. `getMatchDetails` has that test ("does not wrap unexpected errors"), so a regression in the catalog path would go unnoticed.
**Suggested fix:** Add one test where `fetchImpl` throws a non-network error and assert `getTeamCatalog` rejects with that same error. Requirement lost: none.
**Resolution:**
