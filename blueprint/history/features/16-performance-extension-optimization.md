# Feature: Performance & Extension Optimization

**From build-plan:** feature 16
**Build attempt:** 1
**Branch:** feature/performance-extension-optimization
**Status:** verified

## Goal

Trim what Footly costs the user, measured where possible:

- smaller crest images;
- no background wake-ups when notifications have nothing to do;
- a first-load bundle that is split only if measurement shows a real saving.

The review packet also records a check of permissions, network requests, and
timers. Behavior stays the same.

## In scope

- **Smaller crest images:**
  - ESPN logo URLs are requested through ESPN's image resizer at twice the
    displayed size: 32px for small, 40px for medium, 80px for large.
  - If the resized image fails, `Crest` retries the original URL once, then shows
    initials or the trophy, as today.
  - Only URLs on `https://a.espncdn.com/i/…` are rewritten. Any other `https:` URL
    is used unchanged.
- **Quieter background worker:**
  - The hourly planning alarm runs only while it can lead to a notification:
    notifications on, at least one type enabled, and at least one favorite team.
  - When `plan()` finds nothing to do, it clears the planning alarm as well as the
    watch alarm.
  - When favorites or notification settings change (the existing
    `storage.onChanged` re-plan), or the worker starts, `plan()` re-creates the
    hourly alarm if it is needed again.
- **Measured bundle split:**
  1. Record the gzipped size of the popup's main script.
  2. Lazy-load `MatchDetail` (with stats and lineups), `SettingsPanel`, and
     `FavoritesPanel` with `React.lazy` and a small skeleton fallback.
  3. Keep the split only if the first-load script shrinks by at least 15 KB
     gzipped. Otherwise revert it.

  Record the before and after numbers either way.
- **Recorded check (no code unless something is wrong):**
  - Permissions: `storage`, `alarms`, `notifications`. List what each is used for.
    Confirm there are no host permissions and no content scripts.
  - Requests per popup open, worked out from the code: match list, catalog,
    summary, crests.
  - Popup timers: `useNow` intervals, `useLiveRefresh`, `useKickoffChecks`.

  Anything unnecessary that the check finds is reported. It is fixed only if it
  is a one-line removal; otherwise it goes in the packet as a follow-up.

## Out of scope

- Changing the scoreboard, summary, or standings requests (for example, date
  ranges instead of months). That changes the provider contract and needs its own
  verification.
- Image proxies, caching crests in storage, or preloading.
- Permission explanations in the UI or store listing (feature 17).
- New settings.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet for the whole feature. `workflow.checkpointCommits` is `disabled`.
`/complete` creates the feature commit.

## Build steps

- [x] **1. Sized crest URLs with fallback.**
  - Add `sizedCrestUrl(url, px)` to `src/lib/crest.ts`. It returns
    `https://a.espncdn.com/combiner/i?img=<path>&w=<px>&h=<px>` for `https:` URLs
    on host `a.espncdn.com` whose path starts with `/i/`. Any other safe URL is
    returned unchanged.
  - Update `Crest` to try the sized URL, then the original, then the fallback.
    The fallback stage resets whenever the source URL changes.

  **Done when:** `npm test` passes, with cases for:
  - rewriting a team and a league logo;
  - leaving a non-ESPN host and an `/other/` path unchanged;
  - encoding the `img` path;
  - each size.

  In Chrome, crests still show, and the Network panel shows `combiner/i`
  requests of a few KB instead of the 500px PNGs. Record whether this was
  observed, and whether any crest fell back.

- [x] **2. Planning alarm only when needed.** In `src/background.ts`:
  - when `plan()` finds notifications off, all types off, or no favorites, it
    clears `PLAN_ALARM` together with the existing `stopWatching()`;
  - otherwise it makes sure `PLAN_ALARM` exists (create it only if
    `chrome.alarms.get` finds none, so its period isn't reset);
  - `start()` no longer creates the alarm unconditionally; it enqueues `plan`.

  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass.
  - With no favorites, the service worker's `chrome.alarms.getAll()` shows no
    `footly-plan` alarm.
  - After adding a favorite with notifications on, it shows one with a 60-minute
    period.

  Record whether this was observed.

- [x] **3. Measured bundle split.**
  - Record `gzip -c dist/assets/index.html-*.js | wc -c` after `npm run build`.
  - Apply the lazy loading and measure again.
  - Keep the split only at a saving of 15 KB gzipped or more; otherwise revert
    the code.
  - Keep each lazy view's existing focus handling: the detail heading focus and
    the settings heading focus.

  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass, and the
  packet states both sizes and the decision. If the split is kept: opening a
  match, Settings, and Favorites still works, shows a skeleton briefly, and Back
  restores focus.

- [x] **4. Permission, request, and timer check.** Read-only check of
  `manifest.config.ts`, `src/api/football.ts`, `src/background.ts`, and the
  hooks. Write the results into the review packet as specified above.
  **Done when:** the packet lists:
  - each permission and its use;
  - requests per popup open, by view;
  - every running timer;
  - any follow-ups.

  `npm run build` still passes.

## Files / areas

- Changed: `src/lib/crest.ts`, `src/lib/crest.test.ts`,
  `src/components/common/Crest.tsx`, `src/background.ts`, and `src/App.tsx`
  (lazy imports, only if kept)
- Read for the check: `manifest.config.ts`, `src/api/football.ts`,
  `src/api/espn.ts`, `src/hooks/useNow.ts`, `src/hooks/useLiveRefresh.ts`,
  `src/hooks/useKickoffChecks.ts`

## Data / contracts

- No stored data changes. The alarms are named `footly-plan` and `footly-watch`
  (unchanged); only when the plan alarm exists changes.
- The crest resizer URL depends on an undocumented ESPN endpoint, like the
  rest of the provider. The fallback to the original URL means a change on ESPN's
  side degrades to today's behavior, not to broken images.
- Rewritten URLs keep `https:` and the `a.espncdn.com` host. They still pass
  through `safeImageUrl`, and `img` is URL-encoded.

## Testing

- Vitest for `sizedCrestUrl` (step 1). The background worker and components are
  not unit-tested, per coding standards.
- No browser test command exists. Steps 1–3 need Chrome observation (Network
  panel, `chrome.alarms.getAll()` in the service worker console); record what was
  actually observed. Bundle sizes come from the local build output.

## Notes for the AI

- Build sizes in `Crest` from one map, so the URL size and the CSS size stay in
  sync.
- `chrome.alarms.get` returns `undefined` for a missing alarm. Don't recreate an
  existing alarm, because that would push back its next run.
- If the split is kept, use `<Suspense>` with existing skeletons
  (`MatchTimelineSkeleton`, `CatalogSkeleton`-style blocks); do not add a loading
  library.
- Do not add a bundle-analyzer dependency; the gzip measurement is enough.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7203,"specSha256":"35227a05ccfa17f4a5b3d8ea9c2a1baa74a931858a3f9adc0c5292ad46f2f68a","branch":"refs/heads/feature/performance-extension-optimization","head":"4b484a8b9124a16bd46b4c7040d316ce90cadb17","baseRef":"refs/heads/main","baseCommit":"4b484a8b9124a16bd46b4c7040d316ce90cadb17","sourceTree":"88cee37b2d7d6ccbd95bd6b9e0244dc58de99f9a","absentOptional":[]} -->
