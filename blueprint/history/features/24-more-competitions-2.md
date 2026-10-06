# Feature: More Competitions 2

**From build-plan:** feature 24
**Build attempt:** 1
**Branch:** feature/more-competitions-2
**Status:** verified

## Goal

Let users follow more club and national-team competitions, for example
Argentina's World Cup qualifiers or the Europa League. Each competition is
confirmed against ESPN first. The longer list in Favorites is split into Club
competitions and National teams so it stays easy to scan.

## In scope

- Confirm each candidate ID against ESPN, then add the confirmed ones to the
  catalog as followable extras.

  | Group | Candidate ID (unconfirmed) | Display name |
  |---|---|---|
  | National teams | `fifa.world` | World Cup |
  | National teams | `conmebol.america` | Copa América |
  | National teams | `uefa.euro` | Euro |
  | National teams | `uefa.nations` | Nations League |
  | National teams | `concacaf.gold` | Gold Cup |
  | National teams | `fifa.worldq.conmebol` | World Cup Qualifying (South America) |
  | National teams | `fifa.worldq.uefa` | World Cup Qualifying (Europe) |
  | National teams | `fifa.worldq.concacaf` | World Cup Qualifying (CONCACAF) |
  | National teams | `fifa.worldq.afc` | World Cup Qualifying (Asia) |
  | Clubs | `uefa.europa` | Europa League |
  | Clubs | `uefa.europa.conf` | Conference League |
  | Clubs | `conmebol.libertadores` | Copa Libertadores |
  | Clubs | `eng.2` | Championship |
  | Clubs | `eng.fa` | FA Cup |
  | Clubs | `esp.copa_del_rey` | Copa del Rey |

- Split the extras in `src/api/football.ts` into two exported lists:
  - `NATIONAL_TEAM_EXTRAS`: the existing friendlies, Africa qualifiers and AFCON,
    then the new national-team entries;
  - `CLUB_EXTRAS`: the existing local leagues, then the new club entries.

  `EXTRA_COMPETITIONS` becomes `[...NATIONAL_TEAM_EXTRAS, ...CLUB_EXTRAS]`. That
  keeps today's order for every existing extra, so load order and Home card
  order don't change for current users.
- In Favorites, replace the single "More competitions" section with two
  sections: **Club competitions** and **National teams**. The "Leagues" section
  for the six defaults stays as it is.

## Out of scope

- Changing the six defaults or what loads without a follow.
- Following a national team as a team when its competitions have no tables;
  that depends on ESPN data, not on this feature.
- Changes to the local league suggestion (`src/lib/localLeague.ts`), for example
  offering Argentina its national-team competitions.
- Any new permission, host, or background behavior.

## Build loop

Per `blueprint/config.json` (`stepReview: feature`, `checkpointCommits:
disabled`): build every step, run focused checks while iterating, then present
one review packet. `/complete` makes the single feature commit.

## Build steps

- [x] **1. Confirm the IDs, then add them to the catalog.**
  - For each candidate, request today's scoreboard
    (`https://site.api.espn.com/apis/site/v2/sports/soccer/<id>/scoreboard`) and
    its standings with `curl`: no credentials, read-only. Record in the review
    packet the league name ESPN returns and whether the standings have group
    entries.
  - Drop any ID whose scoreboard doesn't answer with a valid league, and say so
    in the packet. This is the rule feature 20 used.
  - Set `hasStandings: true` only when the standings response has `children`
    with entries today. Otherwise `getTeamCatalog` would report the
    competition as failed and show "Some competitions couldn't be loaded" while
    it is followed.
  - Add `NATIONAL_TEAM_EXTRAS` and `CLUB_EXTRAS`, build `EXTRA_COMPETITIONS`
    from them in that order, and update the comment above the lists.

  **Done when:** `npm test` passes, with `src/api/football.test.ts` covering:
  - catalog IDs are unique across `COMPETITIONS`;
  - `EXTRA_COMPETITIONS` equals national teams then clubs, and the existing
    extras keep their order;
  - the confirmed new IDs are present, and any dropped ID is absent;
  - the existing `competitionsToLoad` cases still pass.

- [x] **2. Group the extras in Favorites.**
  - In `src/components/favorites/FavoritesPanel.tsx`, `Competitions` renders
    three `CompetitionGroup`s: "Leagues" (`DEFAULT_COMPETITIONS`, unchanged),
    "Club competitions" (`CLUB_EXTRAS`), and "National teams"
    (`NATIONAL_TEAM_EXTRAS`). Each has its own heading `id`, used by
    `aria-labelledby`.
  - Following works as before: same `FavoriteToggle`, same disabled-until-ready
    behavior, same logo lookup.

  **Done when:** `npm run lint` and `npm run build` pass. In the built popup,
  Favorites shows the three sections, and following a new competition, for
  example Copa Libertadores, adds its card on Home. If no browser is available,
  the packet says that this check wasn't run.

## Files / areas

- `src/api/football.ts`: catalog lists
- `src/api/football.test.ts`: catalog tests
- `src/components/favorites/FavoritesPanel.tsx`: section grouping

No changes are expected in Search, the cache, notifications, Home, or
`useTeamCatalog`. All of them read `COMPETITIONS` or `competitionsToLoad`.

## Data / contracts

- `CatalogCompetition` (`id`, `name`, `hasStandings`) is unchanged.
- Stored favorite competition IDs are validated against `COMPETITIONS`. New IDs
  become valid, and no existing stored ID becomes invalid.
- No new stored fields, and no change to the request shape. A competition still
  costs one scoreboard request per refresh (plus a standings request for the
  team catalog when `hasStandings`), and only while it is followed.

## Testing

- Unit tests (Vitest, `npm test`) for the catalog lists, as listed in step 1.
- The Favorites grouping is UI. Per the coding standards it gets no unit test;
  it is checked with the build and, when available, the built popup.
- Final gate: `npm run lint`, `npm test`, `npm run build`. No Verify command is
  declared.

## Notes for the AI

- ESPN IDs are from memory and unconfirmed until step 1. Never ship an ID that
  wasn't confirmed.
- Off-season competitions, such as Copa America or the World Cup in October 2026,
  may return an empty scoreboard. That is valid; confirm the league object, not
  the presence of events. Check in step 2 that a followed competition with no
  matches shows its normal empty state on Home, not an error.
- Keep names short enough for one line in the Favorites row and Home card; the
  rows already truncate.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6378,"specSha256":"0d79cd9941cfd8ee2564051f8693ee4c00c3d0864c478134f305475e25263ec4","branch":"refs/heads/feature/more-competitions-2","head":"366975de2bd0e7ba83abac0eda8fc45977678873","baseRef":"refs/heads/main","baseCommit":"366975de2bd0e7ba83abac0eda8fc45977678873","sourceTree":"1609ed871bf954ed3c012636b62595f1d8408c1a","absentOptional":[]} -->
