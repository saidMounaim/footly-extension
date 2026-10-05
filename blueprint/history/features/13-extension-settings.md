# Feature: Extension Settings

**From build-plan:** feature 13
**Build attempt:** 1
**Branch:** feature/extension-settings
**Status:** verified

## Goal

A small Settings view, opened from a gear button in the popup header, lets users
control which match notifications they get, how often live matches refresh while
the popup is open, and reach their favorites. Everything is stored locally in
`chrome.storage.local`, and the background worker and popup respect it
immediately.

## In scope

- **Placement:** a labeled gear button ("Settings") in the header opens a
  Settings view with a Back button, like the match detail view. While Settings is
  open, the tabs, panels, and any match detail are hidden. Back returns to what was
  shown before and puts focus back on the gear button. Settings is not a bottom tab.
- **Notifications section:**
  - The existing "Match notifications" master switch moves here from the
    Favorites tab. It keeps the same storage key and behavior.
  - Three per-type switches, all on by default:
    - **Match updates:** kick-off, half-time, full-time.
    - **Goals:** goal, penalty goal, own goal.
    - **Red cards.**
  - The type switches are disabled (and say so) while the master switch is off.
  - The background worker shows only enabled types. It still records statuses and
    seen event IDs for disabled types, so turning a type back on never replays
    old alerts. When the master switch is off or all three types are off, the
    worker stops watching, as it does today when notifications are off.
- **Live refresh section:** a radio group "Live match refresh" with options
  1 minute (default), 2 minutes, and 5 minutes. It sets the interval used by every
  popup `useLiveRefresh` call: the match list, match detail, and the Home
  featured live events.
- **Favorites section:** shows how many teams and competitions are followed
  ("2 teams · 1 competition"), plus a "Manage favorites" button. The button closes
  Settings and switches to the Favorites tab. It adds no new destructive actions.
- **States:**
  - Each control stays disabled until its saved value is read.
  - When a value can't be read, its section shows "Couldn't load this setting."
    and the control keeps the default.
  - A failed save rolls back and shows the existing top alert, reworded to
    "Couldn't save your changes. Try again." so it covers favorites and settings.

## Out of scope

- An appearance or theme choice (feature 14 adds an Appearance section).
- Changing the background watcher's 1-minute cadence, the hourly planning alarm,
  or snapshot freshness rules in `cache.ts`.
- Notification sounds, quiet hours, or per-team notification rules.
- Clearing or importing favorites, and resetting settings.
- New permissions.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet for the whole feature. `workflow.checkpointCommits` is `disabled`.
`/complete` creates the feature commit.

## Build steps

- [x] **1. Settings storage and filtering logic.** Add `src/lib/settings.ts` with:
  - `NOTIFICATION_TYPES_KEY = 'notificationTypes'` and
    `NotificationTypes = { matchUpdates: boolean; goals: boolean; redCards: boolean }`.
  - `parseNotificationTypes`: each field is off only when exactly `false` is
    stored; any other value or shape gives the defaults (all on).
  - `LIVE_REFRESH_KEY = 'liveRefreshMinutes'`, `LIVE_REFRESH_OPTIONS = [1, 2, 5]`,
    and `parseLiveRefreshMinutes`: any value not in the options gives 1.
  - Load/save functions for both, built on `readStoredKey`/`writeStoredKey`.
  - Pure filters `statusAlertAllowed(types, event)` and
    `eventAlertAllowed(types, eventType)`, plus `anyAlertsEnabled(types)`.

  Add `src/lib/settings.test.ts`.
  **Done when:** `npm test` passes, with cases for:
  - parse defaults and malformed values (null, array, strings, a partial object);
  - save round-trips through an in-memory area;
  - read failures surfacing `FavoritesStorageError`;
  - each filter for every event and type mapping.

- [x] **2. Background worker respects notification types.** In
  `src/background.ts`:
  - load the types in `plan` and `watch`;
  - stop watching when the master switch is off or `!anyAlertsEnabled(types)`;
  - call `notify` only for allowed status events and timeline alerts, while still
    saving status and `seenEventIds`;
  - re-plan when `NOTIFICATION_TYPES_KEY` changes in `storage.onChanged`.

  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass. In Chrome,
  turning off Goals in the service worker's storage stops goal notifications for
  a watched live match, while kick-off, half-time, and full-time still arrive.
  Record whether this was observed with a real match or not run.

- [x] **3. Settings view.** Add:
  - `src/hooks/useNotificationTypes.ts` and `src/hooks/useLiveRefreshSetting.ts`
    on `useSavedValue`;
  - `src/components/settings/SettingsPanel.tsx` with the three sections;
  - a shared `SettingSwitch` component extracted from the current
    `NotificationsSwitch` and reused for all four switches, without copying the
    markup.

  Then:
  - remove the notifications switch from `FavoritesPanel` and its
    `notifications` prop;
  - add the header gear button and the open/close/focus handling in `App.tsx`;
  - mark the Home featured events inactive while Settings is open;
  - reword the save alert and include the new settings' `saveError`.

  **Done when:** `npm run build` and `npm run lint` pass. In the loaded extension:
  - the gear opens Settings and Back restores the previous view and focuses the gear;
  - the switches and radio group work with the keyboard and persist across popup
    reopen;
  - the type switches are disabled while the master is off;
  - Manage favorites opens the Favorites tab;
  - the Favorites tab no longer shows the notifications switch.

- [x] **4. Live refresh interval.** Give `useLiveRefresh` an `intervalMs`
  parameter (replacing the direct `LIVE_REFRESH_MS` use, which stays as the 1-minute
  default constant). Pass the setting's value from `App` to the list refresh,
  `MatchDetail`, and `HomePanel`'s featured events.
  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass. During a
  live match with "5 minutes" selected, DevTools Network shows list and summary
  refetches about 5 minutes apart instead of 1. Record whether this was observed.

## Files / areas

- New: `src/lib/settings.ts`, `src/lib/settings.test.ts`,
  `src/hooks/useNotificationTypes.ts`, `src/hooks/useLiveRefreshSetting.ts`,
  `src/components/settings/SettingsPanel.tsx`,
  `src/components/settings/SettingSwitch.tsx`
- Changed: `src/background.ts`, `src/App.tsx`,
  `src/components/favorites/FavoritesPanel.tsx`, `src/hooks/useLiveRefresh.ts`,
  `src/components/matches/MatchDetail.tsx`, `src/components/home/HomePanel.tsx`
- Reused as is: `useSavedValue`, `useNotificationsSetting`, `readStoredKey`/
  `writeStoredKey`, `FavoritesStorageError`, `secondaryButtonClass`,
  `sectionHeadingClass`

## Data / contracts

New `chrome.storage.local` keys. Both are local to the user and validated as
untrusted on read:

| Key | Stored shape | Default | Invalid value |
|---|---|---|---|
| `notificationTypes` | `{ "matchUpdates": boolean, "goals": boolean, "redCards": boolean }` | all `true` | any field not exactly `false` reads as `true` |
| `liveRefreshMinutes` | `1 \| 2 \| 5` | `1` | reads as `1` |

- Saves always write the full object or number. No migration is needed: missing
  keys mean the defaults, which match today's behavior.
- `notificationsEnabled` is unchanged. It stays the master switch.
- Type mapping:
  - kickoff, halftime, fulltime → `matchUpdates`
  - goal, penalty-goal, own-goal → `goals`
  - red-card → `redCards`
- Settings text is static. Counts render as React text only.

## Testing

- Vitest for `src/lib/settings.ts` (step 1). UI components and the service
  worker are not unit-tested, per coding standards. Steps 2 to 4 use build, lint,
  tests, and manual Chrome checks.
- No browser test command exists. Live notification and refresh timing can only
  be seen during real live matches. Record what was actually observed.

## Notes for the AI

- The radio group uses native `<input type="radio">` inside a `<fieldset>` with a
  `<legend>`, for built-in keyboard handling.
- Each switch keeps `role="switch"` and `aria-checked`, with a label and
  description linked by ID. Use `useId` so IDs don't collide.
- When the master switch is off, the type switches get `disabled` plus help text
  "Turn on match notifications to choose types."
- Keep IDs and section headings prefixed with `settings-`.
- Don't add a settings context or provider. Pass props from `App`, as the
  existing hooks do.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8761,"specSha256":"50d64453f37c0b4bec7e4fd139cf354141a0b865bc1990b5aa019280440252af","branch":"refs/heads/feature/extension-settings","head":"9ee212dc96708fd7319d6ee2f8b408ae79d76580","baseRef":"refs/heads/main","baseCommit":"9ee212dc96708fd7319d6ee2f8b408ae79d76580","sourceTree":"88e76eaeb2450bea4701b28c2c74063ca72b45ed","absentOptional":[]} -->
