# Feature: Personalized Home

**From build-plan:** feature 12
**Build attempt:** 1
**Branch:** feature/personalized-home
**Status:** verified

## Goal

Opening the popup lands on a simple `Home` tab that answers "what matters to me
right now" at a glance. It shows live matches first, with recent events for the
top one, then the user's next favorite-team match with its countdown, then a short
list of the next important games. The data comes from the match list the popup
already loads, so the only new request is one match summary for the featured live
match, made only while Home is visible.

## In scope

- A new `Home` tab, first in the tab bar and selected by default. `Upcoming`,
  `Results`, `Favorites`, and `Search` keep their current behavior.
- The tab bar moves to the bottom of the popup and stays visible there (sticky),
  following the overview's "bottom navigation". It keeps the existing
  `role="tablist"` keyboard behavior and stays hidden while a match is open.
- A pure selection function that builds the Home sections from `MatchListResult`,
  the favorite team IDs, and the followed competition IDs:
  - **Live now:** every `live` or `halftime` match from `result.upcoming`. Order
    them favorite-team matches first, then followed competitions, then the rest,
    keeping kickoff order inside each group. Reuse `splitByFavorites` and
    `splitByCompetitions`.
  - **Featured live match:** the first match in Live now.
  - **Your next match:** the earliest `upcoming`-status match involving a
    favorite team. `null` when there is none.
  - **Next up:** up to 5 `upcoming`-status matches in kickoff order that involve
    a favorite team or a followed competition, excluding Your next match and
    anything already in Live now. If the user has no favorite teams and follows no
    competitions, use the next 5 `upcoming`-status matches overall.
- Home UI:
  - **Live now** section using `MatchRow`. The featured match also gets a compact
    card showing its last 3 events in chronological order, using the existing
    timeline event rendering. The card has its own loading skeleton,
    "No match events yet." when the list is empty, and an error with Retry. It
    also has an "Open match" button that opens the existing match detail view.
  - **Your next match** card: competition, both teams, kickoff day/time, and the
    existing countdown text. Selecting it opens the match detail view.
    - With no favorite teams: "No favorite teams yet." plus a button that switches
      to the `Favorites` tab.
    - With favorite teams but no upcoming match for them in the window: "No
      matches for your teams in the next 7 days."
  - **Next up** section using `MatchRow` (the favorite star where it applies).
    Hidden when empty.
  - When Live now, Your next match, and Next up are all empty and the user has no
    favorites, the "No favorite teams yet." prompt is the whole page body.
  - The loading, error, and partial-failure states are the same as the match lists
    (`MatchListSkeleton`, `MatchListError`, and the "Some competitions couldn't be
    loaded." banner with Retry).
- The featured live card fetches its summary with `useMatchDetails` and keeps it
  fresh with `useLiveRefresh`. It is mounted only while the Home tab is active and
  no match detail is open, so a hidden Home makes no summary requests.

## Out of scope

- Settings tab, refresh preferences, theme switching (features 13 and 14).
- New error/offline handling beyond the existing states (feature 15).
- Pinning, reordering, or hiding Home sections; new stored preferences.
- Changing the match list fetch, cache, background worker, or notifications.
- Rendering the overview's `Settings` item in the bottom navigation.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet for the whole feature. `workflow.checkpointCommits` is `disabled`: no
commits after steps. `/complete` creates the feature commit.

## Build steps

- [x] **1. Home selection logic.** Add `src/lib/home.ts` exporting
  `buildHome(result, favoriteIds, competitionIds)`, which returns
  `{ live: Match[]; nextMatch: Match | null; nextUp: Match[] }` according to the
  rules above. Also export `NEXT_UP_LIMIT = 5`, plus `recentEvents(events, count)`,
  which returns the last `count` events in chronological order. Add
  `src/lib/home.test.ts`.
  **Done when:** `npm test` passes with cases for live ordering (favorite, then
  followed, then rest; halftime counts as live), nextMatch skipping
  postponed/cancelled/live, nextMatch null with no favorites, nextUp exclusion and
  limit, nextUp fallback when nothing is followed, empty input, and
  `recentEvents` with fewer than or more than `count` events.

- [x] **2. Home tab and bottom navigation.** Add `'home'` to `MatchTab` and first
  in `MATCH_TABS`, then default `App` to `'home'`. Move `MatchTabs` after the
  panels and make it sticky at the bottom with the surface background and top
  border. Reduce the tab button horizontal padding so the five labels fit in the
  360px popup without truncation. Add `src/components/home/HomePanel.tsx`
  rendering the loading/error/banner states plus the Live now (rows only), Your
  next match, and Next up sections and empty states from `buildHome`. Move the
  partial-failure banner out of `MatchList` into a shared exported component
  rather than copying it.
  **Done when:** `npm run build` and `npm run lint` pass. In the loaded extension,
  the popup opens on Home, and arrow/Home/End keys move across all five tabs at
  the bottom. Selecting a row or the next-match card opens the detail view, and
  Back restores focus. The no-favorites button switches to Favorites.

- [x] **3. Featured live match events.** Add the featured live card to
  `HomePanel` using `useMatchDetails` + `useLiveRefresh` and the last 3 events via
  `recentEvents`. Render it with an exported event-row component from
  `MatchTimeline.tsx` (no duplicated event markup), keyed by match ID and mounted
  only while Home is active and no detail is open. Add the loading, empty, and
  error-with-Retry states plus the "Open match" button.
  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass. During a
  real live match (or with the summary fetch failing), the card shows the
  events, or the error and Retry. In DevTools Network, switching away from Home
  stops further summary requests.

## Files / areas

- `src/lib/home.ts`, `src/lib/home.test.ts` (new)
- `src/components/home/HomePanel.tsx` (new)
- `src/components/matches/tabs.ts`: `'home'` tab; `ListTab` still excludes it
  (`Exclude<MatchTab, 'home' | 'favorites' | 'search'>`)
- `src/components/matches/MatchTabs.tsx`: padding only; keyboard logic unchanged
- `src/components/matches/MatchList.tsx`: export the shared partial-failure banner
- `src/components/matches/MatchTimeline.tsx`: export the event row
- `src/App.tsx`: default tab, Home panel branch, tab bar placement, pass
  `changeTab` for the Favorites shortcut
- Reused as is: `useMatchList`, `useMatchDetails`, `useLiveRefresh`, `useNow`,
  `MatchRow`/`StatusText`, `upcomingLabel`, `dayLabel`/`formatKickoff`,
  `splitByFavorites`, `splitByCompetitions`

## Data / contracts

- No new storage keys, permissions, endpoints, or model fields. Inputs are the
  existing `MatchListResult` (`upcoming` already includes live, halftime,
  postponed, and cancelled matches in kickoff order) and the existing favorite
  sets.
- `buildHome` is pure and deterministic: it takes no clock and does not mutate
  its inputs. Countdowns keep using the `now` from `useNow` in the UI.
- Team and competition names render as React text only (no HTML injection), as
  in the existing rows.

## Testing

- Vitest unit tests for `src/lib/home.ts` (step 1). UI components are not
  unit-tested, per coding standards. Steps 2 and 3 rely on build, lint, and a
  manual Chrome check of the loaded extension.
- No browser test command exists; do not claim automated UI coverage.
- Live events can only be checked during a real live match or by forcing the
  summary request to fail. Record which one was actually observed.

## Notes for the AI

- The selection rules above (what counts as "next important games", the limit of
  5, featured = top live match, and postponed/cancelled excluded from Home) are
  the choices recorded for this spec. They are reversible UI behavior; change them
  only on review feedback.
- Keep tab panels mounted and hidden as today. Only the featured live card is
  mounted conditionally, to avoid background summary requests.
- Keep the tablist DOM order matching its visual position (after the panels), so
  screen reader order follows the screen.
- Use `sectionHeadingClass` for section headings and give each section an
  `aria-labelledby` ID prefixed with `home-`, so IDs never collide with the
  Upcoming panel.
- Status must stay text/icon based, never color alone (existing `StatusText`).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8955,"specSha256":"b71a52d32797c66898973fb3da72395385c45b4ae723a83057e46a8b1b3d317f","branch":"refs/heads/feature/personalized-home","head":"4fb165cb953d37ecaa04371ec7d65909805807c3","baseRef":"refs/heads/main","baseCommit":"4fb165cb953d37ecaa04371ec7d65909805807c3","sourceTree":"8cca5dbf29832dc995da72d8c6cc8cac4e43248e","absentOptional":[]} -->
