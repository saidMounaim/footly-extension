# Feature: Match Start & Result Notifications

**From build-plan:** feature 8a
**Build attempt:** 1
**Branch:** feature/match-start-result-notifications
**Status:** verified

## Goal

Notify users when their favorite teams' matches kick off, reach half-time, and
finish, even when the popup is closed.
- This adds Footly's first background service worker, using `chrome.alarms` for
  scheduled checks and `chrome.notifications` for alerts.
- Checks run only around favorite teams' matches.
- A "Match notifications" switch in the Favorites tab turns it all off.

Decided 2026-10-04:
- An hourly plan finds favorite teams' matches. From just before kickoff until
  full-time, a 1-minute check watches each of those matches.
- The off switch lives in the Favorites tab, on by default, until Settings
  (feature 13) exists.
- Goals and cards are 8b.

## In scope

- **Permissions and worker:** add `alarms` and `notifications` to the manifest
  `permissions` (with `storage`), and a module service worker at
  `src/background.ts`. Still no host permissions or content scripts.
- **Which matches:** matches where the home or away team is a favorite team
  (`favoriteTeams`, from feature 4). Followed competitions do not trigger
  notifications.
- **Notifications** (one per event per match, plain text):

  | Event | When | Title | Message |
  |---|---|---|---|
  | Kick-off | stored status `upcoming`, new status `live` | "Kick-off: Arsenal vs Chelsea" | competition name |
  | Half-time | new status `halftime` (from `upcoming` or `live`) | "Half-time: Arsenal 1–0 Chelsea" | competition name |
  | Full-time | new status `finished` (from any in-play or upcoming status) | "Full-time: Arsenal 2–1 Chelsea" | competition name |

  - The score uses the existing `formatScore`. Without a score, titles fall
    back to "Arsenal vs Chelsea".
  - The second half restarting (`halftime` to `live`), `postponed`, and
    `cancelled` send nothing.
  - The first time Footly sees a match, it records the status without
    notifying, so installing or adding a favorite mid-match never sends a
    burst of old events. A match already live when first seen still gets its
    half-time and full-time alerts.
  - Notification ids are `footly:<matchId>:<event>`, so a repeated event
    replaces the earlier notification instead of stacking.
  - Clicking a notification only dismisses it.
- **Hourly plan** (alarm `footly-plan`, every 60 minutes, plus on install, on
  browser startup, and whenever `favoriteTeams` or `notificationsEnabled`
  changes):
  - When notifications are off or there are no favorite teams, it clears the
    watch state and the watch alarm, and sends no request.
  - Otherwise it calls `getMatchList()` once (the popup's requests) and keeps
    favorite teams' matches from `upcoming`.
  - It merges them into the watched list: new matches are recorded silently;
    known matches keep their last notified status.
  - It schedules the watch alarm (below).
  - If every competition fails, it keeps the current watched list and waits for
    the next hour. A partial failure plans with what loaded.
- **Watch** (alarm `footly-watch`, every 1 minute while needed):
  - A match is in its watch window from 1 minute before kickoff until it is
    `finished`, `postponed`, or `cancelled`, or until 4 hours after kickoff,
    whichever comes first.
  - Each tick fetches `getMatchDetails()` for each watched match in its window
    (one summary request per match), compares the new status with the stored
    one, sends any notifications, and saves the new status.
  - A failed request keeps the stored status; the next tick tries again.
  - When no match is in its window, the watch alarm is cleared and recreated to
    fire at the next watched kickoff minus 1 minute. With none ahead, it isn't
    recreated.
  - Matches out of their window and more than 4 hours past kickoff are dropped
    from the watched list.
- **Off switch (Favorites tab):**
  - A "Match notifications" switch (`role="switch"`, `aria-checked`, visible
    label) with the help text "Kick-off, half-time, and full-time alerts for your
    favorite teams."
  - It is saved in `chrome.storage.local`, on by default, and follows the same
    rules as favorites: disabled until the saved value is read, rolled back with
    the existing save alert on failure, and the existing read alert on read
    failure.
  - Turning it off stops all background checks through the storage-change
    replan.
- **Notification icon:** add a 128 px PNG at `public/icons/notification-128.png`
  (Chrome requires an icon for basic notifications). It is a plain
  placeholder in the accent color, generated once with a small Node script
  (zlib only, no dependency) and committed. Branding comes later.

## Out of scope

- Goal, card, and other event notifications (8b).
- Notifications for followed competitions, quiet hours, per-team or per-event
  choices, sounds, and a Settings screen (feature 13).
- Opening the popup or a match from a notification.
- Any refresh of the popup's own data (feature 11), offline handling beyond
  "try again next tick" (feature 15), and a backend.
- Extension icons for the toolbar or store listing.
- The open F-02 and F-04 findings and the closed F-03 entry in the ledger.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`. `/complete` creates the single
feature commit. A test command exists, so every logic step ships passing tests.

## Build steps

- [x] **1. Notification logic.** Add `src/lib/notifications.ts` with pure
  functions:
  - `parseNotificationsEnabled(value)`: `false` only for the boolean `false`;
    anything else, including a missing value, is `true`.
  - `parseWatchedMatches(value)`: validates the stored watched list (see Data /
    contracts), dropping malformed entries and duplicate ids.
  - `mergePlan(watched, favoriteMatches, now)`: adds new matches silently,
    keeps stored statuses for known ones, refreshes kickoff and names, and drops
    matches past the 4-hour cutoff that are out of their window.
  - `watchWindow(watched, now)`: the matches to check now, plus the next time
    the watch alarm should fire.
  - `statusEvent(previous, next)`: `'kickoff' | 'halftime' | 'fulltime' | null`.
  - `notificationContent(match, event)`: `{ title, message }`.
  **Done when:** `npm test` passes, covering each function's rules above:
  - The parsers' defaults, invalid input, and duplicates.
  - Silent first sighting, kept statuses, and the 4-hour drop.
  - The window edges (1 minute before kickoff, terminal statuses, 4 hours) and
    the next fire time.
  - Every status pair in the event table, including the ones that send nothing.
  - Titles with and without a score.

- [x] **2. Background worker.** Add `src/background.ts` and register it in
  `manifest.config.ts` as `background: { service_worker: 'src/background.ts',
  type: 'module' }`, with `permissions: ['storage', 'alarms', 'notifications']`.
  Update `manifest.config.test.ts` to assert exactly those permissions, the
  background entry, and still no host permissions or content scripts. Wire:
  - `runtime.onInstalled` and `runtime.onStartup` create `footly-plan`
    (60-minute period) and run the plan.
  - `alarms.onAlarm` runs the plan or the watch tick.
  - `storage.onChanged` (local area, `favoriteTeams` or
    `notificationsEnabled`) runs the plan.
  Keep the worker a thin layer over step 1 and the existing
  `getMatchList`, `getMatchDetails`, and `loadFavoriteTeams`. Generate and add
  the notification icon.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass;
  `dist/manifest.json` lists the service worker and the three permissions; and
  in Chrome, with `dist/` loaded:
  - The service worker starts without errors (`chrome://extensions`, Inspect
    views).
  - `chrome.alarms.getAll()` in the worker console shows `footly-plan`.
  - With a favorite team playing, a kick-off, half-time, or full-time
    notification appears (or, if none plays during testing, temporarily setting
    a watched match's stored status in the worker console and waiting one tick
    shows the matching notification).

- [x] **3. Off switch.** Add `NOTIFICATIONS_ENABLED_KEY` load and save in
  `src/lib/notifications.ts` (using the existing `StorageArea` and
  `FavoritesStorageError`). Generalize `useSavedList` into a value hook so the
  switch reuses the same read, ready, rollback, and error rules instead of
  copying them. Add the switch to `FavoritesPanel` above "Your teams", and fold
  its read and save errors into the existing alerts in `App.tsx`.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. In Chrome:
  - The switch shows on, and toggling it off then reopening the popup keeps it
    off.
  - With it off, the worker's `chrome.alarms.getAll()` shows no `footly-watch`,
    and the plan sends no requests (Network panel of the worker).
  - Turning it back on replans.
  - The console shows no errors.

- [x] **4. Due matches never wait for a later alarm (F-05).** From the
  2026-10-04 independent review of checkpoint `8043cc8`. When a match is in its
  watch window, `scheduleWatch` must make sure the watch alarm fires within the
  next minute, recreating the 1-minute alarm when the existing one is scheduled
  later (for example, at another match's kickoff minus 1 minute). Put the
  decision in a pure `watchAlarmNeedsReset(scheduledTime, now)` helper in
  `src/lib/notifications.ts`.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass, covering:
  a missing alarm and an alarm more than a minute away need a reset; an alarm
  within the next minute does not. Mark F-05 `fixed`.

## Files / areas

- `manifest.config.ts`, `manifest.config.test.ts` - permissions and worker
- `src/background.ts` (new) - service worker wiring
- `src/lib/notifications.ts`, `src/lib/notifications.test.ts` (new)
- `public/icons/notification-128.png` (new, generated placeholder)
- `src/hooks/useSavedList.ts` - generalized to a value hook; existing list hooks
  keep their APIs
- `src/hooks/` - a small hook for the switch on top of it
- `src/components/favorites/FavoritesPanel.tsx`, `src/App.tsx`
- Reused unchanged: `src/api/football.ts` (`getMatchList`, `getMatchDetails`),
  `src/lib/favorites.ts` (`loadFavoriteTeams`, `StorageArea`),
  `src/components/matches/status.ts` (`formatScore`)

## Data / contracts

**`notificationsEnabled`** in `chrome.storage.local`: a boolean. A missing or
non-boolean value reads as `true`. Writes store exactly `true` or `false`.

**`watchedMatches`** in `chrome.storage.local`, written only by the service
worker:

```ts
type WatchedMatch = {
  id: string
  competitionId: string // one of COMPETITIONS[].id
  competitionName: string
  startTime: string // ISO 8601 UTC, parseable
  home: { id: string; name: string }
  away: { id: string; name: string }
  status: MatchStatus // last status Footly saw and acted on
}
// Stored value: WatchedMatch[], unique by id.
```

- On read the value is untrusted:
  - A non-array value gives `[]`.
  - Entries with a missing or non-string field, an unknown competition, an
    unparseable `startTime`, or an unknown status are dropped.
  - Duplicate ids keep the first.
- Writes replace the whole array. The worker turns a `WatchedMatch` back into a
  `Match` (with `events: []`) for `getMatchDetails`.
- Read or write failures in the worker are logged and the run ends; the next
  alarm retries. Nothing is shown to the user from the worker.
- The worker writes `watchedMatches`; the popup writes `favoriteTeams`,
  `favoriteCompetitions`, and `notificationsEnabled`. No key has two writers.

**Request bound:**
- Plan: at most one `getMatchList()` per hour, plus one per favorites or
  switch change, and only when the switch is on with at least one favorite
  team.
- Watch: at most one summary request per favorite match per minute, only
  inside its window (at most 4 hours and 1 minute per match).
- Nothing at all when the switch is off or there are no favorite teams.

**Notification text** comes from normalized provider names and is passed to
`chrome.notifications.create` as plain strings; it is never rendered as HTML.

## Testing

- `npm test` (Vitest) covers every function in `src/lib/notifications.ts` with
  fixed `now` values and plain data, plus the manifest test.
- The service worker, hooks, and components stay out of unit tests (coding
  standards; the overview names manual Chrome testing for service workers and
  notifications). Build, lint, code inspection, and the manual Chrome checks
  cover them.
- Final gate: `npm test`, `npm run build`, `npm run lint` (no Verify command exists).
- Live Chrome evidence is manual or `/check`; do not claim it unless performed.

## Notes for the AI

- Keep the worker event-driven: no `setInterval`, no long-lived loops, no state
  kept only in memory between events. Everything it needs comes from
  `chrome.storage.local` and alarms, since Chrome may stop it at any time.
- Register listeners at the top level of `src/background.ts` so they survive
  worker restarts.
- `alarms`, `notifications`, and `storage` are the only permissions. No host
  permissions, `unlimitedStorage`, `tabs`, or content scripts.
- Keep every `chrome.*` call in `src/background.ts`, `src/lib/favorites.ts`,
  `src/lib/notifications.ts` (storage only), and hooks; components stay free of
  `chrome`.
- The switch uses the existing alert blocks and Favorites panel styles; its state
  is announced through `role="switch"` and `aria-checked`, never color alone.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13646,"specSha256":"f83968a46a05f9349a241969ed75bb99ea9f165cfc6c0eb58598b9fb2b756f08","branch":"refs/heads/feature/match-start-result-notifications","head":"12485fed94d597945358ae67b808b68fa962815a","baseRef":"refs/heads/main","baseCommit":"33d4972836de8c764091c4cbfad7b156568955cb","sourceTree":"e8eb8a83889de76a658355034bb922334e7674bb","absentOptional":[]} -->

## Findings

### 8a/F-03 [P2] closed - Detail kickoff refresh can be overwritten by the slower foreground load

**File:** src/hooks/useMatchDetails.ts:53
**Found:** 2026-10-04 by /audit independent (scope: current; lens: quality)
**Why it matters:** `useKickoffChecks` in `MatchDetail` schedules from `shown`, which falls back to the `match` prop while the details load is still in flight, so a kickoff check can fire during that load (for example, the detail opened a few seconds before kickoff + 1, or a detail Retry just before a check, with a request taking up to the 10 s timeout). `refresh` and the foreground load then write `settled` for the same key with no ordering guard. If the background refresh lands first, the older foreground response overwrites it: a stale "upcoming" result undoes the Live switch until the next check, and a foreground failure replaces the freshly loaded details with the full "Couldn't load match details." error. This contradicts the spec intent that an old response never overwrites newer data. The list hook is not affected because it only schedules checks after a successful load.
**Suggested fix:** In `useMatchDetails.refresh`, skip the refetch while the current key has not settled yet (the in-flight load already returns fresh data), for example by tracking the settled key in a ref and returning early when it differs from `currentKey.current`. Requirement lost: none.
**Resolution:** Fixed on fix/detail-refresh-overwritten-by-first-load: `useMatchDetails` records the key of the last settled foreground load in `settledKey`, and `refresh` returns without a request until the current key has settled, so a background refresh can no longer race the first load. Awaiting re-review. Re-reviewed 2026-10-04 by /audit (scope: fix commit 0c41398..33d4972 plus caller useKickoffChecks; all lenses): `settledKey` is written only by a non-cancelled foreground load, so `refresh` sends no request until the current key's first load settles, and still writes only when its starting key is current; Retry and unmount still drop stale responses; a skipped refresh resolves, `useKickoffChecks` reschedules from the last fired slot, so no tight loop and no extra requests. No new defect. Closed.

### 8a/F-05 [P1] closed - A match already in its window waits for a stale future watch alarm

**File:** src/background.ts:35
**Found:** 2026-10-04 by /audit independent (scope: current; lens: quality)
**Why it matters:** When `scheduleWatch` finds due matches it only checks that `footly-watch` exists, not when it next fires. A plan that previously found nothing due leaves the alarm set for the next kickoff minus 1 minute (line 41), possibly hours or days away. If a later plan adds a match that is already inside its window, the existing future alarm is kept and that match is not checked until the other kickoff. Reachable paths: adding a favorite team during its match while another favorite plays later (the spec says a match already live when first seen still gets half-time and full-time alerts), a competition that failed in the earlier plan loading in a later one, or a kickoff moved earlier. Example: plan at 14:00 schedules the alarm for 19:59; at 15:05 the user favorites a team whose match kicked off at 15:00; the plan sees it due but keeps the 19:59 alarm, so the half-time and full-time alerts are never sent (by 19:59 the match is finished or past the cutoff). This breaks the spec's "each tick fetches each watched match in its window" every minute contract.
**Suggested fix:** In the due branch, recreate the alarm unless the existing one fires within the next minute, for example `const alarm = await chrome.alarms.get(WATCH_ALARM); if (!alarm || alarm.scheduledTime > now.getTime() + 60_000) await chrome.alarms.create(WATCH_ALARM, { periodInMinutes: 1 })`. Requirement lost: none.
**Resolution:** Fixed in spec step 4 (uncommitted on top of 8043cc8): `scheduleWatch` now reads the existing `footly-watch` alarm and recreates the 1-minute alarm when `watchAlarmNeedsReset(scheduledTime, now)` says it is missing or scheduled more than a minute away; the helper is unit tested. Awaiting re-review. Re-reviewed 2026-10-04 by /audit independent (scope: current 33d4972..12485fe; all lenses; fresh subagent): in the due branch `scheduleWatch` (src/background.ts:35-40) reads `footly-watch` and recreates the 1-minute alarm when `watchAlarmNeedsReset` (src/lib/notifications.ts:193) reports it missing or scheduled more than 60 s away, so a stale kickoff-minus-1 alarm can no longer delay a due match. An alarm already firing within the minute (including an overdue one) is kept, so repeated plans do not starve or multiply ticks and the one-request-per-match-per-minute bound holds. The boundary cases are tested in src/lib/notifications.test.ts. No new defect. Closed.

## Independent review

**Status:** passed
**Target commit:** 12485fed94d597945358ae67b808b68fa962815a
**Base commit:** 33d4972836de8c764091c4cbfad7b156568955cb
**Base ref:** refs/heads/main
**Spec hash:** f83968a46a05f9349a241969ed75bb99ea9f165cfc6c0eb58598b9fb2b756f08
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-04T12:01:24Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-04T12:03:35Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `npm test`: pass (8 files, 160 tests)
- `npm run lint`: pass
- `npm run build`: pass (dist/manifest.json lists the module service worker and exactly storage, alarms, notifications; no host permissions or content scripts)

### Evidence

- Freshness verified before review: HEAD, merge base from refs/heads/main, and spec SHA-256 match the request; only review.md and findings.md differ from the target.
- Full 33d4972..12485fe delta reviewed: manifest and its test, src/background.ts, src/lib/notifications.ts and tests, src/lib/favorites.ts, useSavedValue rename and its callers, useNotificationsSetting, FavoritesPanel, App, icon, build plan.
- Worker lifecycle: all listeners registered at top level; state comes from chrome.storage.local and alarms; the in-memory queue only serializes plan and watch within one worker lifetime and is not relied on across events.
- Trust boundaries: watchedMatches and notificationsEnabled are parsed as untrusted (unknown competition, unparseable time, unknown status, malformed sides, duplicate ids dropped); notification text is passed as plain strings; worker bundle imports no React.
- Request bound and off switch: plan sends no request when off or without favorite teams and clears the watch alarm and list; watch requests only due matches, at most once per minute per match; a storage change replans through the serialized queue.
- F-05 re-examined in src/background.ts and src/lib/notifications.ts: defect gone, no new defect; closed.
- No focused, skipped, or placeholder tests; no em dash, en dash, or ellipsis characters in new code lines.

### Findings

- F-05 [P1] closed (re-reviewed repair)
- No new findings. Carried: F-02 [P3] open, F-04 [P3] open, F-06 [P3] unverified, F-03 [P2] closed.

### Remaining risk

- Live Chrome behavior (worker start, real notifications, alarm timing, off switch stopping network in the worker) was not exercised; Check was not required and no browser evidence was inspected.
- The spec's "clicking a notification only dismisses it" relies on platform default behavior; no onClicked handler exists, so whether a click closes the notification on every OS is unverified.
- F-06 (rescheduled postponed match under the same id) remains an unverified lead needing a spec decision.
- No Verify command or CI workflow exists.
