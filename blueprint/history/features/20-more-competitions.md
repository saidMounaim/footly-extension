# Feature: More Competitions

**From build-plan:** feature 20
**Build attempt:** 1
**Branch:** feature/more-competitions
**Status:** verified

## Goal

Footly can follow more than the six default leagues: Botola Pro and
international national-team matches (friendlies, World Cup qualifiers for Africa,
and AFCON).

- The six defaults always load, as today.
- An extra competition loads only once the user follows it, so users who follow
  none make exactly the same requests as now.
- Followed extras then appear everywhere matches do: Home, Upcoming, Results,
  Search, match detail, and favorite-team notifications.

## In scope

- **Competition catalog:** split today's `COMPETITIONS` in `src/api/football.ts`
  into two lists:
  - `DEFAULT_COMPETITIONS`: the current six, in the same order.
  - `EXTRA_COMPETITIONS`, each with a `hasStandings` flag for the team catalog.

  `COMPETITIONS` remains the full list (defaults first), so ID validation in
  favorites, the cache, and notifications accepts the new IDs without other
  changes. The planned extras, each confirmed in step 1:

  | Id | Name | `hasStandings` |
  |---|---|---|
  | `mar.1` | Botola Pro | yes |
  | `fifa.friendly` | International Friendlies | no |
  | `fifa.worldq.caf` | World Cup Qualifying (Africa) | yes, if ESPN returns group tables |
  | `caf.nations` | Africa Cup of Nations | yes, if ESPN returns group tables |

  An ID that ESPN's scoreboard doesn't answer with a valid league is dropped
  before the catalog ships, and the review packet says so. This was the approved
  rule.
- **What loads:** `competitionsToLoad(followedIds)` returns the defaults plus the
  followed extras, in catalog order. Both popup lists and the background planner
  use it.
  - The match list loads those competitions.
  - The team catalog loads the defaults plus the followed extras with
    `hasStandings`.
  - Today's `failedCompetitionIds.length === COMPETITIONS.length` checks become
    "every requested competition failed", using the requested set that each
    result now carries.
- **Cache coverage:** the saved match-list snapshot also stores the
  `competitionIds` it loaded.
  - A snapshot that doesn't cover every competition now requested (for example,
    just after following Botola Pro) counts as `unusable` for the first load,
    then loads fresh.
  - Older snapshots without the field count as defaults-only.
- **Reacting to follows:** when the set of followed extras changes while the
  popup is open, the list reloads in the background through the existing
  `refresh`, so the current list stays visible meanwhile. Unfollowing an extra
  stops it from loading on the next refresh; its matches drop out then.
- **Favorites and Search:**
  - The Favorites "Competitions" area shows the defaults under **Leagues** and
    the extras under **More competitions**, each with the existing follow star
    and crest.
  - Search already searches `COMPETITIONS`, so the extras become findable and
    followable from Search with no further change.
- **Background notifications:** `plan()` loads the defaults plus the followed
  extras, so a favorite national team or Botola Pro club gets alerts once its
  competition is followed.

## Out of scope

- Suggesting Botola Pro by country (time zone or language). This would be a
  separate item.
- Countdowns on cards and the visual redesign (feature 21).
- Any competition beyond the four listed, and making the list user-editable.
- Loading a favorite team's matches from competitions the user doesn't follow.
  Following the competition is how its matches load; the review packet notes this.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet for the whole feature. `workflow.checkpointCommits` is `disabled`.
`/complete` creates the feature commit.

## Build steps

- [x] **1. Confirm the ESPN ids, then split the catalog.**
  - For each planned ID, request today's scoreboard
    (`/apis/site/v2/sports/soccer/<id>/scoreboard`). For each ID with
    `hasStandings`, also request the standings. Use `curl` with no credentials,
    read-only. Record in the packet the league name ESPN returns and whether
    standings have group entries.
  - Add `DEFAULT_COMPETITIONS`, `EXTRA_COMPETITIONS` (only confirmed IDs, with
    `hasStandings`), the combined `COMPETITIONS`, and
    `competitionsToLoad(followedIds)` to `src/api/football.ts`.

  **Done when:** `npm test` passes, with cases for `competitionsToLoad`:
  - no follows gives exactly the six defaults in order;
  - followed extras are appended in catalog order;
  - following a default adds nothing;
  - unknown IDs are ignored.

  The existing favorites, cache, and notification parse tests still pass and
  accept an extra ID.

- [x] **2. Load the requested set.**
  - `getMatchList` and `getTeamCatalog` take an optional `competitions` list
    (default: the six defaults). They return the requested `competitionIds`, and
    the catalog skips extras without `hasStandings`.
  - Add `allCompetitionsFailed(result)` and replace every
    `=== COMPETITIONS.length` check in `useMatchList`, `useTeamCatalog`,
    `background.ts`, and `cache.ts` with it.
  - Store `competitionIds` in the match-list snapshot.
  - `matchListFreshness(snapshot, now, requestedIds)` returns `unusable` when the
    snapshot doesn't cover the requested IDs.

  **Done when:** `npm test`, `npx tsc -b`, and `npm run build` pass. Tests cover:
  - requests going only to the passed competitions;
  - `competitionIds` in both results;
  - `allCompetitionsFailed` true only when every requested competition failed;
  - snapshot round-trips with and without `competitionIds`;
  - freshness turning `unusable` for an uncovered ID and staying normal when
    covered;
  - the catalog skipping a no-standings extra.

- [x] **3. Wire follows into the popup and background.**
  - `useMatchList(followedIds)` loads `competitionsToLoad(followedIds)`. When the
    followed-extras key changes after the first load, it calls `refresh`.
  - `useTeamCatalog` uses the same set.
  - `background.ts` `currentMatchList()` reads favorite competitions and loads
    the same set, and checks snapshot coverage the same way.
  - Pass `competitions.ids` from `App`.

  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass. In Chrome:
  - with nothing extra followed, the Network panel shows only the six default
    scoreboard leagues;
  - following Botola Pro adds `mar.1` requests and its matches without a
    full-screen loading state;
  - unfollowing it removes them on the next refresh.

  Record what was observed.

- [x] **4. Favorites grouping.**
  - Split the Favorites competition list into **Leagues** (defaults) and
    **More competitions** (extras), with headings using `sectionHeadingClass`
    and `settings-`-style unique IDs (`favorites-leagues`,
    `favorites-more-competitions`).
  - Keep the crest and star toggles.

  **Done when:** `npm run build` and `npm run lint` pass. In Chrome:
  - both groups show;
  - following an extra from Favorites or Search updates the star in both places;
  - the extra's matches appear on Home and in Upcoming after the background
    refresh.

  Record what was observed.

## Files / areas

- Changed:
  - API: `src/api/football.ts`, `src/api/football.test.ts`
  - Cache: `src/lib/cache.ts`, `src/lib/cache.test.ts`
  - Hooks: `src/hooks/useMatchList.ts`, `src/hooks/useTeamCatalog.ts`
  - Background: `src/background.ts`
  - UI: `src/App.tsx`, `src/components/favorites/FavoritesPanel.tsx`
- Unchanged but now accepting the new IDs through `COMPETITIONS`:
  `src/lib/favorites.ts`, `src/lib/notifications.ts`,
  `src/components/search/SearchPanel.tsx`

## Data / contracts

- `favoriteCompetitions` (stored) may now contain the extra IDs. Parsing still
  accepts only IDs in `COMPETITIONS`.
- The `matchListCache` snapshot gains an optional `competitionIds: string[]`
  field, holding only IDs that are in `COMPETITIONS`. A missing or invalid value
  reads as the six defaults. `CACHE_VERSION` stays 1, because older snapshots
  remain valid.
- `MatchListResult` and `TeamCatalogResult` gain `competitionIds: string[]`, the
  requested set in load order. `failureReason` behavior is unchanged.
- Request budget: the six defaults cost the same as today. Each followed extra
  adds one scoreboard request per month in the window, and one standings request
  for the catalog when `hasStandings` is true.

## Testing

- Vitest covers `competitionsToLoad`, requested-set loading, `allCompetitionsFailed`,
  the snapshot field and coverage-aware freshness, and the catalog standings
  skip. Hooks, the background worker, and components are not unit-tested, per
  coding standards.
- Step 1's ID check is a read-only network observation, recorded in the packet.
  No browser test command exists. Steps 3–4 are checked manually in Chrome;
  record what was actually observed.

## Notes for the AI

- Keep `COMPETITIONS` exported and ordered defaults-first, so existing order
  tie-breaks and validators keep working.
- Order tie-breaks in `getMatchList` use the index in the requested list, not in
  `COMPETITIONS`.
- National teams arrive as ordinary `Team` objects. No model change is needed,
  and crests come through the same `logo` field.
- Do not refetch on every render: key the follow-change refresh on a sorted
  string of followed extra IDs.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9404,"specSha256":"069141fb9c607bbac1ce05d7ea3c87577da8dc7f55abcb5af3a724a70fb4d396","branch":"refs/heads/feature/more-competitions","head":"b3d8e1e35bfb57d8a7a10606fbb68d0ed64c83b0","baseRef":"refs/heads/main","baseCommit":"b3d8e1e35bfb57d8a7a10606fbb68d0ed64c83b0","sourceTree":"19845f94bb0245c8903e6f93eefa70441ddb3d18","absentOptional":[]} -->
