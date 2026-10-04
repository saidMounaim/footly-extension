# Feature: Goal & Card Notifications

**From build-plan:** feature 8b
**Build attempt:** 1
**Branch:** feature/goal-card-notifications
**Status:** verified

## Goal

Notify users when a goal is scored or a red card is shown in their favorite
teams' matches, using the summaries 8a's background watcher already fetches
every minute.

Decided 2026-10-04: goals of every kind notify (goal, own goal, penalty scored);
of cards, only red cards notify (straight red or second yellow). Yellow cards,
missed penalties, and substitutions do not.

## In scope

- **Which events:** `MatchEvent.type` of `goal`, `own-goal`, `penalty-goal`, or
  `red-card`, in a watched match (a favorite team's match in its 8a watch
  window). The existing ESPN mapping (`toEventType` in `src/api/espn.ts`)
  already folds second yellows into `red-card`.
- **Notifications** (plain text, one per event):

  | Event | Title | Message |
  |---|---|---|
  | goal | "Goal! Arsenal 1–0 Chelsea" | "Saka 23' · Premier League" |
  | penalty-goal | same title | "Saka (pen) 23' · Premier League" |
  | own-goal | same title | "White (OG) 23' · Premier League" |
  | red-card | "Red card: Chelsea" | "James 67' · Premier League" |

  - The score is the match score from the same summary (`formatScore`). With
    several goals in one tick, each title shows the latest score.
  - Without a score, the goal title is "Goal! Arsenal vs Chelsea".
  - Without a player, the message starts with the minute.
  - Without a known team, the red card title is "Red card: Arsenal vs Chelsea".
  - Notification ids are `footly:<matchId>:event:<eventId>`, so an event is
    never shown twice.
  - Alerts go out in the summary's chronological order, after any 8a
    kick-off, half-time, or full-time alert from the same tick.
- **No bursts of old events:**
  - The first summary Footly fetches for a match records its event ids without
    alerting. This covers a match first seen mid-game and matches watched
    before this feature shipped.
  - When the fetched status is `finished`, `postponed`, or `cancelled`, new
    events are recorded without alerting; the 8a full-time alert covers the
    result. This stops a catch-up burst after the computer wakes from sleep.
  - An event that ESPN later removes (for example, a goal disallowed by VAR)
    is not retracted; its notification stays.
- **Same switch and bound:**
  - The "Match notifications" switch now covers these alerts. Its help text
    becomes "Kick-off, half-time, full-time, goal, and red card alerts for your
    favorite teams."
  - No new request, endpoint, or permission: the events come from the summary
    request 8a already makes.

## Out of scope

- Yellow cards, missed penalties, substitutions, VAR or other events.
- Per-event or per-team choices, sounds, and a Settings screen (feature 13).
- Retracting or editing notifications for events ESPN removes or changes.
- Opening the popup or a match from a notification.
- The open F-02 and F-04 findings and the unverified F-06 in the ledger.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`. `/complete` creates the single
feature commit. A test command exists, so every logic step ships passing tests.

## Build steps

- [x] **1. Event alert logic.** In `src/lib/notifications.ts`:
  - Add an optional `seenEventIds` to `WatchedMatch` (see Data / contracts)
    and validate it in `parseWatchedMatches`.
  - Make `mergePlan` keep a known match's `seenEventIds` as well as its
    status.
  - Add `eventAlerts(watched, fresh)`: returns the alertable events to notify
    and the new `seenEventIds`, by the rules above.
  - Add `eventNotificationContent(match, event)` and
    `eventNotificationId(matchId, eventId)`.
  **Done when:** `npm test` passes, covering:
  - Parsing a missing, valid, malformed, and duplicate-containing
    `seenEventIds`.
  - `mergePlan` keeping it.
  - `eventAlerts`: the silent first fetch, only unseen alertable types,
    chronological order, silent recording when the fetched status is final,
    and seen ids accumulating.
  - Every row of the content table, plus the fallbacks without score,
    player, or team.

- [x] **2. Wire it into the watch tick.** In `src/background.ts`, after the
  status alert, create a notification for each event from `eventAlerts` and
  save the new `seenEventIds` with the status. Update the switch help text in
  `FavoritesPanel`.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. In
  Chrome, with `dist/` reloaded:
  - During a favorite team's live match, a goal or red card shows its
    notification within about a minute.
  - If no match is live while testing: set a watched match's `seenEventIds`
    to `[]` in the worker console while it has goals. The next tick should
    show one notification per goal, and the tick after should show none.
  - The console shows no errors.

## Files / areas

- `src/lib/notifications.ts`, `src/lib/notifications.test.ts`
- `src/background.ts` - watch tick
- `src/components/favorites/FavoritesPanel.tsx` - help text
- Reused unchanged: `src/api/football.ts` (`getMatchDetails`),
  `src/api/espn.ts` (event mapping), `src/components/matches/status.ts`
  (`formatScore`)

## Data / contracts

`watchedMatches` (from 8a) gains one optional field:

```ts
type WatchedMatch = {
  // ...8a fields unchanged
  /** Event ids already recorded; missing until the first summary is fetched. */
  seenEventIds?: string[]
}
```

- On read, a missing value stays missing, which means "not fetched yet",
  and the next fetch records silently. A value that is not an array of strings
  is treated as missing. Non-string entries and duplicates are dropped.
  Entries written by 8a, with no field, therefore stay valid.
- Event ids are ESPN key-event ids (`MatchEvent.id`), stable within a match.
  The list holds every event id seen in the match, not only alertable ones, so
  it stays small: a few dozen per match. It is dropped with the match after 4
  hours, by 8a's existing rule.
- `mergePlan` keeps `seenEventIds` for known matches; new matches start
  without it.
- Notification text comes from normalized provider names and minutes, passed
  as plain strings; it is never rendered as HTML.

## Testing

- `npm test` (Vitest) covers the parser, `mergePlan`, `eventAlerts`, and the
  content and id helpers with plain data.
- The service worker and component change stay out of unit tests (coding
  standards; manual Chrome testing for the worker and notifications). Build,
  lint, code inspection, and the manual Chrome checks cover them.
- Final gate: `npm test`, `npm run build`, `npm run lint` (no Verify command exists).
- Live Chrome evidence is manual or `/check`; do not claim it unless performed.

## Notes for the AI

- Keep the worker event-driven, as in 8a: everything comes from storage and the
  current summary; no in-memory state across events.
- No new permission or request. If a change seems to need one, stop and revise
  the spec.
- Keep all alert decisions in `src/lib/notifications.ts` so they stay unit
  tested; `src/background.ts` only fetches, notifies, and saves.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7197,"specSha256":"bc0838e14b83cbc2b1a82c80955ac7731c17efe98826a5afdbc7914cc9b2676f","branch":"refs/heads/feature/goal-card-notifications","head":"060395396fc45be15b4183e3ad27f4b158f238a8","baseRef":"refs/heads/main","baseCommit":"0cb96fb294d06280fb3e60a6c4ce82172ddb562b","sourceTree":"8a96335a29cbf6f5a1c0dc0c1a75be400182b242","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 060395396fc45be15b4183e3ad27f4b158f238a8
**Base commit:** 0cb96fb294d06280fb3e60a6c4ce82172ddb562b
**Base ref:** refs/heads/main
**Spec hash:** bc0838e14b83cbc2b1a82c80955ac7731c17efe98826a5afdbc7914cc9b2676f
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-04T12:26:17Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-04T12:27:35Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `npm test`: pass (8 files, 172 tests)
- `npm run lint`: pass
- `npm run build`: pass

### Evidence

- Freshness: HEAD equals target, `git merge-base refs/heads/main HEAD` equals base, spec SHA-256 matches, only `blueprint/context/review.md` dirty.
- Delta reviewed: `src/lib/notifications.ts`, `src/lib/notifications.test.ts`, `src/background.ts`, `src/components/favorites/FavoritesPanel.tsx`, plus the spec; context read in `src/api/espn.ts` (event id/order mapping) and `watchWindow`.
- Backward compatibility: `parseSeenEventIds` keeps a missing or non-array value as missing, drops non-string/blank entries and duplicates; 8a entries stay valid.
- `mergePlan` carries `seenEventIds` for known matches only; new matches start without it.
- `eventAlerts`: missing seen ids records silently; final statuses (`DONE`) record silently; only unseen `goal`/`own-goal`/`penalty-goal`/`red-card` alert, in the summary's clock-sorted order; seen ids accumulate.
- Worker: status alert precedes event alerts per match; ids `footly:<matchId>:event:<eventId>` de-duplicate; a fetch or notify failure keeps the stored entry unchanged for retry.
- No new request, endpoint, or permission: manifest and API modules unchanged in the delta; events come from the existing `getMatchDetails` summary.
- Notification text is plain strings passed to `chrome.notifications` (no HTML rendering); content matches every row of the spec table and its fallbacks.

### Findings

- None

### Remaining risk

- Live Chrome behavior (real goal/red-card notifications, worker console) was not exercised; Check was not required and the service worker has no unit tests by project standard.
- Existing ledger entries F-02, F-04 (open P3) and F-06 (unverified P3) are unchanged and out of this feature's scope.
