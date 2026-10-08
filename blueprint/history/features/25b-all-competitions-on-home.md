# Feature: All Competitions on Home

**From build-plan:** feature 25b
**Build attempt:** 1
**Branch:** feature/all-competitions-on-home
**Status:** verified

## Goal

Home lists every competition Footly knows, not only the defaults and the ones
you follow. Unfollowed competitions load their matches only when you open them,
so the default request count stays the same. Follow and unfollow move into the
competition screen, which replaces the lists that 25a removed from Favorites.

## In scope

- **Home sections**, in this order:
  1. **Your competitions:** the six defaults, then followed extras, in
     `competitionsToLoad` order. These keep today's cards with a live count or
     the next kickoff, and today's loading, error, stale and partial-failure
     states. This replaces today's "Competitions" heading.
  2. **Club competitions:** `CLUB_EXTRAS` you don't follow, in catalog order.
  3. **National teams:** `NATIONAL_TEAM_EXTRAS` you don't follow, in catalog
     order.

  Sections 2 and 3 use the same card shape with crest and name but no status
  line, because their matches aren't loaded. Each card's accessible name is the
  competition name. A section with no cards, because everything in it is
  followed, isn't rendered. Sections 2 and 3 render whatever the match list's
  state, since they need no data.
- **Opening an unloaded competition:** the competition screen loads that one
  competition on demand with `getMatchList({ competitions: [it] })`. That's the
  same scoreboard requests the main list makes per competition, only while the
  screen is open.
  - It has the same states as the main list: loading skeleton, error with Retry
    (`allCompetitionsFailed`), and success. Retry reloads only that competition.
  - A competition the main list already covers (`result.competitionIds`
    includes it) uses the main state, as today, with no extra request.
- **Follow button** in the competition screen header: the existing
  `FavoriteToggle` star (icon-only, labelled "Add/Remove <name> to/from
  favorites"), disabled until saved competitions are `ready`.
  - Following adds the competition to Your competitions, and the main list
    reloads in the background as it does today when follows change.
  - Unfollowing an extra moves it back to its browse section.
  - A failed save shows the existing shared save-error alert and rolls back, as
    in Search.
- **Focus on Back:** today, focus returns to the card that opened the screen.
  If following or unfollowing moved that card to another section, that element
  no longer exists. Focus then goes to the competition's card in its new place,
  found by competition ID, or to the Home heading when it has none.

## Out of scope

- Search, Favorites (25a), the local league card, notifications and the
  background planner.
- Persisting on-demand results or adding them to the saved match list
  snapshot.
- Botola Pro or any other provider.

## Build loop

Per `blueprint/config.json` (`stepReview: feature`, `checkpointCommits:
disabled`): build every step, run focused checks while iterating, then present
one review packet. `/complete` makes the single feature commit.

## Build steps

- [x] **1. Load an opened competition on demand.**
  - In `src/lib/home.ts`, add a pure `coversCompetition(state, id)`: true when
    the main state is `success` and `result.competitionIds` includes `id`.
  - Add `src/hooks/useCompetitionMatches.ts`. Given the open competition (or
    null) and the main `MatchListState`, it returns `{ state, retry }`:
    - when the main state covers the competition, the main state and the main
      `retry`;
    - otherwise it fetches that single competition while it is open and
      returns a `MatchListState` (`loading`; `success` with `loadedAt`; `error`
      with the reason when it failed), ignoring results for a competition that
      is no longer open;
    - unexpected errors are logged and become `reason: 'unexpected'`, as in
      `useMatchList`.
  - In `src/App.tsx`, pass this state and retry to `CompetitionScreen` instead
    of the main ones.

  **Done when:** `npm test` passes, with `src/lib/home.test.ts` covering
  `coversCompetition` for loading, error, a covering success and a
  non-covering success. Opening a followed competition from Home behaves as
  before; no other UI change yet.

- [x] **2. List every competition on Home.**
  - In `src/lib/home.ts`, add a pure `homeSections(followedIds)` returning
    `{ yours, clubs, national }` as described in In scope.
  - In `src/components/home/HomePanel.tsx`:
    - render "Your competitions" with today's cards and states;
    - add the "Club competitions" and "National teams" sections with
      status-less cards that open the competition screen, through the same
      `onOpenCompetition` with the button as trigger;
    - each card gets `data-competition-id`.
  - In `src/App.tsx`, pass `competitions.idSet`, which HomePanel already
    receives as `followedIds`. `competitions` stays the loaded list for Your
    competitions.

  **Done when:** `npm test` passes, with `homeSections` cases:
  - nothing followed gives the six defaults in Your competitions and every
    extra in its group;
  - a followed club and a followed national-team competition move to Your
    competitions, in catalog order, and leave their groups;
  - following a default changes no group.

  `npm run build` passes, and in the built popup Home shows the three sections.
  Opening Copa Libertadores while unfollowed shows its matches or its empty
  state, not an error.

- [x] **3. Follow from the competition screen, and keep focus on Back.**
  - `CompetitionScreen` takes `followed`, `followReady` and `onToggleFollow`,
    and renders `FavoriteToggle` at the end of the header row.
  - In `src/App.tsx`, wire them to `competitions.isFavorite(id)`,
    `competitions.ready` and `competitions.toggle(id)`.
  - In `closeCompetition`, when the saved trigger is no longer connected
    (`!trigger.isConnected`), focus
    `[data-competition-id="<id>"]` on Home, falling back to the
    `#home-competitions` heading. Query with `CSS.escape(id)`.

  **Done when:** `npm run lint`, `npm test` and `npm run build` pass. In the
  built popup:
  - following Copa Libertadores from its screen and going Back shows it under
    Your competitions with a status, focused;
  - unfollowing it puts it back under Club competitions;
  - the star has an accessible name and pressed state.

  If no browser is available, the packet says this wasn't run.

## Files / areas

- `src/lib/home.ts` and `src/lib/home.test.ts`: `coversCompetition` and
  `homeSections`
- `src/hooks/useCompetitionMatches.ts`: new
- `src/components/home/HomePanel.tsx`: sections and status-less cards
- `src/components/competition/CompetitionScreen.tsx`: follow star
- `src/App.tsx`: wiring and focus fallback

## Data / contracts

- No new stored data. Followed competition IDs stay in the existing
  `favoriteCompetitions` storage, validated against `COMPETITIONS`.
- `MatchListState` and `MatchListResult` are unchanged. An on-demand result is
  a normal `MatchListResult` for one competition, held in memory only while
  that screen is open.
- Request cost: unchanged on popup open. Opening an unfollowed competition
  costs that competition's scoreboard requests (one per month in the window,
  usually 1 or 2).

## Testing

- Vitest unit tests for `coversCompetition` and `homeSections` in
  `src/lib/home.test.ts`. Pure logic is the project's test scope.
- The hook, cards, star and focus fallback are UI wiring. Per the coding
  standards they get no unit test; they are checked with lint, the build, and
  the built popup when available.
- Final gate: `npm run lint`, `npm test`, `npm run build`. No Verify command is
  declared.

## Notes for the AI

- Competition names and logos come from the catalog and ESPN. Render them as
  text and `Crest` `src` only.
- Don't load unfollowed competitions on Home render. Only an open competition
  screen may request them.
- Keep `competitionSummaries` unchanged and feed it only Your competitions.
- `FavoriteToggle`'s label says "favorites"; keep it for consistency with
  Search.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8161,"specSha256":"8335ea2691651f84e325fb598a1524ac8a8991e3d21678efa6c3c48b0ea1ccc9","branch":"refs/heads/feature/all-competitions-on-home","head":"3e1e62756ae7726324aba13a04fcaaa21b745eb2","baseRef":"refs/heads/main","baseCommit":"3e1e62756ae7726324aba13a04fcaaa21b745eb2","sourceTree":"18b6b8d284f6587792631205b8168f050fa628e7","absentOptional":[]} -->
