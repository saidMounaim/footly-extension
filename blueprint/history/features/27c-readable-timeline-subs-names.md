# Feature: Readable Timeline, Subs & Names

**From build-plan:** feature 27c
**Build attempt:** 1
**Branch:** feature/readable-timeline-subs-names
**Status:** verified

## Goal

Make the match detail easier to read. The Summary timeline splits by team, with
home events on the left and away events on the right, each marked with its
crest. Substitutes say when they came on and who they replaced. Players' full
names show on the pitch and under the score, instead of the last word or a
cut-off name.

## In scope

- **Split timeline** (`MatchTimeline.tsx`):
  - **Layout:** each event row is a three-column grid. The minute sits in the
    centre column. A home event's content fills the left column, aligned
    towards the centre. An away event's content fills the right column, aligned
    towards the centre. Order stays chronological, in one `<ol>`.
  - **Row content:** the event icon (the existing football, card, missed
    penalty and substitution icons), the player's full name, and a small team
    crest (`Crest`, size `sm`) on the outer edge. "(pen)" and "(OG)" suffixes
    and the "Replaces <player>" line for substitutions stay. Long names wrap and
    are never truncated.
  - **Events without a team:** an event whose `teamId` matches neither team is
    shown centred across the full width under its minute, with no crest.
  - **Accessibility:** the visible team short-name text is replaced by the
    crest. Each row keeps an `sr-only` event label ("Goal:") and gains an
    `sr-only` team name, so screen readers hear the minute, type, player and
    team. Icons and crests are `aria-hidden`.
  - **Unchanged states:** the loading skeleton and the empty text ("No match
    events yet.") stay as they are.
- **Readable substitutes** (`MatchLineups.tsx`, inside the existing collapsible
  blocks from 27a):
  - **Used first:** substitutes who came on are listed first, in the order they
    came on. Each row shows the jersey number in a small disc, the full name, an
    up-arrow with the minute (for example "↑ 67'"), and a muted second line,
    "for <player off>", when the event names one.
  - **Unused after:** the rest follow under a small muted "Unused" label, in
    roster order, with the number disc, the full name and the position. The
    rows are muted. The label is not shown when nobody is unused or nobody came
    on.
  - **Matching:** a substitute counts as "came on" when a `substitution` event
    for the same team has `player` equal to the substitute's `name` (exact
    string, trimmed). The first such event wins. When nothing matches, which
    includes upcoming matches, matches whose events haven't loaded and name
    mismatches, the player is listed as unused. Nothing errors.
  - **Count and accessibility:** the summary keeps its total count. Each used
    row has an accessible text such as "Came on 67', for Bukayo Saka".
- **Full names on the pitch** (`MatchLineups.tsx` `PitchPlayer`): show
  `player.name` in full, centred, in smaller text (10px), wrapping at spaces to
  at most two lines (`line-clamp-2`), with `title` set to the full name.
  `surname()` and its test are removed from `pitch.ts`, because nothing else uses
  them. Long names stay readable without the last-word guessing that turns
  "Virgil van Dijk" into "Dijk".
- **Full scorer names** (`MatchDetail.tsx` `Scorers`): the name wraps instead
  of being truncated. The minute and suffix follow the name on the same line
  when they fit, and the football icon stays at the line's start.

## Out of scope

- Player photos (27b). The number disc is where 27b can later put a photo, but
  27c adds no image or data field.
- Changes to the ESPN adapter, `Match` types, stats, tabs, or the score header's
  layout beyond the scorer name wrapping.
- Marking starters who were subbed off on the pitch.
- The stacked-list fallback's starter rows (`PlayerRow`), which stay as they
  are.

## Build loop

`workflow.stepReview` is `feature`: build all steps, keep the project working
after each one, then present one review packet at the end. Checkpoint commits
are disabled. `/complete` creates the single feature commit, and nothing is
committed during `/implement`.

## Build steps

- [x] 1. **Substitute matching with tests.** Add
  `substituteEntries(lineup, events, teamId)` to `src/lib/match.ts`. It returns
  `{ used: { player, minute, playerOff? }[], unused: LineupPlayer[] }` following
  the matching rules above.
  **Done when:** `match.test.ts` covers a matched sub with and without
  `playerOff`, ordering by event order, an unmatched sub becoming unused, the
  same name on the other team not matching, the first of duplicate events
  winning, surrounding whitespace, and no events at all. `npm test` passes.
- [x] 2. **Full names on the pitch and under the score.** Update `PitchPlayer`
  and `Scorers`, and remove `surname()` and its test.
  **Done when:** pitch players show full names on up to two centred lines with a
  hover title. Scorer names wrap without "…". `npm test`, `npm run lint` and
  `npm run build` pass.
- [x] 3. **Readable substitutes.** Render the used and unused groups from
  `substituteEntries` inside each team's substitutes block, both under the pitch
  and in the stacked-list fallback.
  **Done when:** a finished match lists the subs who came on first, with
  "↑ minute" and "for …", then a muted "Unused" group. An upcoming match lists
  everyone as unused with no "Unused" label. `npm run build` passes.
- [x] 4. **Split timeline.** Rework `EventRow` and `MatchTimeline` into the
  three-column layout.
  **Done when:** home events sit left and away events right, each with its
  crest, minutes are centred, and events without a team are centred. Long names
  wrap. Screen-reader text still names the type, player and team. The skeleton
  and empty state are unchanged. `npm test`, `npm run lint` and
  `npm run build` pass.

## Files / areas

- `src/components/matches/MatchTimeline.tsx`: split rows with crests.
- `src/components/matches/MatchLineups.tsx`: `PitchPlayer` full names, and
  `Substitutes` with used and unused groups.
- `src/components/matches/MatchDetail.tsx`: `Scorers` wrapping. It already
  passes the loaded `Match` (with `events`) to `MatchLineups`.
- `src/lib/match.ts` and `src/lib/match.test.ts`: `substituteEntries`.
- `src/lib/pitch.ts` and `src/lib/pitch.test.ts`: remove `surname`.
- `src/components/common/Crest.tsx`: reused as is.

## Data / contracts

There are no type, storage or adapter changes. The new helper is:

```ts
substituteEntries(
  lineup: Lineup,
  events: MatchEvent[],
  teamId: string,
): {
  used: { player: LineupPlayer; minute: string; playerOff?: string }[]
  unused: LineupPlayer[]
}
```

Player names and minutes come from the provider. They render only as React text
and `title` strings, never as HTML.

## Testing

- Vitest unit tests for `substituteEntries` in `src/lib/match.test.ts`, which is
  the logic gate for step 1. The `surname` test is removed along with the
  function.
- UI steps 2–4 are exempt from unit tests under the coding standards. They are
  verified by `npm run build`, `npm run lint`, and a manual popup check in both
  themes, with long names and a match that has substitutions, or `/check`.
- Baseline observed in this session, after 27a's completion: `npm test` 447
  passed, `npm run lint` clean, `npm run build` succeeded. No Verify command is
  declared.

## Notes for the AI

- **Name matching is unproven:** no saved fixture contains both `keyEvents` and
  `rosters` (`espn-summary.json` has only events, and
  `espn-summary-center.json` has only rosters). Matching by name is therefore
  unproven against real data. The unused fallback keeps it safe. Don't add
  fuzzy matching unless a live check shows exact names differ.
- The substitution event's `player` is the player coming on and `playerOff` the
  player going off, as `toTimedEvent` in `espn.ts` already maps them.
- Keep the timeline readable at the popup's 360px width. Each side column is
  about 150px, so names wrap. Don't truncate them.
- Use the existing tokens (`accent`, `muted`, `surface`). Don't add colors.

## Open questions

None.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8163,"specSha256":"7df9d6f44b40adb734f07256fe8983a4ec1dab575635eeb34fd46bbc1a102f3c","branch":"refs/heads/feature/readable-timeline-subs-names","head":"928a2939c9e1b8f017b71d1b317deede732feae1","baseRef":"refs/heads/main","baseCommit":"928a2939c9e1b8f017b71d1b317deede732feae1","sourceTree":"36d149ab5dd4f20f537612a7fb120bdf9ddae641","absentOptional":[]} -->
