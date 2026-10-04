# Feature: Favorite Teams

**From build-plan:** feature 4
**Build attempt:** 1
**Branch:** feature/favorite-teams
**Status:** verified

## Goal

Let users follow clubs and see those clubs' matches first.
- A new **Favorites** tab (Upcoming | Results | Favorites) lists followed teams
  and has a search box over every club in the six competitions.
- Teams can also be starred from the match detail view.
- Favorites are saved in `chrome.storage.local` and kept between popup opens.
- Upcoming and Results each start with a **"Your teams"** group holding
  favorite teams' matches, followed by the normal day-grouped list without
  those matches.

## In scope

- **Storage permission:** add `"storage"` to the manifest `permissions`. It's
  the extension's first permission. Still no host permissions, background, or
  content scripts. Update the manifest test to assert exactly `["storage"]`.
- **Saved favorites:** read and written through `src/lib/favorites.ts`. See
  Data / contracts for the key, shape, validation, and failure rules.
- **Team catalog:**
  - One request per competition to ESPN's standings endpoint
    (`https://site.api.espn.com/apis/v2/sports/soccer/{slug}/standings`), sent
    only when the Favorites tab is first opened in a popup session, then kept
    in memory for that popup. Retry refetches. (Revised after review: the
    `/teams` endpoint sends no CORS header and can't be called from the popup
    without a host permission; standings sends `Access-Control-Allow-Origin: *`
    for all six competitions and lists every club.)
  - Teams are deduplicated by id across competitions (Champions League clubs
    also play in domestic leagues) and sorted by name.
- **Favorites tab:**
  - **"Your teams" list:** each favorite has a "Remove" button
    (`aria-label="Remove Arsenal from favorites"`), in the order they were added.
    Empty state: "No favorite teams yet." and "Search for a team to start
    following their matches."
  - **Search field:** labelled "Search teams" (visible label). Matching ignores
    case and accents (for example "atletico" finds "Atlético Madrid") and checks
    the name and short name as substrings. An empty query shows no results.
    Each result is a toggle button with `aria-pressed` and a label like
    "Add Arsenal to favorites" or "Remove Arsenal from favorites". No matches
    shows "No teams match “query”."
  - **Catalog states:**
    - Loading: a skeleton under the search field (`aria-busy`). The saved list
      is still shown.
    - Some competitions failed: the usual notice with Retry.
    - All failed: "Couldn't load teams." with Retry. Search is disabled until
      teams load.
- **Star in the match detail view:** a toggle button next to each team name in
  the score block, with `aria-pressed` and the same add/remove label. The icon
  is ★ or ☆ with `aria-hidden`.
- **Prioritized lists:**
  - Upcoming and Results each show a "Your teams" heading first, holding every
    match in that tab where the home or away team is a favorite, in the tab's
    normal order. The usual day groups follow, without those matches.
  - Rows for favorite teams' matches show a ★ with the visually hidden text
    "Favorite team".
  - With no favorites, or none playing, the lists look exactly as today.
  - The empty message shows only when the tab has no matches at all.
- **Save failure:** if a save fails, the UI goes back to the last list that was
  actually saved, and an alert says "Couldn't save your favorites. Try again."
  (`role="alert"`) on the current screen.
- **Read failure:** a failed read at startup (including no `chrome.storage`
  available, as on the plain dev page) behaves as no favorites. The Favorites
  tab shows "Couldn't load your saved favorites." (`role="alert"`). Other
  screens show no alert.
- **Before the read succeeds:** star and add/remove toggles are disabled until
  the initial read succeeds, so an early toggle can't replace the stored list.
  After a failed read they stay disabled, so unreadable saved data is never
  overwritten.

## Out of scope

- Favorite competitions (feature 5), notifications (feature 8), the general
  search over competitions and matches (feature 9), and a personalized home
  (feature 12).
- Syncing across devices (`chrome.storage.sync`), import or export, a limit on
  how many favorites, reordering favorites.
- Teams outside the six competitions, team logos (no image requests), and
  caching the team catalog between popup opens (feature 11).
- Remembering the selected tab.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`. `/complete` creates the single
feature commit. A test command exists, so every logic step ships passing tests.

## Build steps

- [x] **1. Favorites storage and permission.**
  - Add `@types/chrome` as a dev dependency and add `chrome` to the app
    tsconfig `types`.
  - Add `"storage"` to `manifest.config.ts` and update `manifest.config.test.ts`.
  - Add `src/lib/favorites.ts` with `loadFavoriteTeams(area)` and
    `saveFavoriteTeams(area, teams)`, where `area` is a `chrome.storage`-like
    `{ get, set }` passed in for tests.
  - Add the pure helpers `toggleFavorite(teams, team)` and
    `splitByFavorites(matches, favoriteIds)`.
  **Done when:** `npm test` passes, covering:
  - The manifest asserts exactly `["storage"]`.
  - Loading a missing key gives `[]`.
  - Loading drops invalid entries, entries missing `id` or `name`, and duplicate
    ids (keeping the first), and ignores unknown fields.
  - Saving writes the exact shape.
  - A rejected `get` or `set` throws `FavoritesStorageError`.
  - Toggling adds to the end and removes by id.
  - `splitByFavorites` keeps order and matches on home or away team.

- [x] **2. Team catalog.** Use ESPN's standings endpoint
  `https://site.api.espn.com/apis/v2/sports/soccer/{slug}/standings` (curl
  confirmed: `Access-Control-Allow-Origin: *` for all six, teams under
  `children[].standings.entries[].team`). Save a trimmed real response as
  `src/api/fixtures/espn-standings.json` and remove the `/teams` fixture and URL.
  Then:
  - Add `normalizeTeams(json)` to `src/api/espn.ts`. It reads teams from every
    `children[]` group, checks the input, skips malformed teams, and throws
    `EspnResponseError` on a bad top-level shape.
  - Add `getTeamCatalog({ fetchImpl })` to `src/api/football.ts`. It makes one
    request per competition in parallel with a 10 s timeout, returns
    `{ teams, failedCompetitionIds }`, dedupes by id, sorts by name with
    `localeCompare`, and uses the same expected-vs-unexpected error rules as
    the match list.
  - Add `searchTeams(teams, query)` (accent- and case-insensitive) in
    `src/lib/search.ts`.
  **Done when:** `npm test` passes, covering:
  - The fixture and malformed teams.
  - The exact URLs, dedupe across competitions, and sorting.
  - Partial and total failure.
  - Search ignoring accents, case, and surrounding spaces; searching the short
    name; and an empty query giving `[]`.

- [x] **3. Favorites tab and detail-view star.**
  - Add `src/hooks/useFavoriteTeams.ts`. It loads once on mount and exposes
    `teams`, `isFavorite(id)`, `toggle(team)` (updates the UI immediately and
    rolls back on a failed save), and `error`.
  - Add `src/hooks/useTeamCatalog.ts`, which starts loading only when enabled.
  - Add `src/components/favorites/FavoritesPanel.tsx`,
    `src/components/favorites/TeamToggle.tsx`, and the star buttons in
    `MatchDetail`'s score block.
  - Add the Favorites tab to `tabs.ts`, and render its panel in `App.tsx`.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. In Chrome,
  with the popup loaded from `dist/`:
  - The Favorites tab shows the empty state.
  - Typing "arse" lists Arsenal, and adding it moves it to "Your teams".
  - Closing and reopening the popup keeps it.
  - Starring a team in a match's detail view adds it, and un-starring removes it.
  - With the network offline, the tab shows "Couldn't load teams." and Retry
    works once back online.
  - The console shows no errors.

- [x] **4. "Your teams" in Upcoming and Results.** `MatchList` takes the favorite
  ids, uses `splitByFavorites`, renders the "Your teams" section first, and marks
  favorite rows with the labelled ★.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. In Chrome,
  after favoriting a team that plays this week:
  - Its match appears under "Your teams" at the top of Upcoming, and not again
    in the day groups.
  - Removing the favorite returns the list to normal straight away, without a
    refetch.
  - Results behaves the same.

- [x] **5. Review follow-ups.** Repairs from the 2026-10-04 independent review
  of checkpoint `68771e1`. The reviewer couldn't record its ledger, so these
  are listed here and the next review re-examines them.
  - **Saved-list rollback (reviewer F-02):** keep a ref to the last
    successfully saved list and roll back to it on a failed save.
  - **Early toggles (reviewer F-03):** expose `ready` from `useFavoriteTeams`.
    `toggle` is ignored and every `TeamToggle` or Remove button is disabled
    until the initial read succeeds.
  - **Alert placement (reviewer F-04):** split read and save errors. The App
    banner shows only save errors; the read error shows only in the Favorites
    tab.
  - **No `chrome.storage` (reviewer F-05):** resolve `chrome.storage.local`
    inside the hook without touching `chrome` during render. A missing
    `chrome` counts as a read failure, and saves fail into the save-error path.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. Code
  inspection shows each item, and the `useFavoriteTeams` read/save paths match
  the Save failure, Read failure, and Before-the-read-succeeds rules above.

- [x] **6. Unused storage parameter (F-01).** From the 2026-10-04 independent
  review of checkpoint `1557a64`. Remove the optional `area` parameter from
  `useFavoriteTeams`; the hook always uses `chrome.storage.local` through
  `extensionStorage()`. No behavior changes.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass, and the
  hook has no `area` parameter or dependency.

## Files / areas

- `package.json`, `package-lock.json`, `tsconfig.app.json` - `@types/chrome`
- `manifest.config.ts`, `manifest.config.test.ts` - `storage` permission
- `src/lib/favorites.ts`, `src/lib/favorites.test.ts` (new)
- `src/lib/search.ts`, `src/lib/search.test.ts` (new)
- `src/api/espn.ts`, `src/api/espn.test.ts` - `normalizeTeams`, `standingsUrl`
- `src/api/football.ts`, `src/api/football.test.ts` - `getTeamCatalog`
- `src/api/fixtures/espn-standings.json` (new)
- `src/hooks/useFavoriteTeams.ts`, `src/hooks/useTeamCatalog.ts` (new)
- `src/components/favorites/FavoritesPanel.tsx`, `TeamToggle.tsx` (new)
- `src/components/matches/tabs.ts`, `MatchList.tsx`, `MatchRow.tsx`, `MatchDetail.tsx`
- `src/App.tsx`

## Data / contracts

**Saved data:** `chrome.storage.local`, under the key `favoriteTeams`.

```ts
// Stored value: array, in the order teams were added, unique by id.
type StoredFavoriteTeam = { id: string; name: string; shortName?: string }
```

- `id` is the ESPN team id, which is the same id used in `Match.homeTeam.id`
  and `Match.awayTeam.id` in every competition. `name` and `shortName` are
  stored so the Favorites list can show names without a network request. No
  logos, no timestamps, no other user data. The plan lists "favorite team IDs";
  names are added only for display.
- On read, the value is untrusted:
  - A missing key gives `[]`.
  - A non-array value gives `[]`.
  - An entry that's not an object, or has a non-string or empty `id` or
    `name`, is dropped.
  - A non-string `shortName` is dropped.
  - Duplicate ids keep the first.
  - Unknown fields are ignored and not written back.
- Writes replace the whole array. A failed read or write throws
  `FavoritesStorageError`, and the hook turns that into the alert. Nothing else
  is stored.
- Only this popup writes the key. Each toggle saves the hook's current list
  (read once on mount); there's no cross-window sync.

**Team catalog:** `getTeamCatalog()` returns
`{ teams: Team[]; failedCompetitionIds: string[] }`. `Team` is the existing
model; `logo` is kept only if it's https, as in 1b.

**List split:** `splitByFavorites(matches, ids)` returns
`{ favorites: Match[]; others: Match[] }` and keeps the input order.

All provider and stored text renders as React text nodes only.

## Testing

- `npm test` (Vitest) covers the manifest, `favorites.ts`, `search.ts`,
  `normalizeTeams`, and `getTeamCatalog` as listed in each step's Done when.
  It uses an in-memory fake storage area and a stubbed `fetchImpl`, with no
  real `chrome` APIs or network.
- Hooks and components are UI and stay out of unit tests (coding standards).
  Build, lint, and the manual Chrome checks cover them, including persistence
  across popup opens, which only a real extension can show.
- Final gate: `npm test`, `npm run build`, `npm run lint` (no Verify command exists).
- Live Chrome evidence is manual or `/check`; do not claim it unless performed.

## Notes for the AI

- `storage` is the only new permission. Don't add `unlimitedStorage`, `sync`,
  host permissions, or a background worker.
- Use `chrome.storage.local`'s promise API. Keep every `chrome.*` call inside
  `src/lib/favorites.ts` and the hook that passes in `chrome.storage.local`, so
  components and tests never touch `chrome` directly.
- Don't add a store library or context provider. One `useFavoriteTeams` call in
  `App.tsx`, passed down as props, is enough for this popup.
- Reuse `secondaryButtonClass`, the skeleton look, and the notice and alert
  blocks. Stars must have text labels, never icon or color alone.
- Keep the 1b and feature 3 request behavior unchanged: the team catalog is the
  only new request, and only when the Favorites tab opens.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":14003,"specSha256":"f82e2b4f8ae7ed378f938ac684b2b74c733937fa9ca4c3bdf22aba9edd69e734","branch":"refs/heads/feature/favorite-teams","head":"1d352d2cde00ad2fd7682e2128dddd978af9a52a","baseRef":"refs/heads/main","baseCommit":"8739911ec7f005d0c1cef20878e02ca26ffe17a3","sourceTree":"179f41e45c04941403b7c0ef0aee2e9a477fa285","absentOptional":[]} -->

## Findings

### 4/F-01 [P3] closed - useFavoriteTeams takes an injectable storage area nothing passes

**File:** src/hooks/useFavoriteTeams.ts:42
**Found:** 2026-10-04 by /audit independent (scope: current; lens: quality)
**Why it matters:** The optional `area` parameter is documented as "for tests", but hooks are excluded from unit tests by the coding standards and the only caller (`src/App.tsx:14`) passes nothing. It adds an unused configuration surface and threads `area` through both effect and callback dependencies. Injection is already covered where it is tested, in `loadFavoriteTeams`/`saveFavoriteTeams`.
**Suggested fix:** Drop the parameter and call `extensionStorage()` directly; remove `area` from the `useEffect` and `useCallback` dependency arrays. Requirement lost: none.
**Resolution:** Removed the `area` parameter and its dependencies in spec step 6 (uncommitted on top of 1557a64). Awaiting re-review. Re-reviewed 2026-10-04 by /audit independent (fresh subagent) at 1d352d2: `useFavoriteTeams()` takes no parameter, resolves storage through `extensionStorage()` inside the effect and `toggle`, and the effect and callback dependency arrays are empty. The read-failure, save-rollback, and ready-gating paths are intact; no new defect introduced. Closed.

## Independent review

**Status:** passed
**Target commit:** 1d352d2cde00ad2fd7682e2128dddd978af9a52a
**Base commit:** 8739911ec7f005d0c1cef20878e02ca26ffe17a3
**Base ref:** refs/heads/main
**Spec hash:** f82e2b4f8ae7ed378f938ac684b2b74c733937fa9ca4c3bdf22aba9edd69e734
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-04T02:23:41Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-04T02:24:42Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `8739911ec7f005d0c1cef20878e02ca26ffe17a3..1d352d2cde00ad2fd7682e2128dddd978af9a52a` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `npm test`: pass (6 files, 105 tests)
- `npm run lint`: pass
- `npm run build`: pass (tsc -b and vite build)

### Evidence

- Freshness: HEAD, merge base via refs/heads/main, and spec SHA-256 match the request; only review.md and findings.md differ from the target.
- Reviewed all 25 files in 8739911..1d352d2: manifest permission, favorites storage/validation, search, ESPN standings normalizer, team catalog, both hooks, Favorites panel, TeamToggle, MatchList/MatchRow/MatchDetail, App wiring.
- Security: stored favorites validated on read (non-array, malformed, duplicate, unknown fields); provider and stored text rendered as React text only; catalog logos https-only; manifest adds only `storage`, no host permissions.
- Save rollback restores the last successfully saved list and skips rollback while a newer save is in flight; toggles gated on a successful initial read; read error shown only in the Favorites tab, save error in the App banner.
- Catalog requested only after the Favorites tab first opens, kept in memory, Retry refetches, 10 s timeout reused via fetchJson.
- No focused, skipped, or placeholder tests found.

### Findings

- F-01 [P3] closed (re-reviewed: `area` parameter and dependencies removed, no new defect)
- F-02 [P3] open (getTeamCatalog unexpected-error rethrow untested; non-blocking)

### Remaining risk

- Check was not required and was not run; no live Chrome evidence for persistence across popup opens, offline catalog Retry, or console cleanliness was observed in this review.
- Hooks and components are excluded from unit tests by the coding standards; their behavior was verified by code inspection only.
- No Verify command or CI workflow exists.
