# Feature: Your Teams' Matches in Favorites

**From build-plan:** feature 25a
**Build attempt:** 1
**Branch:** feature/your-teams-matches-in-favorites
**Status:** verified

## Goal

The Favorites tab shows your favorite teams' own matches, upcoming and recent,
in every competition they play. It gets them from each team's ESPN schedule,
not only from the competitions Footly already loads. The competition follow
lists leave Favorites; feature 25b moves following to Home.

## In scope

- **New section at the top of Favorites: "Your teams' matches".**
  - **Upcoming:** the favorite teams' matches that aren't finished and kick off
    within the next 30 days, soonest first. Live matches count as upcoming and
    come first because they kicked off earliest.
  - **Results:** finished matches from the last 30 days, newest first.
  - Teams are merged into one list, and a match between two favorite teams
    shows once (deduplicated by match ID).
  - Rows reuse `MatchRow` with `favorite` set. Selecting one opens the existing
    match detail through `openMatch`.
- **Data:** one ESPN team-schedule request per favorite team. The requests are
  made the first time the Favorites tab opens in a popup session, and again
  when the set of favorite team IDs changes while the tab is open. There is no
  stored cache. All requests go to `site.api.espn.com`, the host Footly
  already uses.
- **States:**
  - No favorite teams: the existing "No favorite teams yet" message only; no
    requests.
  - Loading: the existing `MatchListSkeleton`.
  - Every team failed: a `MatchListError`-style message for the most relevant
    `FailureReason`, with Retry.
  - Some teams failed: a "Some teams' matches couldn't be loaded." alert with
    Retry, above whatever loaded.
  - Nothing in either window: "No matches for your teams in the next 30 days."
    plus the Results group when it has any.
- **Removed from Favorites:** the "Leagues", "Club competitions" and "National
  teams" follow sections. Until 25b ships, competitions can still be followed
  from Search, which already lists them with a follow star, and from the local
  league card.
- **Unchanged:** the "Your teams" list and "Find teams" search.

## Out of scope

- Moving competitions or the follow control to Home (25b).
- Live auto-refresh of this list. It loads once per tab visit and on Retry; the
  existing live refresh still updates the main match list.
- Notifications and the background planner.
- Botola Pro or any other provider.
- A stored cache for team schedules.

## Build loop

Per `blueprint/config.json` (`stepReview: feature`, `checkpointCommits:
disabled`): build every step, run focused checks while iterating, then present
one review packet. `/complete` makes the single feature commit.

## Build steps

- [x] **1. Confirm the team schedule endpoint and normalize it.**
  - With `curl` (read-only, no credentials), find one ESPN URL that returns a
    team's matches across all its competitions in one request. Try
    `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/<teamId>/schedule`
    first, plus whatever query is needed for upcoming fixtures (for example
    `?fixture=true`). Use a team with both league and cup or European matches,
    such as Arsenal or Real Madrid. Record in the review packet the URL(s),
    whether past and upcoming matches need separate requests, and where each
    event's competition ID (slug), name and logo live.
  - **Stop and revise the spec** if no request keyed by the team ID alone
    covers every competition, or if events don't identify their competition
    slug. A favorite team stores only `id`, `name`, `shortName` and `logo`, so
    there is no league to fall back on.
  - In `src/api/espn.ts`, add `teamScheduleUrl(teamId, …)` and
    `normalizeTeamSchedule(json)`.
    - Reuse `toMatch` with the event's own `Competition` (`id` = ESPN slug,
      `name`, `logo` when present).
    - Skip malformed events and events without a competition slug.
    - Throw `EspnResponseError` for a malformed body, as `normalizeScoreboard`
      does.

  **Done when:** `npm test` passes, with `src/api/espn.test.ts` cases built
  from a trimmed fixture of the real response shape:
  - a league match and a cup match each normalize with their own competition;
  - malformed and competition-less events are skipped;
  - a body without an events list throws `EspnResponseError`.

- [x] **2. Load and merge the teams' matches.**
  - In `src/api/football.ts`, add `getTeamMatches(teams, { now, fetchImpl,
    isOnline })`. It returns `{ upcoming, results, failedTeamIds, teamIds,
    failureReason? }`.
    - Fetch per team with `Promise.allSettled` and `fetchJson`.
    - Deduplicate by match ID.
    - Apply the 30-day windows against `now`, then sort upcoming by kickoff
      ascending and results newest first.
    - Expected failures are reported per team with the most relevant reason
      (the existing `REASON_PRIORITY`). Unexpected errors are rethrown, as in
      `getTeamCatalog`.
  - An empty team list returns empty results without a request.

  **Done when:** `npm test` passes, with `src/api/football.test.ts` cases for:
  - one request per team, to the confirmed URL;
  - a shared match between two favorites appears once;
  - the window and sort edges: kickoff exactly 30 days ahead and a result exactly
    30 days old are included, and anything just beyond is dropped;
  - a partial failure gives `failedTeamIds` and a reason; all failing gives
    every ID;
  - an unexpected error is rethrown;
  - no teams means no fetch.

- [x] **3. Show them in Favorites.**
  - Add `src/hooks/useTeamMatches.ts`, modeled on `useTeamCatalog`'s
    enabled-once loading. It loads when `enabled && ready`, reloads when the
    sorted favorite team IDs change while enabled, and exposes `state` (`idle |
    loading | error | success`) and `retry`. It ignores results from a
    superseded request.
  - In `FavoritesPanel.tsx`:
    - add the "Your teams' matches" section with Upcoming and Results groups and
      the states listed in In scope;
    - remove the `Competitions` sections and their now-unused imports;
    - add `onSelectMatch` and `now` props.
  - In `src/App.tsx`, call the hook with `tab === 'favorites'` and pass
    `openMatch`. Check that opening a match from a competition outside
    `COMPETITIONS` (for example a cup) loads its detail. `summaryUrl` takes any
    slug, but confirm nothing on that path validates against the catalog.

  **Done when:** `npm run lint`, `npm test`, and `npm run build` pass. In the
  built popup, with Arsenal favorited, Favorites shows Arsenal's upcoming and
  recent matches, including a non-Premier League one if Arsenal has one in the
  window, and selecting a row opens its detail. With no favorites, no team
  schedule request is made. If no browser is available, the packet says this
  wasn't run.

## Files / areas

- `src/api/espn.ts` and `src/api/espn.test.ts`: URL and normalizer
- `src/api/football.ts` and `src/api/football.test.ts`: `getTeamMatches`
- `src/hooks/useTeamMatches.ts`: new hook
- `src/components/favorites/FavoritesPanel.tsx`: new section, competition lists
  removed
- `src/App.tsx`: wiring

## Data / contracts

- No new stored data. Favorite teams stay `{ id, name, shortName?, logo? }` in
  `chrome.storage.local`.
- `Match` and `Competition` are unchanged. A schedule match's `competition.id`
  is the ESPN slug of the event's own league, which may be outside
  `COMPETITIONS`.
- The result shape of `getTeamMatches` is above. `failureReason` is set only
  when at least one team failed, and it is never saved.
- Request cost: N favorite teams means N requests (or 2N if step 1 shows past
  and upcoming need separate calls), only on Favorites visits.

## Testing

- Vitest unit tests for the normalizer (step 1) and `getTeamMatches` (step 2),
  using injected `fetchImpl` and `now` as the existing tests do.
- The hook and panel are UI wiring. Per the coding standards they get no unit
  test; they are checked with lint, the build, and the built popup when
  available.
- Final gate: `npm run lint`, `npm test`, `npm run build`. No Verify command is
  declared.

## Notes for the AI

- Team names, competition names and logo URLs come from ESPN. Render them as
  React text and `Crest` `src` only, as everywhere else; never as HTML.
- Keep the request count proportional. Never fetch schedules while another tab
  is active, and never on popup open unless Favorites is the open tab.
- Follow `useTeamCatalog` and `getTeamCatalog` for error classification:
  expected provider failures become `FailureReason`s, and anything else reaches
  the unexpected-error path.
- Use the 30-day window as a named constant next to `getTeamMatches`; it is a
  reversible display choice.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8796,"specSha256":"3916506465fadcd8a210fbcaf8adeea8df9630f6b55da048b769424c4cd70110","branch":"refs/heads/feature/your-teams-matches-in-favorites","head":"8df65a516860c91118acd882ca09a7815eef53ab","baseRef":"refs/heads/main","baseCommit":"8df65a516860c91118acd882ca09a7815eef53ab","sourceTree":"29da7bbd2bf34e8e04223475d2c68880557e25bf","absentOptional":[]} -->
