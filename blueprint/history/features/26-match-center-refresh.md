# Feature: Match Center Refresh

**From build-plan:** feature 26
**Build attempt:** 1
**Branch:** feature/match-center-refresh
**Status:** verified

## Goal

Make the match detail screen look modern. The score header gets larger crests
and score, a status pill, and each team's goal scorers under its name. The
starting lineups are drawn on a pitch, with today's list kept as the fallback.
The flag-style goal icon becomes a football.

## In scope

- **Football goal icon.** A small inline SVG football component, decorative
  (`aria-hidden`), sized like the other timeline icons and drawn with
  `currentColor` so it works in both themes. It replaces lucide `Goal` for
  `goal`, `own-goal` and `penalty-goal` in `MatchTimeline`. The missed penalty
  keeps `CircleX`, and cards and substitutions are unchanged.
- **Score header** (`ScoreBlock` in `MatchDetail.tsx`), restyled:
  - **Layout:** the crests become larger, the score becomes larger and bolder,
    and the kickoff time is shown in place of the score for upcoming matches,
    as today. Team names wrap to two lines instead of overflowing. The favorite
    stars stay beside the names.
  - **Status:** the existing `StatusText` pill (Live, HT, FT, postponed,
    cancelled) sits centered under the score. The upcoming countdown is
    unchanged.
  - **Goal scorers:** each side lists its goals under the crest, in timeline
    order. Each line shows the football icon, the player and the minute, with
    "(pen)" or "(OG)" as in the timeline, for example "⚽ Saka 23'". A
    scorer's own goal is listed under the team it counted for. With no goals,
    or before the timeline loads, the list isn't shown.
- **Lineups on a pitch** (`MatchLineups.tsx`):
  - **The pitch:** a vertical pitch with green stripes and white lines. The
    home side is in the bottom half attacking up, and the away side in the top
    half attacking down. Each starter is a jersey-number disc with the
    surname under it. Each half is labelled with its team name and formation.
  - **Placing players:** players are placed from their ESPN position
    abbreviation, from goalkeeper to forwards, and left to right within each
    line. The away side is mirrored, so its left back appears on the screen's
    right.
  - **Accessibility:** each team's starters remain an `<ol aria-label="<team>
    starters">`. Every list item holds the number and full name as text, and the
    surname is only a visual label. Substitutes stay a list under the pitch.
  - **Fallback:** if any starter on either side has no position, or an
    abbreviation the mapping doesn't know, both teams render as today's list.

## Out of scope

- Match rows and the Results lists (the user chose the detail header only).
- Statistics, the timeline layout apart from its goal icon, and new provider
  data.
- Substitutions, cards or ratings drawn on the pitch.

## Build loop

Per `blueprint/config.json` (`stepReview: feature`, `checkpointCommits:
disabled`): build every step, run focused checks while iterating, then present
one review packet. `/complete` makes the single feature commit.

## Build steps

- [x] **1. Football icon, goal scorers, and the new score header.**
  - Add `src/components/common/FootballIcon.tsx` and use it in
    `MatchTimeline`'s `EVENT_DISPLAY` for the three goal types.
  - Add a pure `goalScorers(match)` in `src/lib/match.ts`. It returns
    `{ home: GoalLine[], away: GoalLine[] }` built from the `goal`, `own-goal`
    and `penalty-goal` events, in event order. A `GoalLine` is `{ id, player?,
    minute, suffix? }`.
    - Before writing it, check which side an own goal's `teamId` names in
      ESPN's data. Use the existing summary fixtures, and if they have no own
      goal, one real finished match with an own goal via `curl`. Make the side
      the team the goal counted for, and record the evidence in the review
      packet.
    - An event without a `teamId` is left out.
  - Restyle `ScoreBlock` as described in In scope, rendering `goalScorers`
    from the detail state's match once it is loaded.

  **Done when:** `npm test` passes, with `src/lib/match.test.ts` covering:
  - home and away goals in order;
  - a penalty with "(pen)";
  - an own goal under the team it counted for, with "(OG)";
  - an event without `teamId` left out;
  - no goals gives two empty lists.

  `npm run build` passes, and in the built popup a finished match shows its
  scorers and the football icon in the timeline.

- [x] **2. Place starters on pitch lines.**
  - Add a pure `pitchLines(starters)` in `src/lib/pitch.ts`. It returns the
    lines from goalkeeper to forwards, each ordered left to right, or `null`
    when any starter has no position or an unknown one.
    - The mapping covers ESPN soccer abbreviations: `G`; `D`, `CD`, `CD-L`,
      `CD-R`, `SW`, `LB`, `RB`, `LWB`, `RWB`; `DM`, `DM-L`, `DM-R`; `M`, `CM`,
      `CM-L`, `CM-R`, `LM`, `RM`; `AM`, `AM-L`, `AM-R`, `LW`, `RW`; `F`, `CF`,
      `CF-L`, `CF-R`, `LF`, `RF`, `S`, `ST`.
    - Before finalizing, check the abbreviations in two or three real ESPN
      summaries with `curl`, read-only. Add any common abbreviation they use,
      and list them in the review packet.
    - Left is `-L`, `L…` wing positions and left backs; right mirrors it;
      everything else is center. Ties keep ESPN's order.
    - Empty lines are dropped.
  - Add a pure `surname(name)`: the last word of a multi-word name, otherwise
    the whole name.

  **Done when:** `npm test` passes, with `src/lib/pitch.test.ts` covering:
  - a 4-2-3-1 built from the summary fixture's abbreviations gives lines of 1,
    4, 2, 3 and 1, with the left back first in the back line;
  - a missing position gives `null`;
  - an unknown abbreviation gives `null`;
  - a single-name player ("Rodri") keeps the name.

- [x] **3. Draw the pitch.**
  - In `MatchLineups.tsx`, render the pitch when `pitchLines` succeeds for both
    sides, otherwise today's lists.
    - The pitch is CSS only: stripes from a gradient, plus the halfway line,
      centre circle and boxes as bordered elements. No images or new
      dependencies.
    - Lines are flex rows inside each half: the home half orders lines bottom
      to top, and the away half top to bottom and mirrored.
    - Discs show the jersey number, or are blank when there is none, with the
      surname under them. The full name is in the item's accessible text.
  - Add `--pitch`, `--pitch-stripe` and `--pitch-line` tokens to every theme
    block in `src/index.css` (light, dark media, `[data-theme="dark"]`). Add the
    new tokens to the `src/lib/contrast.test.ts` token list. The white surname
    and disc text must reach 4.5:1 on `--pitch`, and that pair gets its own
    contrast assertion.

  **Done when:** `npm run lint`, `npm test` and `npm run build` pass, the new
  contrast assertion included. In the built popup:
  - a match with ESPN lineups shows both teams on one pitch, readable in the
    light and dark themes;
  - a lineup with an unmapped position shows the list;
  - a screen reader still reads each team's starters as a list.

  If no browser is available, the packet says this wasn't run.

## Files / areas

- `src/components/common/FootballIcon.tsx`: new
- `src/components/matches/MatchTimeline.tsx`: goal icons
- `src/components/matches/MatchDetail.tsx`: `ScoreBlock`
- `src/lib/match.ts` and `src/lib/match.test.ts`: `goalScorers`, new
- `src/lib/pitch.ts` and `src/lib/pitch.test.ts`: `pitchLines`, `surname`,
  new
- `src/components/matches/MatchLineups.tsx`: pitch and fallback
- `src/index.css` and `src/lib/contrast.test.ts`: pitch tokens

## Data / contracts

- No change to `Match`, `MatchEvent`, `Lineup` or `LineupPlayer`, to stored
  data, or to requests. Everything is derived from the existing match detail.
- Player names come from ESPN. Render them as React text only.

## Testing

- Vitest unit tests for `goalScorers`, `pitchLines` and `surname`, which is the
  project's pure-logic test scope, plus the contrast assertion for the new
  tokens.
- The header, pitch drawing and icon are UI. They are checked with lint, the
  build, and the built popup when available.
- Final gate: `npm run lint`, `npm test`, `npm run build`. No Verify command is
  declared.

## Notes for the AI

- The popup is narrow, about 360–400px. Up to 5 discs per line must fit
  without horizontal scrolling. Truncate surnames with an ellipsis, and keep
  discs at least 28px.
- Respect `prefers-reduced-motion`; the pitch has no animation.
- Keep the existing `MatchLineups` lists for the fallback rather than
  duplicating them.
- Crests and icons stay decorative; names are always visible text.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8661,"specSha256":"cd0568ea721469565ad4b9b809dbfcd9430ef2fd11a84a917dd04535ed2dfa9b","branch":"refs/heads/feature/match-center-refresh","head":"86aeba26af0da21babd368a6661ec170296059c2","baseRef":"refs/heads/main","baseCommit":"86aeba26af0da21babd368a6661ec170296059c2","sourceTree":"f6c0d437e1a767c8426a5ffab9df85d4b6f6a8a0","absentOptional":[]} -->
