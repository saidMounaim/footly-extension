# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-06 [P3] unverified - A postponed match that is rescheduled under the same id is never watched again

**File:** src/lib/notifications.ts:164
**Found:** 2026-10-04 by /audit independent (scope: current; lens: quality)
**Why it matters:** `mergePlan` keeps the stored status for a known match and refreshes its `startTime`, and `watchWindow` skips `postponed`. If the provider later reschedules the same match id to a new date within the 7-day list while its stored status is still `postponed`, the watched entry keeps `postponed` and gets no kick-off, half-time, or full-time alerts. This follows the spec's "known matches keep their last notified status" rule literally; whether ESPN reuses ids for rescheduled fixtures within the list window is not verified.
**Suggested fix:** If confirmed, let `mergePlan` take the fresh status when the stored one is `postponed` and the fresh one is `upcoming` (a silent reset that cannot send a false alert). Requirement lost: none. Needs a spec decision before changing.
**Resolution:**

### F-07 [P3] unverified - Keyboard focus drops to the page body after a failed erase

**File:** src/components/settings/PrivacySection.tsx:86
**Found:** 2026-10-06 by /audit independent (scope: current; lens: quality, tests)
**Why it matters:** Clicking Erase sets state to `erasing`, which disables both the focused Erase button and Cancel. Chrome blurs a focused element when it becomes disabled, so focus likely moves to `body`. If clearing then fails, the confirmation and the `role="alert"` message appear, but Escape no longer reaches the group's `onKeyDown` and a keyboard user must tab back into the control. The spec only requires the confirmation to stay open on failure, so this is an accessibility nicety, not a contract break. Not observed in a browser during this review.
**Suggested fix:** When entering `failed`, move focus to Cancel (or Erase) in the existing `useEffect`, e.g. treat `failed` like `confirming`. Requirement lost: none.
**Resolution:**

### F-10 [P3] unverified - Follows can be saved while the "accepted" answer is never recorded

**File:** src/App.tsx:138
**Found:** 2026-10-06 by /audit independent (scope: current; lens: quality)
**Why it matters:** The answer is now written only from the `Promise.all(follows).then` callback. If that callback never runs or sees a `false` while the follows still end up stored, the competitions are followed but the saved answer stays `null`. Two paths: the popup closes after Follow before the storage writes resolve, so the callback is lost with the page; or, for a two-competition national-team suggestion, the first save fails and the second (which writes the full list) succeeds, so `useSavedValue` skips the rollback but the first result is `false`. The card stays hidden while everything is followed, but if the user later unfollows one of those competitions, the one-time card can appear again. Not reproduced; both paths need a sub-second popup close or a partial `chrome.storage.local` failure.
**Suggested fix:** If observed, record `accepted` when the follows' final state contains every suggested competition (for example, check `competitions.idSet` after settling), or accept the edge as harmless. Requirement lost: none.
**Resolution:**
