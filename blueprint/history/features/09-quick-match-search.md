# Feature: Quick Match Search

**From build-plan:** feature 9
**Build attempt:** 1
**Branch:** feature/quick-match-search
**Status:** verified

## Goal

Let users find a team, competition, or match quickly from a new **Search** tab
(Upcoming | Results | Favorites | Search), using only data the popup already
has.

Decided 2026-10-04 (resolves the overview's open question on search scope for
this feature):
- Search is its own tab, matching the overview's `Search` screen.
- It covers the matches already loaded (this week's upcoming and results), the
  six competitions, and the teams playing in those loaded matches.
- No new requests. Clubs with no match this week remain findable through the
  Favorites tab's team search (feature 4).

## In scope

- **Search tab:**
  - A fourth tab, "Search", added to the existing tablist, with the same
    keyboard behavior (arrow keys, Home, End).
  - Clicking the tab moves focus to the search field. Arrow-key navigation
    between tabs leaves focus on the tab, following the tabs pattern.
  - The query is kept while the popup stays open, including when switching
    tabs or opening and closing a match.
- **Search field:** visible label "Search teams, competitions, and matches",
  `type="search"`. Matching ignores case, accents, and surrounding spaces,
  reusing `foldText`.
- **Results**, shown only for a non-empty query, in this order, each section
  with an `h2` and only when it has results:
  1. **Competitions:** each of the six whose name contains the query, with
     its favorite star (feature 5's `FavoriteToggle`, same labels).
  2. **Teams:** distinct teams from the loaded matches (upcoming and results)
     whose name or short name contains the query, sorted by name, with their
     favorite star (feature 4's toggle).
  3. **Matches:** loaded matches where every word of the query appears in the
     home team, away team, or competition name, so "arsenal chelsea" finds
     that match. Upcoming matches come first in their normal order, then
     results newest first, under "Upcoming" and "Results" subheadings. Rows
     reuse `MatchRow`: the same favorite marker and countdown, and clicking
     opens the match detail. Back returns focus to the row.
- **States:**
  - Empty query: "Search for a team, competition, or match." (muted text).
  - No results in any section: `No results for “query”.`, with the query
    trimmed.
  - Match list loading: the Competitions section still works. Teams and
    Matches show the existing list skeleton (`aria-busy`).
  - Match list error: Competitions still work. Teams and Matches show
    "Couldn't load matches." with Retry, which calls the existing list retry.
    "No results" is not shown while matches are unavailable.
- **Favorites:** stars follow the existing rules: disabled until the saved
  list is read, and the existing save and read alerts apply. A star changed
  here updates the other tabs straight away.

## Out of scope

- Searching clubs without a loaded match, a competition catalog beyond the six,
  or any new request (decided above).
- Fuzzy matching, typo tolerance, ranking, recent searches, and remembering the
  query between popup opens.
- Searching players, events, or dates.
- Showing a team's or competition's matches on a separate page; the Matches
  section already lists them.
- The unverified F-06 entry in the ledger.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`. `/complete` creates the single
feature commit. A test command exists, so every logic step ships passing tests.

## Build steps

- [x] **1. Search logic.** In `src/lib/search.ts`, next to `searchTeams`, add:
  - `searchCompetitions(competitions, query)`: name contains the folded
    query; an empty query gives `[]`.
  - `teamsInMatches(matches)`: distinct teams by id from home and away sides,
    sorted by name with `localeCompare`.
  - `searchMatches(matches, query)`: every whitespace-separated folded word of
    the query appears in the home name or short name, the away name or short
    name, or the competition name. Keeps input order; an empty query gives
    `[]`.
  **Done when:** `npm test` passes, covering:
  - Case, accents, and surrounding spaces.
  - Empty and blank queries.
  - Competition matching.
  - Team dedupe across matches and sides, and sorting.
  - Multi-word match queries, including words split across teams and
    competition.
  - Short-name matching.
  - Kept order.

- [x] **2. Search tab.** Add `'search'` to `MatchTab` and `MATCH_TABS`, and
  keep `ListTab` to the two list tabs. Add
  `src/components/search/SearchPanel.tsx`, rendered by `App.tsx` for the new
  tab. It takes the match list state, retry, `now`, the favorites and
  competitions APIs, and the open-match handler. Focus the field when the tab
  is clicked.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. In Chrome,
  with the popup loaded from `dist/`:
  - Clicking Search focuses the field, and arrow keys still move between
    the four tabs.
  - "prem" lists Premier League with a working star.
  - A team name lists the team (star works) and its matches.
  - "arsenal chelsea" (or two teams playing this week) finds that match, and
    opening it then pressing Back returns focus to its row.
  - A nonsense query shows the no-results message.
  - Offline, Teams and Matches show the error with Retry while Competitions
    still work.
  - The console shows no errors.

## Files / areas

- `src/lib/search.ts`, `src/lib/search.test.ts`
- `src/components/matches/tabs.ts`, `src/components/matches/MatchTabs.tsx`
  (focus-on-click hook-up only if needed)
- `src/components/search/SearchPanel.tsx` (new)
- `src/App.tsx`
- Reused unchanged: `MatchRow`, `FavoriteToggle`, `COMPETITIONS`,
  `useMatchList` state and retry, `useNow`, `useFavoriteTeams`,
  `useFavoriteCompetitions`, the list skeleton and error look

## Data / contracts

- No new requests, storage keys, or permissions. Search reads the in-memory
  match list result (`upcoming`, `results`) and `COMPETITIONS`.
- Teams found in matches are the normalized `Team` objects from the match list;
  the star stores them through the existing `toggleFavorite`, so saved data
  keeps feature 4's shape.
- Query text and all provider names render as React text nodes only.

## Testing

- `npm test` (Vitest) covers `searchCompetitions`, `teamsInMatches`, and
  `searchMatches` with plain data. The existing `searchTeams` tests stay
  unchanged.
- `SearchPanel` and the tab wiring are UI and stay out of unit tests (coding
  standards). Build, lint, and the manual Chrome checks cover them.
- Final gate: `npm test`, `npm run build`, `npm run lint` (no Verify command exists).
- Live Chrome evidence is manual or `/check`; do not claim it unless performed.

## Notes for the AI

- Reuse `MatchRow`, `FavoriteToggle`, the Favorites panel heading style, the list
  skeleton, and the error block instead of new variants.
- Keep heading ids unique per tab (for example `search-matches-upcoming`).
- Searching is synchronous over at most a few hundred items; no debounce, worker,
  or index is needed.
- Don't add new tab-level state outside `App.tsx`. The query lives in
  `SearchPanel`, which stays mounted while hidden, as the other panels do.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7346,"specSha256":"9c96f5fdf381e431a2110ac64a91f60aa1b4419fa126280c85689a617d63537e","branch":"refs/heads/feature/quick-match-search","head":"ea4cb4787c37542dc68c0f49c5020163e55a93bf","baseRef":"refs/heads/main","baseCommit":"ea4cb4787c37542dc68c0f49c5020163e55a93bf","sourceTree":"53482b2434383ce7d8a31dc3f405104f9771966e","absentOptional":[]} -->

## Findings

### 9/F-02 [P3] closed - getTeamCatalog's unexpected-error rethrow is untested

**File:** src/api/football.ts:174
**Found:** 2026-10-04 by /audit independent (scope: current; lens: tests)
**Why it matters:** The spec requires `getTeamCatalog` to follow the same expected-vs-unexpected error rules as the match list. `src/api/football.test.ts` covers partial and total expected failures, but no test proves that an unexpected error (for example a programming error thrown from the fetch stub) is rethrown instead of being folded into `failedCompetitionIds`. `getMatchDetails` has that test ("does not wrap unexpected errors"), so a regression in the catalog path would go unnoticed.
**Suggested fix:** Add one test where `fetchImpl` throws a non-network error and assert `getTeamCatalog` rejects with that same error. Requirement lost: none.
**Resolution:** Fixed on fix/test-team-catalog-unexpected-error-rethrow: `src/api/football.test.ts` adds "does not fold unexpected errors into failed competitions", which resolves an ok response whose JSON `children` getter throws a RangeError and asserts `getTeamCatalog` rejects with that exact error (a throwing `fetchImpl` would be wrapped as an expected failure by `fetchJson`, so the suggested approach could not prove it). Removing the rethrow line makes the test fail; restored. Awaiting re-review. Re-reviewed 2026-10-04 by /audit (scope: fix commit 682cb5c..ea4cb47; all lenses): the new test drives an ok response whose `children` getter throws inside `normalizeTeams` (after its `isRecord` check), outside `ProviderRequestError`/`EspnResponseError`, and asserts `rejects.toBe` the exact error, so folding it into `failedCompetitionIds` would fail the test; test-only change, no focused or skipped tests, existing catalog tests unchanged. No new defect. Closed.
