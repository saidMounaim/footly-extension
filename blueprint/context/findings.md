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

### F-03 [P2] fixed - Detail kickoff refresh can be overwritten by the slower foreground load

**File:** src/hooks/useMatchDetails.ts:53
**Found:** 2026-10-04 by /audit independent (scope: current; lens: quality)
**Why it matters:** `useKickoffChecks` in `MatchDetail` schedules from `shown`, which falls back to the `match` prop while the details load is still in flight, so a kickoff check can fire during that load (for example, the detail opened a few seconds before kickoff + 1, or a detail Retry just before a check, with a request taking up to the 10 s timeout). `refresh` and the foreground load then write `settled` for the same key with no ordering guard. If the background refresh lands first, the older foreground response overwrites it: a stale "upcoming" result undoes the Live switch until the next check, and a foreground failure replaces the freshly loaded details with the full "Couldn't load match details." error. This contradicts the spec intent that an old response never overwrites newer data. The list hook is not affected because it only schedules checks after a successful load.
**Suggested fix:** In `useMatchDetails.refresh`, skip the refetch while the current key has not settled yet (the in-flight load already returns fresh data), for example by tracking the settled key in a ref and returning early when it differs from `currentKey.current`. Requirement lost: none.
**Resolution:** Fixed on fix/detail-refresh-overwritten-by-first-load: `useMatchDetails` records the key of the last settled foreground load in `settledKey`, and `refresh` returns without a request until the current key has settled, so a background refresh can no longer race the first load. Awaiting re-review.

### F-04 [P3] open - Ellipsis character in new countdown doc comment

**File:** src/lib/countdown.ts:18
**Found:** 2026-10-04 by /audit independent (scope: current; lens: quality)
**Why it matters:** The coding standards' Writing section says to avoid the ellipsis character in comments. The `detailCountdown` doc comment uses it twice.
**Suggested fix:** Write the examples out in full or use "...". Requirement lost: none.
**Resolution:**
