# Feature: Match Sections & Team Badges

**From build-plan:** feature 27a
**Build attempt:** 1
**Branch:** feature/match-sections-team-badges
**Status:** verified

## Goal

Make the match detail and result rows faster to scan. Under the score header,
the match detail splits into Summary, Stats and Lineups tabs, and substitutes
fold away under the pitch. Team crests or flags replace bare team names in the
match sections. Stats become comparison bars. Rows for finished matches show
crests and the score instead of team names.

## In scope

- **Match detail tabs** (`MatchDetail.tsx` plus a new `MatchSectionTabs.tsx`):
  - **The tabs:** a row under the score header with Summary (the timeline),
    Stats (`MatchStats`) and Lineups (`MatchLineups`). The score header stays
    above the tabs and is always visible.
  - **Which tabs show:** Summary is always there. Stats shows only when the
    loaded match has `stats`, and Lineups only when it has `lineups`, which is
    the same rule the sections follow today. While the summary is loading or has
    failed, only Summary exists. When Summary is the only tab, the tab row is
    hidden and the timeline shows as it does today.
  - **Which tab is selected:** each newly opened match starts on Summary. A live
    refresh keeps the selected tab. If a refresh removes the selected tab's data,
    the selection falls back to Summary.
  - **Accessibility:** the tabs follow the ARIA tabs pattern already used by the
    bottom navigation (`MatchTabs.tsx`): `role="tablist"` with an accessible
    name, `role="tab"` buttons with `aria-selected` and `aria-controls`, and
    roving `tabIndex`. Arrow Left and Right, Home and End move between tabs and
    keep focus on the tab. Each panel is a `role="tabpanel"` with
    `aria-labelledby`. Tab and panel ids use a `match-section-` prefix so they
    never collide with the bottom navigation's `tab-`/`panel-` ids. Selection
    is shown by text weight and an underline or pill, not by color alone.
  - **States:** Summary keeps today's loading skeleton, and its error message
    with Retry. The timeline's empty text ("No match events yet.") is
    unchanged.
- **Collapsible substitutes** (`MatchLineups.tsx`): each team's substitutes
  become a native `<details>`/`<summary>` block, closed by default. The summary
  shows the team badge, "<team> substitutes" and the count, for example
  "Substitutes (9)". This applies under the pitch and in the stacked-list
  fallback. A team with no substitutes shows no block, as today.
- **Team badges** (the existing `Crest` component, decorative and
  `aria-hidden`):
  - **Stats:** a visible header row above the stats, with the home crest and
    short name on the left and the away crest and short name on the right, so
    each column has a clear owner. The table's screen-reader caption and column
    headers stay.
  - **Pitch:** the crest next to each team label on the pitch, before the name
    and formation.
  - **Substitutes:** the crest in each substitutes summary.
  - **Stacked-list fallback:** the crest in each team heading (`TeamHeading`).
  - **Names stay:** team names stay as visible text next to the crest in the
    match detail, because a 16–20px crest alone is hard to recognise.
- **Stat comparison bars** (`MatchStats.tsx`): each stat row keeps both values
  and its label. Under them, a split bar shows each side's share of the total:
  home fills from the left, away from the right. The side with the larger value
  is drawn in `accent` and the other in a neutral token. When both values are 0,
  the bar is empty and neutral. Possession uses the same share calculation. The
  bar is `aria-hidden`, because the numbers already carry the meaning.
- **Finished result rows** (`MatchRow.tsx`): when a match's status is
  `finished` and it has a score, the row's team area becomes one horizontal
  line: home crest, score (for example "2–1"), away crest. There are no team
  names. Each crest sits in a wrapper whose `title` is the team name, which
  gives a hover tooltip. The losing side's score is dimmed, as today. The
  row's accessible name (`aria-label`) is unchanged and already holds both team
  names and "FT 2–1". The competition line, the FT pill and the favorite star
  stay. This applies wherever `MatchRow` is used: competition, favorites and
  search lists. Upcoming, live, halftime, postponed and cancelled rows keep
  their team names.

## Out of scope

- Player photos (27b).
- Changes to the score header, the timeline rows (including the team short name
  in `EventRow`), the pitch layout, or the bottom navigation's look.
- New stats or data fields, and any change to `src/api/`.
- Persisting the selected match tab between popup opens.
- Updating `project-plan.md`'s "names stay visible" crest rule. This is
  recorded as a plan conflict in the overview, and the user owns that edit.

## Build loop

`workflow.stepReview` is `feature`: build all steps, keep the project working
after each one, then present one review packet at the end. Checkpoint commits
are disabled. `/complete` creates the single feature commit, and nothing is
committed during `/implement`.

## Build steps

- [x] 1. **Pure helpers with tests.** Add `src/lib/tabs.ts` with
  `tabIndexForKey(key, current, count)`, which returns the next index for
  ArrowRight, ArrowLeft, Home and End, wrapping at both ends, and `undefined`
  for any other key. Switch `MatchTabs.tsx` to use it, with no behavior change.
  Add `src/lib/stats.ts` with `statShares(home, away)`, which returns each
  side's percent of the total (summing to 100) and `{ home: 0, away: 0 }` when
  both are 0.
  **Done when:** `tabs.test.ts` and `stats.test.ts` cover wrap-around, Home and
  End, unknown keys, equal values, one side 0, both 0, and non-integer
  possession. `npm test` and `npm run lint` pass, and the bottom navigation
  still moves with arrow keys.
- [x] 2. **Match detail tabs.** Add `MatchSectionTabs.tsx` and restructure
  `MatchDetail.tsx` so Summary, Stats and Lineups are tab panels under the
  score header, following the visibility, selection and fallback rules above.
  **Done when:** opening a finished match with stats and lineups shows three
  tabs on Summary. Stats and Lineups each show only their section. Arrow keys
  move between tabs. A match without stats or lineups shows no tab row. Loading
  and error still appear under the score header. `npm run build` and
  `npm run lint` pass.
- [x] 3. **Badges and collapsible substitutes.** Add crests to the stats header
  row, the pitch labels, the stacked-list team headings and the substitutes
  summaries. Turn the substitutes into closed `<details>` blocks with counts.
  **Done when:** each listed place shows the crest beside the team name, or
  initials when there's no logo. Substitutes open and close with mouse and
  keyboard, and are closed when the Lineups tab opens. `npm run build` passes.
- [x] 4. **Stat comparison bars.** Render the split bar per stat row from
  `statShares`.
  **Done when:** a 60/40 possession match shows a 60% accent bar on the home
  side. A 0–0 stat shows an empty neutral bar. Both themes are readable.
  `npm run build` passes.
- [x] 5. **Crest-only finished rows.** Change `MatchRow` for finished matches
  with a score as described above.
  **Done when:** finished rows in competition, favorites and search lists show
  crest, score and crest with no names. Hovering a crest shows the team name,
  and the screen-reader name still reads "<home> vs <away>, FT x–y". Upcoming
  and live rows are unchanged. `npm test`, `npm run lint` and `npm run build`
  pass.

## Files / areas

- `src/components/matches/MatchDetail.tsx`: tabbed body under `ScoreBlock`.
- `src/components/matches/MatchSectionTabs.tsx`: new tab row component.
- `src/components/matches/MatchTabs.tsx`: uses `tabIndexForKey`.
- `src/components/matches/MatchStats.tsx`: header row with crests, and bars.
- `src/components/matches/MatchLineups.tsx`: pitch label crests, `TeamHeading`
  crests, collapsible `Substitutes`.
- `src/components/matches/MatchRow.tsx`: finished-row layout.
- `src/components/common/Crest.tsx`: reused as is.
- `src/lib/tabs.ts`, `src/lib/tabs.test.ts`, `src/lib/stats.ts`,
  `src/lib/stats.test.ts`: new.

## Data / contracts

There are no changes to `Match`, `Team`, `TeamMatchStats`, `Lineup`, storage
or the ESPN adapter.

- `tabIndexForKey(key: string, current: number, count: number): number | undefined`
- `statShares(home: number, away: number): { home: number; away: number }`.
  It returns percentages from 0 to 100, unrounded, which callers use as CSS
  widths. Negative or non-finite inputs are treated as 0, because the values
  come from the provider.

Team names and logos come from the provider. Names render only as React text,
and the `title` attribute is a string. Logos go through `Crest`, which already
allows only https URLs (`safeImageUrl`).

## Testing

- Vitest unit tests for `tabIndexForKey` and `statShares`, next to their
  sources, which is the logic gate for step 1.
- UI steps 2–5 are exempt from unit tests under the coding standards. They are
  verified by `npm run build`, `npm run lint`, and a manual check in the popup
  (light and dark, keyboard through the tabs and substitutes) or `/check`.
- Baseline observed while writing this spec: `npm test` passed (20 files, 437
  tests) and `npm run lint` was clean. No Verify command is declared, and
  `npm run build` was not run during planning.

## Notes for the AI

- Reuse `MatchTabs.tsx`'s roving-focus pattern, but keep the bottom navigation's
  `MATCH_TABS` and styling untouched.
- Reset the selected tab when the opened match changes. Either key the tab
  state by `match.id` or reset it in the effect that already runs on `[match]`.
  Live refreshes change `state.match`, not the `match` prop, so the tab is
  kept.
- Keep the `section`/heading semantics inside the panels, or rely on the panel's
  `aria-labelledby`. Don't leave duplicate visible "Statistics" and "Lineups"
  headings that only repeat the tab label.
- `Crest` sizes: use `sm` or `md` in the detail sections. In result rows, use a
  size large enough to recognise without a name (`lg`).
- Don't add a dependency. `<details>` and the tabs need none.

## Open questions

None blocking. The user chose crest-only finished rows, which conflicts with
`project-plan.md`'s "names stay visible" crest rule. The overview records this.
The user can update the project plan and re-run `/overview` at any time.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10516,"specSha256":"73ac7340f7cd45577eb723b74c4d563046f01cb578fcf0f81dd6430347a25f31","branch":"refs/heads/feature/match-sections-team-badges","head":"192a3699b9cdd0f6c5936b79e9a4bd619e07e97f","baseRef":"refs/heads/main","baseCommit":"192a3699b9cdd0f6c5936b79e9a4bd619e07e97f","sourceTree":"d0b65801ca8cf51dd0f1dde92e90fbebc1104773","absentOptional":[]} -->
