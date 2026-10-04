# Feature: Favorite Competitions

**From build-plan:** feature 5
**Build attempt:** 1
**Branch:** feature/favorite-competitions
**Status:** verified

## Goal

Let users follow any of the six competitions Footly already loads and see
those competitions' matches near the top of Upcoming and Results.
- The Favorites tab gets a **Competitions** section with one toggle per
  competition (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions
  League).
- Followed competitions are saved in `chrome.storage.local` and kept between
  popup opens.
- Upcoming and Results show, in order: **"Your teams"** (feature 4),
  **"Your competitions"** (followed competitions' remaining matches), then the
  usual day groups with everything else. Nothing is hidden.

Decided 2026-10-04 (resolves the overview's "Default competitions" question for
this feature): only the six fixed competitions can be followed, and following
prioritizes rather than filters. The six are always fetched.

## In scope

- **Saved favorites:** a second key in `chrome.storage.local`, read and written
  through `src/lib/favorites.ts`. See Data / contracts.
- **Competitions section in the Favorites tab:**
  - Placed between "Your teams" and "Find teams", with an `h2` "Competitions".
  - One toggle button per competition in `COMPETITIONS` order, showing the
    competition name and a ★/☆ icon (`aria-hidden`), with `aria-pressed` and a
    label like "Add Premier League to favorites" or "Remove Premier League from
    favorites" (the same wording as teams).
  - No network request: the names come from `COMPETITIONS`.
- **Prioritized lists:**
  - Upcoming and Results put a "Your competitions" heading after "Your teams"
    and before the day groups. It holds every match in that tab from a followed
    competition that is not already under "Your teams", in the tab's normal
    order. The day groups follow without either group's matches.
  - A match involving a favorite team stays only under "Your teams", even when
    its competition is followed.
  - "Your competitions" rows have no extra marker; the heading groups them.
    Favorite-team rows keep their ★ "Favorite team" marker.
  - With nothing followed, or no followed competition playing, the lists look
    exactly as they do after feature 4. The empty message still shows only when
    the tab has no matches at all.
  - Following or unfollowing updates the lists straight away, without a refetch.
- **Save failure:** if saving followed competitions fails, the toggles return to
  the last list that was actually saved, and the existing app-wide alert "Couldn't
  save your favorites. Try again." (`role="alert"`) shows. One alert covers
  teams and competitions.
- **Read failure:** a failed read at startup (including no `chrome.storage`)
  behaves as nothing followed. The Favorites tab shows the existing "Couldn't
  load your saved favorites." alert once, whether the team read, the
  competition read, or both failed. Other screens show no alert.
- **Before the read succeeds:** competition toggles are disabled until the
  competition read succeeds, and stay disabled after a failed read so
  unreadable saved data is never overwritten. Team toggles keep their own rule
  from feature 4, so one list's failed read does not lock the other.

## Out of scope

- Following competitions beyond the six, a competition catalog or search, and
  loading other leagues. Search over competitions is feature 9.
- Filtering or hiding unfollowed competitions, reordering the six, and changing
  which competitions are fetched.
- A follow control in the match detail view or on list rows.
- Competition logos (no image requests), notifications (feature 8), the
  personalized home (feature 12), and settings (feature 13).
- `chrome.storage.sync`, import or export, and remembering the selected tab.
- The open F-02 finding from feature 4 (an untested rethrow in
  `getTeamCatalog`); it stays in the ledger for a separate `/fix`.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`. `/complete` creates the single
feature commit. A test command exists, so every logic step ships passing tests.

## Build steps

- [x] **1. Saved competitions and list split.** In `src/lib/favorites.ts` add:
  - `FAVORITE_COMPETITIONS_KEY = 'favoriteCompetitions'`.
  - `parseFavoriteCompetitionIds(value)`, `loadFavoriteCompetitions(area)`, and
    `saveFavoriteCompetitions(area, ids)`, following the validation and error
    rules in Data / contracts and reusing `FavoritesStorageError`.
  - `toggleId(ids, id)`: adds to the end, or removes when present.
  - `splitByCompetitions(matches, competitionIds)`: returns
    `{ favorites, others }`, keeping the input order.
  **Done when:** `npm test` passes, covering:
  - A missing key and a non-array value give `[]`.
  - Non-string ids, ids not in `COMPETITIONS`, and duplicates (keeping the
    first) are dropped.
  - Saving writes exactly the array of ids under `favoriteCompetitions`.
  - A rejected `get` or `set` throws `FavoritesStorageError`.
  - `toggleId` adds to the end and removes.
  - `splitByCompetitions` matches on `match.competition.id` and keeps order.

- [x] **2. Shared saved-list hook.** Move the read, ready, rollback, and
  error logic out of `useFavoriteTeams` into
  `src/hooks/useSavedList.ts`, a generic hook that takes the load, save, and
  toggle functions. `useFavoriteTeams` keeps its current API and behavior on
  top of it. Add `src/hooks/useFavoriteCompetitions.ts` on the same hook,
  exposing `ids`, `idSet`, `isFavorite(id)`, `ready`, `toggle(id)`,
  `loadError`, and `saveError`.
  - `chrome.storage.local` is still resolved only inside the effect and the
    save path, never during render. Missing `chrome` is a read failure, and
    saves fail into the save-error path.
  - The rollback keeps feature 4's rule: return to the last successfully saved
    list unless a newer change is still in flight.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass, and code
  inspection shows both hooks follow the Save failure, Read failure, and
  Before-the-read-succeeds rules above. Hooks stay out of unit tests (coding
  standards).

- [x] **3. Competitions section in the Favorites tab.** Generalize
  `TeamToggle` into `src/components/favorites/FavoriteToggle.tsx`, which takes a
  `name`, `pressed`, `disabled`, and `onToggle()`, and update its two existing
  uses (search results and the match detail stars) with no visible or
  accessible change. Add the Competitions section to `FavoritesPanel`. In
  `App.tsx`, call `useFavoriteCompetitions()` once and pass it down. Show the
  save alert when either hook's `saveError` is set, and the read alert in the
  Favorites tab when either `loadError` is set.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. In Chrome,
  with the popup loaded from `dist/`:
  - The Favorites tab lists the six competitions, all unpressed.
  - Following La Liga presses its toggle. Closing and reopening the popup keeps
    it.
  - Team search, adding and removing teams, and the detail-view stars work as
    before.
  - The console shows no errors.

- [x] **4. "Your competitions" in Upcoming and Results.** `MatchList` takes the
  followed competition ids. It splits favorite-team matches first with
  `splitByFavorites`, then the rest with `splitByCompetitions`, and renders
  "Your teams", "Your competitions", and the day groups in that order. Heading
  ids are unique per tab (for example `upcoming-your-competitions`).
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. In Chrome,
  after following a competition that plays this week:
  - Its matches appear under "Your competitions" at the top of Upcoming (below
    "Your teams" when it is shown), and not again in the day groups.
  - A followed competition's match involving a favorite team shows only under
    "Your teams".
  - Unfollowing returns the list to normal straight away, without a refetch.
  - Results behaves the same.

## Files / areas

- `src/lib/favorites.ts`, `src/lib/favorites.test.ts` - competition storage,
  `toggleId`, `splitByCompetitions`
- `src/hooks/useSavedList.ts`, `src/hooks/useFavoriteCompetitions.ts` (new)
- `src/hooks/useFavoriteTeams.ts` - rebuilt on `useSavedList`, same API
- `src/components/favorites/FavoriteToggle.tsx` (replaces `TeamToggle.tsx`)
- `src/components/favorites/FavoritesPanel.tsx`
- `src/components/matches/MatchList.tsx`, `MatchDetail.tsx`
- `src/App.tsx`
- `src/api/football.ts` - `COMPETITIONS` is read, not changed

## Data / contracts

**Saved data:** `chrome.storage.local`, under the key `favoriteCompetitions`.

```ts
// Stored value: array of competition ids, in the order they were followed, unique.
type StoredFavoriteCompetitions = string[] // each one of COMPETITIONS[].id, e.g. 'eng.1'
```

- Ids are the ESPN slugs in `COMPETITIONS`, which are also `Match.competition.id`
  (the scoreboard normalizer sets the competition id to the requested slug).
  Names are not stored; they come from `COMPETITIONS`. No timestamps, no other
  user data. This matches the overview's "favorite competition IDs".
- On read, the value is untrusted:
  - A missing key or a non-array value gives `[]`.
  - Entries that are not strings, or not an id in `COMPETITIONS`, are dropped.
  - Duplicates keep the first.
- Writes replace the whole array. A failed read or write throws
  `FavoritesStorageError`, and the hook turns it into the alerts above.
- `favoriteTeams` keeps its feature 4 contract and is never touched by
  competition saves. The two keys are written by separate `set` calls, so
  neither save can overwrite the other list.
- Only this popup writes these keys. Each toggle saves the hook's current list
  (read once on mount); there is no cross-window sync.
- No new permission: `storage` is already granted.

**List split:** `splitByCompetitions(matches, ids)` returns
`{ favorites: Match[]; others: Match[] }` and keeps the input order. `MatchList`
applies it to the `others` from `splitByFavorites`, so each match appears in
exactly one group.

All stored and provider text renders as React text nodes only.

## Testing

- `npm test` (Vitest) covers `parseFavoriteCompetitionIds`,
  `loadFavoriteCompetitions`, `saveFavoriteCompetitions`, `toggleId`, and
  `splitByCompetitions`, using the existing in-memory storage area in
  `favorites.test.ts`. The existing feature 4 tests must keep passing unchanged.
- Hooks and components stay out of unit tests (coding standards). Build, lint,
  code inspection, and the manual Chrome checks cover them, including
  persistence across popup opens.
- Final gate: `npm test`, `npm run build`, `npm run lint` (no Verify command exists).
- Live Chrome evidence is manual or `/check`; do not claim it unless performed.

## Notes for the AI

- No new request, endpoint, or permission. The match list still fetches all six
  competitions exactly as in features 1b and 3.
- `useSavedList` exists because two lists now share the same read, rollback, and
  error rules. Keep it small and specific to this; don't add a store library or
  a context provider. One call of each favorites hook in `App.tsx`, passed down
  as props.
- Keep every `chrome.*` call inside `src/lib/favorites.ts` and the hooks.
- Reuse the Favorites panel heading style, `secondaryButtonClass`, and the
  existing alert blocks. The toggles' state must be in text labels and
  `aria-pressed`, never icon or color alone.
- Step 3 replaces `TeamToggle` with `FavoriteToggle`; delete `TeamToggle.tsx`
  once nothing imports it.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11658,"specSha256":"aff28590aa72ae7ed6d31513bda22c1874000e63122a4a77728432328156aeee","branch":"refs/heads/feature/favorite-competitions","head":"8737147c57226064fb56611312cdf97b796c187f","baseRef":"refs/heads/main","baseCommit":"0e5db6faaa5c9a52554eb46f22d9d6f974c33ccd","sourceTree":"a3453b220782bc8de650f39dcf9fc04807d3cf1f","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 8737147c57226064fb56611312cdf97b796c187f
**Base commit:** 0e5db6faaa5c9a52554eb46f22d9d6f974c33ccd
**Base ref:** refs/heads/main
**Spec hash:** aff28590aa72ae7ed6d31513bda22c1874000e63122a4a77728432328156aeee
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-04T11:30:21Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-04T11:31:56Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `0e5db6faaa5c9a52554eb46f22d9d6f974c33ccd..8737147c57226064fb56611312cdf97b796c187f` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `npm test`: pass (6 files, 115 tests)
- `npm run lint`: pass
- `npm run build`: pass

### Evidence

- Freshness: HEAD equals target, `git merge-base refs/heads/main HEAD` equals base, spec SHA-256 matches, only `blueprint/context/review.md` differed from target.
- Reviewed the full 0e5db6f..8737147 delta: `src/lib/favorites.ts` and its tests, `src/hooks/useSavedList.ts`, `useFavoriteCompetitions.ts`, `useFavoriteTeams.ts`, `FavoriteToggle.tsx` (rename of `TeamToggle.tsx`, no remaining imports), `FavoritesPanel.tsx`, `MatchList.tsx`, `MatchDetail.tsx`, `App.tsx`.
- Storage: stored competition ids are validated as untrusted (array check, string type, membership in `COMPETITIONS`, duplicates keep the first); teams and competitions write separate keys via separate `set` calls; read/write failures wrap into `FavoritesStorageError`.
- `useSavedList` preserves feature 4 read, ready, rollback-unless-newer-in-flight, and error rules; `chrome.storage` resolved only in the effect and save path; competition toggles stay disabled after a failed read; team and competition `ready` are independent.
- `MatchList` applies `splitByFavorites` then `splitByCompetitions`, so each match appears in exactly one group; empty message still keyed on the tab's full match list; heading ids are per tab.
- All stored and provider text renders as React text nodes; no new request, endpoint, or permission; `lib/favorites.ts` -> `api/football.ts` import introduces no cycle.
- Tests cover every Step 1 Done-when case; feature 4 tests unchanged.

### Findings

- None (no new findings; existing F-02 [P3] open is out of this feature's scope and was not re-examined)

### Remaining risk

- Check was not required and not run; live Chrome behavior (persistence across popup opens, toggles, list grouping) was verified only by code inspection.
- Hooks and components have no unit tests by project standard.
- Pre-existing rollback edge case inherited from feature 4: if two saves resolve out of order, `saved` may record an older list; `chrome.storage` serializes writes, so not reachable in practice (unverified).
