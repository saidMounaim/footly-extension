# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-02 [P3] fixed - Summary with a valid status but unusable score drops the list's score

**File:** src/api/espn.ts:231
**Found:** 2026-10-03 by /audit independent (scope: current; lens: quality)
**Why it matters:** The spec's ESPN summary mapping says that when score or
status are missing or invalid, the list's values are kept. `normalizeSummary`
applies a valid header status and then runs `delete updated.score` whenever
`toScore` returns nothing, including for `live`, `halftime`, or `finished`
when the competitors' scores are missing or malformed. A list match shown as
`Live 1-0` whose summary header has `state: 'in'` but no parsable competitor
scores opens with the kickoff time in the score slot instead of `1-0`. Real
ESPN summaries sampled during this review always carried scores, so the
path is unlikely, and no test covers it.
**Suggested fix:** Delete the score only when the new status has no score
(upcoming, postponed, cancelled); for live, halftime, and finished keep
`match.score` when `toScore` returns undefined. Add one case to the
"takes status and score from the header" test. No current requirement is lost.
**Resolution:** Fixed on fix/keep-list-score-when-summary-score-is-unusable: `normalizeSummary` now removes the score only for statuses without one (upcoming, postponed, cancelled) and keeps the list score for live, halftime, and finished when the summary's scores are unusable; four new tests cover missing and malformed scores. Awaiting /audit re-review.

### F-03 [P3] fixed - Match row button wraps block elements

**File:** src/components/matches/MatchRow.tsx:65
**Found:** 2026-10-03 by /audit independent (scope: current; lens: quality)
**Why it matters:** The new row `<button>` contains `<div>` and `<p>`
elements. HTML allows only phrasing content inside a button, so the markup is
invalid even though browsers render it and the `aria-label` keeps the
accessible name correct. HTML validators and some accessibility checkers will
flag every row.
**Suggested fix:** Swap the inner `div`/`p` for `span` elements with `block`
(and the existing truncate/flex classes) so the visual layout is unchanged.
No current requirement is lost.
**Resolution:** Fixed on fix/phrasing-content-in-match-row-button: the row button's inner `div`/`p` elements are now `span`s with `block`, keeping the same classes; no `div` or `p` remains inside the button. Awaiting /audit re-review.
