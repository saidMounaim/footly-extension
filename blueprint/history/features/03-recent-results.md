# Feature: Recent Results

**From build-plan:** feature 3
**Build attempt:** 1
**Branch:** feature/recent-results
**Status:** verified

## Goal

Add an **Upcoming | Results** tab switch at the top of the popup list. The
Results tab shows finished matches from today and the previous 7 days for the
same six competitions, newest first, grouped by day, with the final score.
Clicking a result opens the existing match detail view, which shows its key
events timeline. The results come from the same ESPN scoreboard requests as the
upcoming list, so the popup makes no extra requests per result.

## In scope

- **One fetch for both tabs.** The list service requests the scoreboard months
  covering local start of (today − 7 days) through the end of the upcoming
  window, padded by one day on each side. That's 6 requests usually and 12 when
  the range crosses a month boundary. It returns both lists from that one
  response set:
  - **upcoming:** unchanged from 1b. Today through the next 7 days, everything
    except `finished`, kickoff ascending.
  - **results:** `finished` matches whose kickoff is on or after local start of
    (today − 7 days) and before local start of tomorrow. Sorted newest first,
    with ties in competition order.
  - **failedCompetitionIds:** shared by both lists, with the 1b rules.
- **Tabs:** a tablist labelled "Matches" with two tabs, "Upcoming" (selected on
  every popup open) and "Results", using the ARIA tabs pattern:
  - `role="tablist"`, `role="tab"` with `aria-selected` and `aria-controls`,
    and one `role="tabpanel"` labelled by the active tab.
  - Roving `tabIndex`. Left and Right arrows move between tabs and activate
    them; Home and End go to the first and last tab.
  - The selected tab is shown with text weight and an underline, not color alone.
  - Switching tabs doesn't refetch.
- **Results tab states:**
  - Loading and error: the same skeleton and error message (with Retry) as
    Upcoming, from the shared fetch.
  - Partial failure: the same "Some competitions couldn't be loaded." notice
    with Retry.
  - Empty (no finished matches in the window): "No results in the last 7 days."
  - Success: day groups, newest first, labelled "Today", "Yesterday", then
    weekday and date. Each row is the existing `MatchRow`, showing "FT 2–1".
- **Detail view from Results:** clicking a result opens the existing detail
  view. Back returns to the Results tab at the same scroll position, with focus
  on that row. Both tabs stay mounted; the inactive one is `hidden`.
- **`dayLabel` gains "Yesterday"** for the day before today.

## Out of scope

- Goalscorers or events in the result rows (they're only in the detail view).
- Results older than 7 days, paging, or "load more".
- Remembering the selected tab between popup opens (feature 13 owns preferences).
- Favorites filtering (features 4, 5), bottom navigation, caching, auto-refresh
  (feature 11).
- Past postponed or cancelled matches; Results only lists `finished`.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`. `/complete` creates the single
feature commit. A test command exists, so every logic step ships passing tests.

## Build steps

- [x] **1. Date helpers.** In `src/lib/date.ts`:
  - Add `matchListWindow(now)`, which returns `resultsStart` (local start of
    today − 7 days), `todayStart`, `tomorrowStart`, and `upcomingEnd` (local
    start of today + 8 days).
  - Make `monthsToRequest` take any `{ start, end }` range.
  - Add "Yesterday" to `dayLabel`.
  - Remove `upcomingWindow` if nothing uses it after step 2.
  **Done when:** `npm test` passes, with tests for:
  - The window bounds, including across a DST change.
  - Months for a range wholly inside one month, one starting in the previous
    month (for example today = the 3rd), and one crossing a year boundary.
  - Day labels for "Yesterday" and an older day.

- [x] **2. Match list service.** Rename `getUpcomingMatches` to
  `getMatchList({ now, fetchImpl })`. It returns
  `{ upcoming, results, failedCompetitionIds }` from one set of requests
  covering `matchListWindow`, and keeps every 1b rule for `upcoming`. Update the
  existing tests and add result cases.
  **Done when:** `npm test` passes, with tests for:
  - The exact request URLs for the combined range.
  - Results including a finished match at local 00:00 seven days ago and one
    finished today.
  - Results excluding a finished match before the window and any
    non-`finished` past match.
  - Newest-first ordering with competition-order ties.
  - Upcoming unchanged.
  - Shared `failedCompetitionIds`.

- [x] **3. Tabs and Results panel.**
  - Rename `useUpcomingMatches` to `useMatchList` (same loading/success/error
    and retry; the error state is still "all competitions failed").
  - Add `src/components/matches/MatchTabs.tsx` with the tablist behavior.
  - Make `MatchList` take the list to show plus its empty message.
  - In `App.tsx`, render both panels (inactive one `hidden`) and keep detail
    view open and close working from either tab.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. In
  Chrome, with the popup loaded from `dist/`:
  - The popup opens on Upcoming.
  - Clicking "Results", or arrowing to it, shows finished matches newest first,
    grouped by day with "Today" and "Yesterday" labels and "FT x–y" scores.
  - Opening a result shows its timeline, and Back returns to Results with the
    same scroll position and focus.
  - Switching tabs makes no new network requests.
  - The console shows no errors.

## Files / areas

- `src/lib/date.ts`, `src/lib/date.test.ts` - window, months, "Yesterday"
- `src/api/football.ts`, `src/api/football.test.ts` - `getMatchList`, result filtering and order
- `src/hooks/useUpcomingMatches.ts` renamed to `src/hooks/useMatchList.ts`
- `src/components/matches/MatchTabs.tsx` (new)
- `src/components/matches/MatchList.tsx` - list and empty message as props
- `src/App.tsx` - tabs, two panels, detail view from either tab

## Data / contracts

```ts
interface MatchListResult {
  upcoming: Match[]            // 1b rules, kickoff ascending
  results: Match[]             // finished, today and previous 7 days, newest first
  failedCompetitionIds: string[]
}
```

`Match`, `MatchEvent`, and `Competition` are unchanged. No new ESPN fields or
endpoints. Provider text keeps rendering as React text nodes only.

## Testing

- `npm test` (Vitest) covers the date helpers and `getMatchList` as listed in
  each step's Done when, with an injected `now`, the pinned `Europe/London`
  timezone, and a stubbed `fetchImpl`. No real network in tests.
- The tabs, hook, and panels are UI and stay out of unit tests (coding
  standards): build, lint, and the manual Chrome check cover them.
- Final gate: `npm test`, `npm run build`, `npm run lint` (no Verify command exists).
- Live Chrome evidence is manual or `/check`; do not claim it unless performed.

## Notes for the AI

- Keep the single fetch: switching tabs or opening results must not trigger list
  requests. Request count rises only when the 16-day range spans two months.
- Reuse `MatchRow`, `StatusText`, the skeleton, the error and notice blocks, and
  `secondaryButtonClass`; don't duplicate them for Results.
- Use the design tokens; the selected-tab indicator must not rely on color alone.
- Focus restore on Back must target the row in whichever tab opened the match.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7502,"specSha256":"49a0b022716fc4f1256820fe7ccec8230134f195f04d38fc74ceedac479b998c","branch":"refs/heads/feature/recent-results","head":"06c95bc1ce92d1840fde0ea93978ef4c805824ba","baseRef":"refs/heads/main","baseCommit":"06c95bc1ce92d1840fde0ea93978ef4c805824ba","sourceTree":"1e18a5bbf2e3133bc6e6de114f304b384571959d","absentOptional":[]} -->

## Findings

### 3/F-02 [P3] closed - Summary with a valid status but unusable score drops the list's score

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
**Resolution:** Fixed on fix/keep-list-score-when-summary-score-is-unusable: `normalizeSummary` now removes the score only for statuses without one (upcoming, postponed, cancelled) and keeps the list score for live, halftime, and finished when the summary's scores are unusable; four new tests cover missing and malformed scores. Re-reviewed 2026-10-04 by /audit (scope: fix commits 4567a17..06c95bc; all lenses): `normalizeSummary` now keeps the list score for live/halftime/finished when the summary score is unusable and still removes it for upcoming/postponed/cancelled; four new tests cover missing and malformed scores and the postponed case still passes; no new defect. Closed.

### 3/F-03 [P3] closed - Match row button wraps block elements

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
**Resolution:** Fixed on fix/phrasing-content-in-match-row-button: the row button's inner `div`/`p` elements are now `span`s with `block`, keeping the same classes; no `div` or `p` remains inside the button. Re-reviewed 2026-10-04 by /audit (scope: fix commits 4567a17..06c95bc; all lenses): the row button now contains only `span` elements (plus `StatusText`'s `span`/`time`); classes, `aria-label`, and click handler unchanged; no `div`/`p` remains inside any button in `src/components`. Closed.
