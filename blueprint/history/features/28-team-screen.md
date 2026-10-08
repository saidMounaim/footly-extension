# Feature: Team Screen

**From build-plan:** feature 28
**Build attempt:** 1
**Branch:** feature/team-screen
**Status:** verified

## Goal

Let the user check any team's upcoming matches and recent results without following it. Tapping a team in Search or in Favorites' Find teams opens a team screen with the team's crest, a Follow star, and its matches in every competition. The matches come from the team's ESPN schedule and load only while the screen is open.

## In scope

- A new team screen in the competition screen's style (revised at review: switch plus collapsible competitions):
  - Back button, crest, team name as the heading (focused on open), and a Follow star (`FavoriteToggle`) in the header.
  - The same Upcoming / Results pill switch as the competition screen, shared as `ViewSwitch`.
  - The chosen list grouped by competition (`groupByCompetition`), each group a collapsible `<details>` (open by default) with the competition logo, name, and match count. Upcoming groups follow the soonest kickoff, Results groups the newest result.
- Data from `getTeamMatches([team])`, unchanged: two ESPN schedule requests, 30-day window (`TEAM_MATCH_WINDOW_DAYS`). Requested only while the screen is open. Reopening the same team reuses the loaded result, like the Favorites tab does.
- Entry points:
  - Search tab → Teams results.
  - Favorites tab → Find teams results.
  - Each row becomes an open button (crest and name) plus a separate star button. The star keeps its current label and behavior.
- States:
  - Loading: skeleton.
  - Error (offline, rate limited, unavailable, invalid, unexpected): `MatchListError` with Retry.
  - Empty upcoming: "No matches for <team> in the next 30 days."
  - Empty results: "No results for <team> in the last 30 days."
- Navigation:
  - Opening a match from the team screen shows match detail. Back returns to the team screen with its scroll and focus.
  - Back from the team screen returns to the list it came from, restoring scroll and focusing the row that opened it.
  - Settings can open over it.
  - "Manage favorites" from Settings closes it.
- Rows on the team screen get the favorite marker when either side is a favorite team, the same rule Search uses.

## Out of scope

- Opening a team from the match detail header, Favorites' "Your teams" list, match rows, or Home (decided: search lists only).
- A different window or "last/next N matches" (decided: the 30-day window).
- Making teams from unloaded competitions findable (overview open question: Search and Find teams only list teams from loaded data).
- Team info beyond matches: squad, standings, stats, form.
- Any change to `getTeamMatches`, ESPN normalization, caching, the service worker, notifications, or permissions.

## Build loop

`workflow.stepReview` is `feature`: build all steps, running lint, test, and build after each one. Present one review packet after the last step. `workflow.checkpointCommits` is `disabled`, so no commits between steps. `/complete` creates the feature commit.

## Build steps

- [x] **1. Share the Upcoming / Results switch.** Move the pill radio group and its arrow-key handling out of [CompetitionScreen.tsx](../../src/components/competition/CompetitionScreen.tsx) into `src/components/matches/ViewSwitch.tsx`. The competition screen uses it unchanged. (Replaces the original step 1, which shared the Favorites match list; reverted when the layout was revised.)
  **Done when:** the competition screen's switch looks and behaves as before (click, arrows, Home/End), and lint, test, and build pass.

- [x] **2. Team screen opened from Search.** Add `src/components/team/TeamScreen.tsx`. In [App.tsx](../../src/App.tsx), add the `openTeam` state, a second `useTeamMatches(openTeam !== null, openTeam ? [openTeam] : NO_TEAMS)`, and the layering:
  - Tabs are hidden while a team is open.
  - The team screen stays mounted but hidden under an open match or Settings, like `CompetitionScreen`.
  - On open, store the trigger and `scrollY`.
  - On Back, restore scroll, then focus the trigger if it is still connected, otherwise the current tab's button.
  - `manageFavorites` also clears `openTeam`.

  Add `src/components/team/TeamRow.tsx` (open button plus `FavoriteToggle`). Use it for the Search tab's Teams results, passing an `onOpenTeam` callback.
  **Done when:**
  - Searching a team and tapping its name shows its header and matches, or the loading, error, or empty state.
  - The star follows and unfollows on both the row and the screen.
  - Match → Back → Back lands on the same search row.
  - lint, test, and build pass.

- [x] **3. Open from Find teams and tidy.**
  - Use `TeamRow` in Favorites' Find teams results.
  - Update the `useTeamMatches` doc comment so it no longer says it only serves the Favorites tab.
  - Make sure the team screen's Back label names the list it returns to ("Back to search" or "Back to favorites").

  **Done when:**
  - Tapping a Find teams result opens the same screen.
  - Back returns focus to that row.
  - The Favorites tab's own team matches still load only on that tab.
  - lint, test, and build pass.

## Files / areas

- `src/components/matches/ViewSwitch.tsx` (new, moved from CompetitionScreen)
- [src/components/competition/CompetitionScreen.tsx](../../src/components/competition/CompetitionScreen.tsx): uses `ViewSwitch`
- `src/components/team/TeamScreen.tsx` (new)
- `src/components/team/TeamRow.tsx` (new)
- [src/components/favorites/FavoritesPanel.tsx](../../src/components/favorites/FavoritesPanel.tsx): Find teams results use `TeamRow`, takes `onOpenTeam`
- [src/components/search/SearchPanel.tsx](../../src/components/search/SearchPanel.tsx): Teams results use `TeamRow`, takes `onOpenTeam`
- [src/App.tsx](../../src/App.tsx): `openTeam` state, second `useTeamMatches`, layering, back and focus
- [src/hooks/useTeamMatches.ts](../../src/hooks/useTeamMatches.ts): doc comment only

## Data / contracts

- No new persisted data, API calls, or types. The team screen receives a `Team` (`id`, `name`, optional `shortName` and `logo`) from the list that opened it. Following stores it through the existing `favorites.toggle(team)`.
- `getTeamMatches([team])` returns `TeamMatchesResult`. With one team, a failed request makes `failedTeamIds` equal `teamIds`, and the hook reports `error`. The partial-failure banner therefore never appears on the team screen.
- Crest: `team.logo ?? logos.teams.get(team.id)`. The `Crest` component handles the initials fallback.
- Team names render as React text, never as HTML.

## Testing

- Lint, test, and build run after every step (`npm run lint`, `npm test`, `npm run build`). There is no Verify command.
- No new pure logic is expected: data and windowing stay in the already-tested `getTeamMatches`, and the work is UI wiring, which the coding standards keep out of unit tests. If a step extracts a pure helper where a wrong answer is possible (for example the favorite-row rule), add a `*.test.ts` next to it.
- Manual check in Chrome (or `/check`): open from both lists, loading/error (offline)/empty states, follow from the screen, match → back → back focus and scroll, Settings → Manage favorites while a team is open.

## Notes for the AI

- Mirror `CompetitionScreen`'s header markup and heading focus. Collapsible groups follow the substitutes `<details>` pattern in `MatchLineups.tsx`. Use a distinct heading id (`team-title`).
- Keep the star's existing `aria-label` and `aria-pressed`. The open button's accessible name is the team name; give it a label like "Show <team> matches" only if the name alone is ambiguous next to the star.
- Do not reuse the Favorites tab's `useTeamMatches` instance. The team screen has its own, so its request doesn't change what the Favorites tab has loaded.
- Search and Favorites panels stay mounted (hidden) while the team screen is open, so their query text and results survive Back.
- No em dashes in code comments or copy.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7947,"specSha256":"1c767c5e300f2fea3c9c26f7eeef062244eb4a8d97f100dc44a044051d00c299","branch":"refs/heads/feature/team-screen","head":"fffe82763c6cb6c7a83a480c1376db0f9c5bbb0a","baseRef":"refs/heads/main","baseCommit":"fffe82763c6cb6c7a83a480c1376db0f9c5bbb0a","sourceTree":"2e62316aaa37b41d5d17dba9fca0f6917801b86a","absentOptional":[]} -->
