# Feature: API Error & Offline States

**From build-plan:** feature 15
**Build attempt:** 1
**Branch:** feature/api-error-offline-states
**Status:** verified

## Goal

When data can't load, Footly says why and offers the right recovery, instead of
one generic "Couldn't load match data." It tells apart:

- being offline;
- the provider limiting requests;
- the provider not responding;
- data that came back malformed;
- an unexpected bug.

When the network drops, Footly keeps showing today's last saved matches, clearly
labeled with when they were saved. It reloads by itself once the connection
returns.

## In scope

- **Failure reasons from the API layer.** `fetchJson` in `src/api/football.ts`
  classifies each expected failure:

  | Condition | Reason |
  |---|---|
  | `fetch` rejects (network error or timeout) while the browser reports it is offline | `offline` |
  | HTTP 429 | `rate-limited` |
  | Any other non-OK status, or `fetch` rejects while online (network error, timeout) | `unavailable` |
  | Invalid JSON, or an `EspnResponseError` | `invalid` |

  - `MatchDetailsError` carries its reason.
  - `MatchListResult` and `TeamCatalogResult` gain an optional
    `failureReason`. It is set only when at least one competition failed, using the
    priority `offline` > `rate-limited` > `unavailable` > `invalid`.
  - Unexpected errors are still rethrown unchanged.
- **Reason-specific messages.** These are shared by every full error state: the
  match list (Upcoming, Results, Home, Search), match detail, Home featured
  events, and the Favorites team catalog. Each keeps its Retry button.

  | Reason | Title | Hint |
  |---|---|---|
  | `offline` | You're offline. | Footly will reload when your connection is back. |
  | `rate-limited` | The score provider is limiting requests. | Wait a minute, then try again. |
  | `unavailable` | The score provider isn't responding. | Try again in a moment. |
  | `invalid` | Match data came back in an unexpected format. | Try again later. |
  | `unexpected` | Something went wrong. | Try again. |

  The compact error rows (featured events, catalog) show the title only.
- **Stale fallback for the match list** in `useMatchList`:
  - If a foreground load fails for every competition, or throws, and a saved
    snapshot from today can be read (any age, same local day), show it instead of
    the error state, marked stale.
  - If a background `refresh` fails for every competition, or throws, keep the
    current list (as today) but mark it stale too.
  - A later successful load clears the mark.
  - Stale lists show a banner at the top of Upcoming, Results, Home, and Search:
    "Showing matches from HH:MM. <reason title>", with a Retry button. It uses
    `role="status"` and replaces the partial-failure banner while shown.
- **Offline awareness:**
  - A `useOnlineStatus` hook follows the browser's `online` and `offline` events.
  - While offline and the list is not already stale or in error, a slim banner
    under the header says "You're offline. Scores won't update until you
    reconnect." (`role="status"`).
  - When the connection comes back, Footly calls `retry` if the list is in
    error, or `refresh` if it is stale, so no click is needed.

## Out of scope

- The background service worker. Its notification checks already skip failed
  requests and try again on the next alarm.
- Automatic retry loops, back-off timers, or cooldowns for rate limits. Retry
  stays user-driven, apart from the reconnect reload.
- New permissions, a backend, or other providers.
- Showing stale snapshots from previous days. Yesterday's fixtures are never
  presented as today's.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet for the whole feature. `workflow.checkpointCommits` is `disabled`.
`/complete` creates the feature commit.

## Build steps

- [x] **1. Failure reasons and messages.**
  - In `src/api/football.ts`:
    - export `FailureReason`;
    - give `ProviderRequestError` and `MatchDetailsError` a `reason`;
    - classify failures in `fetchJson` through an injectable
      `isOnline: () => boolean` option (defaulting to `navigator.onLine`) on the
      existing options objects;
    - map `EspnResponseError` to `invalid`;
    - add `failureReason` to the list and catalog results using the priority above.
  - Add `src/lib/errors.ts` with `LoadFailure = FailureReason | 'unexpected'` and
    `failureMessage(reason) → { title, hint }`, plus `src/lib/errors.test.ts`.
    Extend `src/api/football.test.ts`.

  **Done when:** `npm test` passes, with cases for:
  - each condition in the reason table, for both details and list;
  - the priority when competitions fail for different reasons;
  - `failureReason` absent when nothing failed;
  - unexpected errors still rethrown;
  - every message in the message table.

- [x] **2. Stale fallback in the list hook.**
  - Add `isSnapshotFromToday(snapshot, now)` to `src/lib/cache.ts`, with tests.
  - Change `MatchListState`:
    - error becomes `{ status: 'error'; reason: LoadFailure }`;
    - success gains an optional `stale?: { reason: LoadFailure }`.
  - Implement the foreground and background fallback rules in
    `src/hooks/useMatchList.ts`. Keep the current generation and cancellation
    handling.

  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. With
  existing callers compiling unchanged (they ignore the new fields), the list
  behaves as today when everything loads.

- [x] **3. Reason-specific error states and the stale banner.**
  - `MatchListError` takes a `reason` and shows the title and hint.
  - Add a `StaleBanner` next to `PartialFailureBanner` in `MatchList.tsx`, using
    `formatKickoff` for HH:MM. Use it in `MatchList`, `HomePanel`, and
    `SearchPanel`.
  - Map errors to titles in `MatchDetail`, Home featured events, and the
    Favorites catalog:
    - `useMatchDetails` error state gains `reason`, taken from
      `MatchDetailsError.reason`, otherwise `unexpected`;
    - `useTeamCatalog` error state gains `reason`, taken from `failureReason`,
      otherwise `unexpected`.

  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass. In the
  loaded extension, with DevTools Network set to Offline and no saved list for
  today (clear storage), the list shows "You're offline." with Retry. A match
  detail opened while offline shows the same title.

- [x] **4. Offline banner and reload on reconnect.**
  - Add `src/hooks/useOnlineStatus.ts` (`useSyncExternalStore` on the window
    `online`/`offline` events and `navigator.onLine`).
  - In `App.tsx`, show the offline banner as specified. On the offline-to-online
    transition, call `retry` if the list is in error, or `refresh` if it is stale.

  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass. In the
  loaded extension:
  - toggling DevTools Network to Offline shows the offline banner;
  - after a load fails, today's saved list stays visible with "Showing matches
    from HH:MM. You're offline.";
  - switching back to Online reloads the list without a click, and the banners
    clear.

  Record what was actually observed.

## Files / areas

- New: `src/lib/errors.ts`, `src/lib/errors.test.ts`,
  `src/hooks/useOnlineStatus.ts`
- Changed:
  - API and logic: `src/api/football.ts`, `src/api/football.test.ts`,
    `src/lib/cache.ts`, `src/lib/cache.test.ts`
  - Hooks: `src/hooks/useMatchList.ts`, `src/hooks/useMatchDetails.ts`,
    `src/hooks/useTeamCatalog.ts`
  - Components: `src/components/matches/MatchList.tsx`,
    `src/components/matches/MatchDetail.tsx`,
    `src/components/home/HomePanel.tsx`,
    `src/components/search/SearchPanel.tsx`,
    `src/components/favorites/FavoritesPanel.tsx`
  - App: `src/App.tsx`
- Unchanged: `src/background.ts` (it ignores the new optional fields).

## Data / contracts

- `FailureReason = 'offline' | 'rate-limited' | 'unavailable' | 'invalid'` is
  internal to the popup and API layer. It is never stored.
- The match-list snapshot format in `chrome.storage.local` is unchanged.
  `failureReason` is not saved, and `parseMatchListSnapshot` still ignores unknown
  fields.
- Stale display uses the snapshot's existing `savedAt`. "From today" means the
  same local calendar day as now (`startOfLocalDay`).
- Messages are static text. No provider text, URLs, or status codes are shown to
  the user. Unexpected errors keep their existing `console.error` logging.

## Testing

- Vitest covers failure classification and priority, the messages, and
  `isSnapshotFromToday` (steps 1–2). Hooks and UI are not unit-tested, per coding
  standards.
- No browser test command exists. Steps 3–4 are checked manually in Chrome with
  DevTools network throttling; record what was actually observed. Rate-limit
  messaging can only be seen through tests unless the provider returns 429.

## Notes for the AI

- Read `navigator.onLine` only through the injected `isOnline` in the API layer,
  so tests stay deterministic. Default to `() => globalThis.navigator?.onLine !== false`
  so a missing navigator counts as online.
- `navigator.onLine === true` doesn't prove connectivity, so a fetch failure while
  "online" is `unavailable`, not `offline`.
- Keep `role="alert"` for full error states, and use `role="status"` for the stale
  and offline banners. They are informational and must not interrupt screen
  readers on every refresh.
- Do not add a context or provider. Pass the new state through existing props.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9507,"specSha256":"cfd9b9c75793ad33024567440e673707d6741de0ae791e8e8d7b544058295811","branch":"refs/heads/feature/api-error-offline-states","head":"b73d2772477dff74fbfd5b047703ac7519e5ade0","baseRef":"refs/heads/main","baseCommit":"b73d2772477dff74fbfd5b047703ac7519e5ade0","sourceTree":"0f6d0f953691c92895810a3745271107e9ea1267","absentOptional":[]} -->
