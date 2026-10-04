# Feature: Match Center

**From build-plan:** feature 10
**Build attempt:** 1
**Branch:** feature/match-center
**Status:** verified

## Goal

Turn feature 2's match detail view into a focused match center: alongside the
score, status, and timeline it already shows, it adds basic team statistics
(possession, shots, shots on target, corners, fouls) and both starting lineups
with substitutes, when ESPN's match summary supplies them. Sections the
provider does not supply are hidden, never shown as empty values.

## In scope

- `TeamMatchStats`, `Lineup`, and `LineupPlayer` types and the optional
  `Match.stats` and `Match.lineups` fields, exactly as the project plan defines them.
- Normalizing `boxscore` team statistics and `rosters` from the same ESPN
  summary response `getMatchDetails` already fetches. No new requests, endpoints,
  or permissions.
- A Statistics section and a Lineups section in `MatchDetail`, below the
  existing timeline, each rendered only when its data exists.
- Background refreshes (`refresh` via `useKickoffChecks`) update stats and
  lineups the same way they update the timeline.

## Out of scope

- Player-level statistics, ratings, heat maps, extended history, head-to-head,
  and standings (project plan keeps these out of the MVP).
- Any other stat beyond the five in `TeamMatchStats`.
- Tabs or a separate route for the match center. Sections stack in the
  existing scrolling detail view.
- Caching or refresh changes (feature 11), new error/offline handling (feature
  15), and theme work (feature 14).
- Linking lineup players to events or showing substitution times in the lineup.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`: build all steps, running the step checks as you go, then present
one review packet for the whole feature. No checkpoint commits. `/complete`
creates the single feature commit.

## Build steps

- [x] 1. **Model and real fixture.** Add `TeamMatchStats`, `Lineup`,
  `LineupPlayer`, and the optional `stats` and `lineups` fields to `Match` in
  `src/api/types.ts`, matching the project plan's data model. Capture a real ESPN
  summary for a finished top-league match (`summaryUrl(slug, id)`) and save a
  trimmed copy as `src/api/fixtures/espn-summary-center.json`. Keep `header`,
  `boxscore.teams`, and `rosters` with only the fields the normalizer reads
  (several players per side are enough). Before writing the normalizer, confirm
  from that capture the actual keys for team id, statistic `name` and `displayValue`
  for the five stats, roster `homeAway`/`team.id`, `formation`, `starter`,
  `jersey`, `athlete.id`/`displayName`, and `position.abbreviation`. If the
  live summary has no `boxscore` or `rosters`, stop and report rather than
  guessing the shape.
  **Done when:** `npm run build` passes with the new optional fields and the
  fixture exists with real provider data.

- [x] 2. **Normalize stats and lineups.** In `src/api/espn.ts`, extend
  `normalizeSummary` to set `stats` and `lineups` using the rules under Data /
  contracts. Unusable data leaves the field absent; it never throws and never
  affects status, score, or events. Add tests in `src/api/espn.test.ts` against
  the new fixture and focused inline inputs.
  **Done when:** `npm test` passes, including: the real fixture yields both
  sides' stats and lineups. Sides are matched by team id, not array order.
  Out-of-range possession, negative or non-numeric counts, players without id or
  name, and missing `boxscore`/`rosters` are dropped. The existing summary fixture
  still produces no `stats`/`lineups` and unchanged events.

- [x] 3. **Statistics section.** Add `src/components/matches/MatchStats.tsx` and
  render it in `MatchDetail` below the timeline, only when the details request
  succeeded and `match.stats` exists. It is a `<table>` with an `sr-only` caption,
  team short names as column headers, and one row per stat (`<th scope="row">`)
  in the order Possession, Shots, Shots on target, Corners, Fouls. Possession
  renders as a rounded whole percent (`55%`).
  **Done when:** `npm run build` and `npm run lint` pass. In the loaded extension,
  a finished match with stats shows the section with values matching ESPN, and a
  match without stats (an upcoming one) shows no Statistics heading.

- [x] 4. **Lineups section.** Add `src/components/matches/MatchLineups.tsx` and
  render it below Statistics, only when `match.lineups` exists. Each team gets a
  heading with its name and formation (when present), an ordered starters list,
  and a Substitutes list when non-empty. Each player row shows jersey (when
  present), name, and position (when present). Sides stack vertically to fit the
  popup width.
  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass. In the
  loaded extension, a finished match shows both lineups matching ESPN with no
  horizontal scroll, and a match without rosters shows no Lineups heading.
  Loading still shows the timeline skeleton only, and the error state still shows
  the single Retry alert with no stats or lineups sections.

## Files / areas

- `src/api/types.ts` - new types and optional `Match` fields.
- `src/api/espn.ts` - `normalizeSummary` plus private helpers for boxscore and rosters.
- `src/api/espn.test.ts` - normalizer tests.
- `src/api/fixtures/espn-summary-center.json` - new trimmed real summary.
- `src/components/matches/MatchDetail.tsx` - render the two new sections in the success state.
- `src/components/matches/MatchStats.tsx`, `src/components/matches/MatchLineups.tsx` - new.
- Unchanged: `src/api/football.ts` (`getMatchDetails` already returns `normalizeSummary`'s
  result), `src/hooks/useMatchDetails.ts`, `src/background.ts` (reads only `status`
  and `events`, persists only status and seen event ids), `manifest.config.ts`.

## Data / contracts

Types follow `blueprint/project-plan.md` exactly:

```ts
stats?: { home: TeamMatchStats; away: TeamMatchStats }
lineups?: { home: Lineup; away: Lineup }
type TeamMatchStats = { possession?: number; shots?: number; shotsOnTarget?: number; corners?: number; fouls?: number }
type Lineup = { formation?: string; starters: LineupPlayer[]; substitutes: LineupPlayer[] }
type LineupPlayer = { id: string; name: string; jersey?: string; position?: string }
```

Normalization rules (ESPN input is untrusted, so reuse the existing
`isRecord`/`text` guards):

- **Side matching:** a `boxscore.teams[]` or `rosters[]` entry belongs to home
  or away only when its `team.id` equals `match.homeTeam.id` or
  `match.awayTeam.id`. Unknown or duplicate team entries are ignored (first wins).
- **Stat values:** read from the provider statistic list by name, using the keys
  confirmed in step 1. Counts are whole numbers >= 0. Possession is a finite
  number from 0 to 100, with a trailing `%` tolerated, and is stored unrounded.
  Anything else leaves that field undefined.
- **Stats presence:** a stat is usable only when both sides have it. Unusable
  stats are removed from both sides. `stats` is set only when at least one stat is
  usable. This keeps the UI from rendering half-empty rows.
- **Players:** require non-empty `id` and `name`. Optional `jersey` and
  `position` are non-empty strings. Starters vs substitutes come from the
  provider's starter flag, in provider order. Duplicate player ids within a side
  keep the first.
- **Lineups presence:** `lineups` is set only when both sides exist and each
  has at least one starter. `formation` is set only when it is a non-empty string.
- Missing or malformed `boxscore`/`rosters` never throws. The existing throw
  (non-object response) is unchanged.
- **Rendering:** all provider text (names, formation, position, jersey) renders
  as React text children. No `dangerouslySetInnerHTML`, and no provider URLs.

## Testing

`npm test` (Vitest) is configured, so step 2's normalizer logic needs tests in
the same diff (see Done when). UI components are not unit-tested, per coding
standards. Steps 3 and 4 are verified with `npm run build`, `npm run lint`, and
a manual check of the loaded extension against ESPN's data. No Browser tests
command exists, so no browser automation is added. There is no Verify command,
so it was not run while writing this spec.

## Notes for the AI

- The detail view's loading, error, and retry states already exist in
  `MatchDetail`/`useMatchDetails`. The new sections render only in the `success`
  branch and need no states of their own: missing data means the section is absent.
- Use visible `h3` section headings ("Statistics", "Lineups") so screen-reader
  users can navigate the sections. Keep the existing `section aria-label="Timeline"`.
- Match the existing styling idiom (`text-muted`, `border-border`,
  `tabular-nums`, `divide-y`) and keep rows compact.
- Uncommitted edits to `blueprint/project-plan.md` and
  `blueprint/context/project-overview.md` on `main` define this feature's scope.
  They carry onto the feature branch and land with the feature commit unless
  committed first.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9043,"specSha256":"aa0fd6a99c787ff8f36284f18ebdd55496840d21bcf6b384757f83f4959bf431","branch":"refs/heads/feature/match-center","head":"1635a077368bd5b2928fbd95d04f2c0ea012298b","baseRef":"refs/heads/main","baseCommit":"1635a077368bd5b2928fbd95d04f2c0ea012298b","sourceTree":"7c73ed3fea6e6ca3424b14f2c72dd52459f106ad","absentOptional":[]} -->
