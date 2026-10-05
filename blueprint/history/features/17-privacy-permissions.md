# Feature: Privacy & Permissions

**From build-plan:** feature 17
**Build attempt:** 1
**Branch:** feature/privacy-permissions
**Status:** verified

## Goal

Footly explains, inside the extension and in the repository, what it can do and
why:

- each Chrome permission;
- what it keeps on the device;
- which servers it contacts.

Users can erase everything Footly stored, in two clicks. Network requests carry
no more information than they need. The permission list stays minimal, and a
test guards it.

## In scope

- **"Privacy & permissions" section** at the bottom of Settings (static text,
  `settings-` IDs):
  - **Summary:** "Footly has no account and collects nothing about you. Your
    favorites and settings stay on this device."
  - **Permissions,** one line each:
    - **Storage:** saves your favorites, settings, and recent match data on this
      device.
    - **Alarms:** wakes Footly around your favorite teams' kickoffs to check for
      alerts.
    - **Notifications:** shows kick-off, goal, red card, and result alerts.
  - **Servers contacted:**
    - scores from ESPN (`site.api.espn.com`);
    - club crests and league logos from ESPN's image server (`a.espncdn.com`);
    - a note that, like any web request, these reveal your IP address to ESPN,
      and Footly sends nothing else about you.
  - The permission lines come from one shared list, so the text can't drift from
    the manifest.
- **Erase Footly data:** a two-step control in that section.
  - The first click on "Erase Footly data" swaps it for an inline confirmation:
    "This removes your favorites, settings, and saved matches from this device."
    with **Erase** and **Cancel** buttons. Focus moves to Cancel.
  - Erase does three things:
    1. clears `chrome.storage.local`;
    2. removes the `footly-theme` mirror from `localStorage`;
    3. clears Footly's alarms (`chrome.alarms.clearAll()`).

    It then reloads the popup, which starts from defaults.
  - Cancel or Escape restores the button and puts focus back on it.
  - If clearing fails, nothing reloads. The section shows "Couldn't erase your
    data. Try again." (`role="alert"`) and the confirmation stays open.
  - There are no browser dialogs.
- **Leaner requests:** `fetchJson` sends `referrerPolicy: 'no-referrer'`, the
  same as crest images already do.
- **`PRIVACY.md`** at the repository root: a plain privacy policy covering the
  same facts as the Settings section. It covers:
  - no account and no analytics;
  - what is stored locally and why, listing each storage key;
  - the servers contacted;
  - no browsing history, no page access, no content scripts, no selling of data;
  - how to erase data: the Settings button, or removing the extension;
  - a contact line pointing to the GitHub repository's issues.
- **Permission guard:** `manifest.config.test.ts` also asserts that every
  manifest permission has an explanation in the shared list, and the reverse.

## Out of scope

- Publishing the policy or store listing text, and hosting a policy URL
  (feature 18).
- Analytics, crash reporting, or any opt-in data collection.
- Removing any current permission: all three are in use (confirmed by feature
  16's check).
- Per-item deletion beyond what the existing settings already offer.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet for the whole feature. `workflow.checkpointCommits` is `disabled`.
`/complete` creates the feature commit.

## Build steps

- [x] **1. Shared permission list, request referrer, and guard test.**
  - Add `src/lib/privacy.ts` exporting:
    - `PERMISSION_EXPLANATIONS`: an ordered list of
      `{ permission, label, reason }` for `storage`, `alarms`, and
      `notifications`;
    - `CONTACTED_HOSTS`: `site.api.espn.com` and `a.espncdn.com`, each with its
      purpose.
  - Extend `manifest.config.test.ts` to compare the manifest's `permissions`
    with the list in both directions.
  - Add `referrerPolicy: 'no-referrer'` to the `fetchJson` request init, and
    assert it in `src/api/football.test.ts`.

  **Done when:** `npm test` and `npx tsc -b` pass. Adding a permission to the
  manifest without an explanation, or the reverse, makes the manifest test fail.

- [x] **2. Privacy section and erase control.**
  - Add `src/components/settings/PrivacySection.tsx` rendering the section from
    the shared lists, plus the two-step erase control.
  - Add `src/lib/erase.ts` with `eraseFootlyData({ storage, alarms, page })`. It
    takes injectable dependencies (`clear()`, `clearAll()`, and
    `removeItem(key)`), so it is testable. It clears storage first, then the
    alarms, then the theme mirror, and rejects if storage clearing fails.
  - Add `src/lib/erase.test.ts`. Render the section last in `SettingsPanel`.

  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass. The tests
  cover:
  - the call order;
  - a storage failure rejecting before alarms and the mirror are touched;
  - a mirror `removeItem` that throws being ignored.

  In Chrome:
  - the section lists the three permissions and both servers;
  - Erase → Cancel restores focus;
  - Erase → Erase reloads the popup with no favorites and default settings, and
    the service worker's `chrome.alarms.getAll()` is empty.

  Record what was observed.

- [x] **3. `PRIVACY.md`.** Write the policy at the repository root and mention it
  in `README.md`, if a natural spot exists.
  **Done when:** every storage key from `src/lib/` (`favoriteTeams`,
  `favoriteCompetitions`, `notificationsEnabled`, `notificationTypes`,
  `liveRefreshMinutes`, `theme`, `matchListCache`, `teamCatalogCache`,
  `watchedMatches`), the `footly-theme` mirror, both hosts, and the three
  permissions appear in it. It matches the Settings wording.

## Files / areas

- New: `src/lib/privacy.ts`, `src/lib/erase.ts`, `src/lib/erase.test.ts`,
  `src/components/settings/PrivacySection.tsx`, `PRIVACY.md`
- Changed: `manifest.config.test.ts`, `src/api/football.ts`,
  `src/api/football.test.ts`, `src/components/settings/SettingsPanel.tsx`, and
  `README.md` (one link, if it fits)

## Data / contracts

- Erase uses `chrome.storage.local.clear()`. Every key returns to its documented
  default on the next read, as the parsers already handle missing values.
  - The background worker's `storage.onChanged` re-plan then sees no favorites
    and stops watching.
  - It may write an empty `watchedMatches` list back. That is harmless and holds
    no user data.
- No new stored keys and no new permissions.
- `src/lib/privacy.ts` must stay free of DOM and Chrome types, because the
  node-side `manifest.config.test.ts` imports it.

## Testing

- Vitest covers the permission guard (manifest test), the fetch referrer policy,
  and the erase ordering and failure handling. Components are not unit-tested,
  per coding standards.
- No browser test command exists. The erase flow and section rendering are
  checked manually in Chrome; record what was actually observed.

## Notes for the AI

- The confirmation is inline UI, not `window.confirm`.
- Keyboard handling:
  - Escape closes the confirmation;
  - focus moves to Cancel when it opens;
  - focus returns to the trigger when it closes.
- After a successful erase, call `location.reload()`. The popup re-reads
  defaults, and `main.tsx` falls back to the system theme because the mirror is
  gone.
- Keep the wording identical between Settings and `PRIVACY.md` where they state
  the same fact.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7494,"specSha256":"3e8a18796ec56105b1ee514fbb5f9e9aa2ffc3d87479a7dc7043ecfaef39b723","branch":"refs/heads/feature/privacy-permissions","head":"89060b0b454662519d6f0596205a1903f19cf3c3","baseRef":"refs/heads/main","baseCommit":"79f31d2b668f620c3ed1e142d98875409df83a30","sourceTree":"cb9dc2f8f13a71c1306ed5072a630b6a831f6bdc","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 89060b0b454662519d6f0596205a1903f19cf3c3
**Base commit:** 79f31d2b668f620c3ed1e142d98875409df83a30
**Base ref:** main
**Spec hash:** 3e8a18796ec56105b1ee514fbb5f9e9aa2ffc3d87479a7dc7043ecfaef39b723
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-05T22:59:13Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-06T00:01:00Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD` / `git merge-base main HEAD` / `shasum -a 256 blueprint/context/current-feature.md` / `git status --porcelain --untracked-files=all`: pass (all preconditions match; only review.md differs)
- `npm test`: pass (16 files, 371 tests)
- `npm run lint`: pass
- `npx tsc -b`: pass
- `npm run build`: pass

## Evidence

- Reviewed the full `79f31d2..89060b0` delta (11 files): PRIVACY.md, manifest.config.test.ts, src/api/football.ts and test, src/components/settings/PrivacySection.tsx and SettingsPanel.tsx, src/lib/erase.ts and test, src/lib/privacy.ts, src/lib/theme.ts, plus the spec.
- Permission guard: `manifest.config.test.ts` compares manifest `permissions` to `PERMISSION_EXPLANATIONS` order-sensitively, so a missing or extra entry fails; `privacy.ts` has no DOM or Chrome types.
- `fetchJson` is the only API fetch site and now sends `referrerPolicy: 'no-referrer'`; crests already did (Crest.tsx:61).
- `eraseFootlyData` clears storage, then alarms, then the `footly-theme` mirror, rejects before touching the others on storage failure, and ignores a throwing or missing mirror; all three cases are tested.
- Erase UI: inline confirmation, focus to Cancel on open, Escape/Cancel return focus to the trigger, failure shows `role="alert"` and keeps the confirmation open, success calls `location.reload()`; no browser dialogs.
- Background interaction: clearing storage fires `onChanged` for favorite/notification keys, which queues `plan()` behind any in-flight task; with no favorites it clears both alarms and stores an empty watched list, as the spec's data contract allows.
- PRIVACY.md lists all nine storage keys, the mirror, both hosts, and the three permissions, with wording matching Settings. README is the untouched Vite template with no natural spot, which the spec makes optional.

## Findings

- F-07 [P3] unverified: focus drops to body after a failed erase (PrivacySection.tsx:86); non-blocking.
- F-06 (pre-existing, outside this delta) left unchanged.

## Remaining risk

- No browser test command exists; the erase flow, focus behavior, and section rendering were not exercised in Chrome in this review (Check not required).
- An in-flight background `watch()` or `plan()` that started before erase can rewrite `watchedMatches`/`matchListCache` or re-create the watch alarm; the queued re-plan then clears alarms and empties the watched list, but `matchListCache` (non-personal fixture data) may be re-saved. Runtime ordering not verified.
- No dependency or security scanner is declared; no vulnerability scan was run.
