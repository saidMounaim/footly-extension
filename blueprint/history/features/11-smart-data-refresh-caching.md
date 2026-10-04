# Feature: Smart Data Refresh & Caching

**From build-plan:** feature 11
**Build attempt:** 1
**Branch:** feature/smart-data-refresh-caching
**Status:** verified

## Goal

Refresh match data by match state and cache stable or short-lived data in
`chrome.storage.local`, so reopening the popup is instant and Footly makes fewer
ESPN requests: live matches refresh regularly while the popup is open, upcoming
matches keep their existing kickoff checks, finished matches stop refreshing,
and the club list is fetched at most about once a day.

## In scope

- **Live refresh while the popup is open.** When the shown list has any `live`
  or `halftime` match, refetch the match list every 60 s. When the open match
  detail is `live` or `halftime`, refetch its summary every 60 s. Stop as soon
  as nothing shown is live or halftime. Finished, postponed, cancelled, and
  upcoming matches never trigger this timer (upcoming keeps the existing
  kickoff + 1/3/5 min checks from feature 7).
- **Match list snapshot cache.** After a list load or refresh that is not a
  total failure, save a normalized snapshot (the `MatchListResult` plus
  `savedAt`) under one storage key. On popup open:
  - fresh snapshot: show it, no network request;
  - usable but stale snapshot: show it immediately, then refresh in the
    background with the existing `refresh` semantics (keep the list when every
    competition fails);
  - missing, unreadable, invalid, or unusable: current loading path.
- **Team catalog cache.** After a catalog load with no failed competition, save
  the teams with `savedAt`. Opening Favorites uses a catalog younger than 24 h
  without a request; otherwise it loads as today and saves on full success.
- **Background reuse.** The service worker's hourly `plan()` uses a fresh match
  list snapshot instead of fetching, and saves the snapshot after it fetches.

## Out of scope

- User-facing refresh settings (feature 13) and any refresh UI or "updated at"
  label.
- New error, offline, or rate-limit UX (feature 15). Existing error and retry
  states stay unchanged.
- Caching match summaries (detail, timeline, stats, lineups) in storage, or an
  in-memory detail cache across opens.
- Changes to the background `watch()` cadence, notifications, or manifest
  permissions (`storage` already exists).
- Refreshing "upcoming" matches whose kickoff passed but the provider has not
  marked live, beyond the existing kickoff checks.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`: implement all steps, keeping each one working and `npm test`,
`npm run lint`, and `npm run build` green, then present one review packet for
the whole feature. No checkpoint commits. `/complete` creates the feature commit.

## Build steps

- [x] 1. **Refresh and cache rules (pure logic).** Add `src/lib/cache.ts` with
  storage keys, snapshot types, `parse…` validators, freshness/usability
  functions, `hasLiveMatch(matches)`, and `load…`/`save…` helpers built on
  `readStoredKey`/`writeStoredKey` and the injectable `StorageArea`.
  Done when: `src/lib/cache.test.ts` covers every rule in Data / contracts
  (fresh, stale-but-usable, unusable, malformed, wrong version, partial
  failure, storage read/write failure) and `npm test` passes.

- [x] 2. **Cache-first match list.** `useMatchList` reads the snapshot before
  the first load, applies the fresh / stale / unusable rules, uses the
  snapshot's `savedAt` as `loadedAt`, and saves after each successful load or
  refresh. A failed cache read or write never changes the visible state (log
  only unexpected errors). `retry` keeps today's behavior: loading state, then
  a network fetch.
  Done when: reopening the popup within the freshness window shows the list
  with no ESPN scoreboard requests in the popup's Network panel, a stale
  snapshot shows instantly and is replaced after the background fetch, and
  `npm run build` passes.

- [x] 3. **Live refresh timer.** Add `src/hooks/useLiveRefresh.ts`: while
  `hasLiveMatch(matches)` is true, call `refresh` 60 s after the previous call
  settles (never overlapping), cleared on unmount or when no match is live.
  Use it in `App.tsx` with the upcoming list and in `MatchDetail.tsx` with the
  shown match, next to the existing `useKickoffChecks` calls.
  Done when: with a live match in the list (or a live detail open), the popup
  issues one list (or summary) refresh per ~60 s and none once only finished or
  upcoming matches are shown; `npm run build` passes.

- [x] 4. **Cached team catalog.** `useTeamCatalog` uses a catalog snapshot
  younger than 24 h without a request and saves after a load with no failed
  competition. Partial results are shown but not saved.
  Done when: opening Favorites a second time (new popup) issues no standings
  requests within 24 h, and `npm run build` passes.

- [x] 5. **Background snapshot reuse.** In `src/background.ts`, `plan()` uses a
  fresh match list snapshot when one exists, otherwise fetches and saves the
  snapshot when the result is not a total failure. Snapshot read/write failures
  fall back to fetching / are ignored without breaking planning.
  Done when: `npm test`, `npm run lint`, and `npm run build` pass and the
  manifest test still asserts only `storage`, `alarms`, `notifications`.

## Files / areas

- New: `src/lib/cache.ts`, `src/lib/cache.test.ts`, `src/hooks/useLiveRefresh.ts`
- Changed: `src/hooks/useMatchList.ts`, `src/hooks/useTeamCatalog.ts`,
  `src/App.tsx`, `src/components/matches/MatchDetail.tsx`, `src/background.ts`
- Reused: `readStoredKey`, `writeStoredKey`, `StorageArea`,
  `FavoritesStorageError` (`src/lib/favorites.ts`); `MatchListResult`,
  `TeamCatalogResult`, `COMPETITIONS` (`src/api/football.ts`). The private
  `extensionStorage()` in `src/hooks/useSavedValue.ts` may be exported for
  reuse rather than duplicated.

## Data / contracts

Storage is `chrome.storage.local`, written only by Footly, but still validated
on read (coding standards: storage is a boundary). Snapshots hold normalized
internal models only, never raw ESPN responses or user data.

- `matchListCache`: `{ version: 1, savedAt: <ISO 8601>, upcoming: Match[],
  results: Match[], failedCompetitionIds: string[] }`
- `teamCatalogCache`: `{ version: 1, savedAt: <ISO 8601>, teams: Team[] }`

Validation: a wrong `version`, unparseable `savedAt`, `savedAt` in the future,
non-array lists, or any entry missing its required string fields (match `id`,
`startTime`, known `status`, `homeTeam`/`awayTeam`/`competition` with `id` and
`name`, `events` array; team `id` and `name`) rejects the whole snapshot, which
is then treated as missing. Unknown `failedCompetitionIds` entries are dropped.

Match list rules, given `now`:

- **Usable** only when `savedAt` is on the same local day as `now` and no more
  than 60 min old (the list window is computed per day).
- **Fresh** only when usable, `failedCompetitionIds` is empty, no `upcoming`
  match kicked off between `savedAt` and `now`, and its age is under 60 s when
  any match is `live`/`halftime`, otherwise under 10 min.
- Usable but not fresh → stale (show, then refresh).

Team catalog: fresh when `savedAt` is valid, not in the future, and under 24 h
old; otherwise refetch. Only results with no failed competition are saved.

Popup and service worker may both write `matchListCache`; last writer wins,
which is acceptable because every write is a complete, recent snapshot.

All durations are module constants (60 s live refresh, 60 s / 10 min / 60 min
list windows, 24 h catalog). They are reversible defaults; feature 13 may make
refresh behavior configurable.

## Testing

`npm test` (Vitest) is configured, so step 1 ships `src/lib/cache.test.ts`
with a fake `StorageArea` (pattern from `favorites.test.ts`) and fixed `now`
values, covering validation, every freshness branch (including the day
boundary, the kickoff-passed rule, the live 60 s window, partial failures), and
read/write failure wrapping. `hasLiveMatch` is tested there too. Hooks and
components have no test harness (no React Testing Library); verify them with
the build, lint, and manual popup checks in Chrome (Network panel request counts
named in each Done when). No browser test command exists.

## Notes for the AI

- Keep `getMatchList`/`getTeamCatalog` network-only; caching lives in
  `src/lib/cache.ts` and the hooks/service worker that call them.
- Do not change existing refresh guards in `useMatchList` (generation counter)
  or `useMatchDetails` (settled-key check); live refresh goes through the
  existing `refresh` functions.
- Popups are destroyed on close, so in-popup timers need no visibility handling.
- Use `setTimeout` chained after `refresh()` settles, mirroring
  `useKickoffChecks`, not `setInterval`.
- `MatchList` derives day labels from `loadedAt`; a cached snapshot must pass
  its own `savedAt` there.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8891,"specSha256":"5d00763d8a3db37903b0d10218f3eaa793c35d12a8d5c9f6d21e837317653c41","branch":"refs/heads/feature/smart-data-refresh-caching","head":"b339e0e732bc9ff86f973a89a44d65d266ddc263","baseRef":"refs/heads/main","baseCommit":"b339e0e732bc9ff86f973a89a44d65d266ddc263","sourceTree":"7d8623e66c89c14a6bf7896c788c5213759b3b22","absentOptional":[]} -->
