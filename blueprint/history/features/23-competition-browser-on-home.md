# Feature: Competition Browser on Home

**From build-plan:** feature 23
**Build attempt:** 1
**Branch:** feature/competition-browser-on-home
**Status:** verified

## Goal

Home stops listing games. It shows a grid of competition cards for the six
default leagues plus any followed competitions. Tapping a card opens that
competition's screen: an Upcoming / Results switch, day chips, and match cards,
in the same style as the Upcoming tab. Matches open in the existing match detail
view.

Everything comes from the match list Footly already loads, so there are no new
requests.

## In scope

- **Home** (replaces the current Home content):
  - The one-time local league card stays above, unchanged.
  - Then a **Competitions** heading and a 2-column grid of cards, in catalog
    order: the defaults first, then followed extras.
  - Each card is a button showing:
    - the competition logo, using the existing `Crest` with its trophy fallback;
    - the competition name;
    - a status line:
      - **"N live"**, with the live dot, when any of its matches is live or at
        half-time;
      - otherwise the next kickoff ("Today 20:00", "Sat 15:00") from its next
        `upcoming` match;
      - otherwise "No matches this week";
    - a filled star when the competition is followed.
  - Loading, error, stale, and partial-failure states reuse the existing
    `MatchListSkeleton`, `MatchListError`, and `ListBanner`.
  - Each card's accessible name includes the name and status, for example
    "Premier League, 2 live, followed".
- **Competition screen**, opened like Settings and match detail:
  - A header with a Back button, the logo, and the name. Back returns to Home and
    focuses the card that opened it.
  - An **Upcoming | Results** switch (a two-button radiogroup with arrow keys and
    `aria-checked`). Upcoming is the default.
  - Below it, the existing `MatchList` filtered to this competition. It keeps the
    day chips, the favorite-team section, and the cards.
  - When the filtered list is empty, the existing empty message shows ("No
    upcoming matches in the next 7 days." / "No results in the last 7 days.").
  - Tapping a match opens match detail. Back from detail returns to the
    competition screen and restores focus to that match.
- **Removed from Home:** the live hero, "Your next match", "Next up", and their
  helpers (`buildHome`, `recentEvents`, `FeaturedEvents`, `LiveHero`,
  `NextMatchCard`) and their tests. Live games remain reachable from the cards
  and the Upcoming tab.

## Out of scope

- Showing or loading unfollowed extra competitions. Follow them in Favorites
  first.
- League tables or standings.
- Changes to the Upcoming, Results, Favorites, Search, and Settings tabs.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet for the whole feature. `workflow.checkpointCommits` is `disabled`.
`/complete` creates the feature commit.

## Build steps

- [x] **1. Competition summaries.**
  - Replace the contents of `src/lib/home.ts` with
    `competitionSummaries(result, competitions)`, which returns, per requested
    competition in the given order: `{ id, name, live, next }`.
    - `live` counts `live` and `halftime` matches;
    - `next` is the earliest `upcoming` match, or null.
  - Rewrite `src/lib/home.test.ts` for it, and remove `buildHome` and
    `recentEvents`.

  **Done when:** `npm test` passes, with cases for:
  - order following the requested list;
  - live and half-time counted;
  - postponed, cancelled, and finished ignored for `next`;
  - the earliest `upcoming` chosen;
  - a competition with no matches giving `live: 0, next: null`.

- [x] **2. Home grid.**
  - Rewrite `HomePanel` as the grid, with the states above.
  - It receives the requested competitions, the logos, and the followed set from
    `App`, and calls `onOpenCompetition(id, trigger)`.

  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass, and Home
  renders no match rows.

- [x] **3. Competition screen and navigation.**
  - Add `src/components/competition/CompetitionScreen.tsx`.
  - Add an optional `competitionId` filter to `MatchList`, applied before the day
    chips.
  - In `App`, add the open-competition state:
    - views show by priority: match detail, then Settings, then the competition
      screen, then the tabs;
    - focus returns as described;
    - the featured-events rule no longer applies, because Home has no events.

  **Done when:** build, lint, and tests pass. In Chrome:
  - tapping a card shows only that competition's matches;
  - the switch and day chips work with the keyboard;
  - opening a match and pressing Back returns to the competition;
  - Back from the competition focuses its card.

  Record what was observed.

## Files / areas

- Changed:
  - `src/lib/home.ts`, `src/lib/home.test.ts`
  - `src/components/home/HomePanel.tsx`
  - `src/components/matches/MatchList.tsx`
  - `src/App.tsx`
- New: `src/components/competition/CompetitionScreen.tsx`
- Reused: `competitionsToLoad`, `collectLogos`, `Crest`, `StatusText` (live
  dot), `DayChips`, `MatchList`, `MatchRow`, `dayLabel`, `formatKickoff`,
  `groupCardClass`, and `sectionHeadingClass`

## Data / contracts

- No stored data, network, or permission changes. The open competition and the
  Upcoming / Results choice are in-memory view state only.
- Names come from the catalog and logos from loaded data through `Crest`'s
  `https:` check. All text renders as React text.

## Testing

- Vitest covers `competitionSummaries`. Components are not unit-tested, per
  coding standards.
- No browser test command exists. Step 3's navigation and focus are checked
  manually in Chrome; record what was actually observed.

## Notes for the AI

- Keep the home tab and panel IDs and the `home-local-` card IDs. New IDs use the
  `home-competitions` and `competition-` prefixes.
- Card status text must not rely on color alone. "2 live" is text; the dot is
  decorative.
- The cards reuse `useNow`'s 30-second clock from `App` for "Today" labels; no
  new timers.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6080,"specSha256":"f35100d6a809627cca9616617f45cf167cf7472f4fa9893a7a1e0a2bf0b239fc","branch":"refs/heads/feature/competition-browser-on-home","head":"60801446d23cf2bf8077a0899fa05accddc8c831","baseRef":"refs/heads/main","baseCommit":"60801446d23cf2bf8077a0899fa05accddc8c831","sourceTree":"d7388c7a20b263a693755016a2653a4a26e308b7","absentOptional":[]} -->
