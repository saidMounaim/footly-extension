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

### F-08 [P2] open - A failed Follow save still records "accepted", so the card is gone with nothing followed

**File:** src/App.tsx:129
**Found:** 2026-10-06 by /audit independent (scope: current; lens: quality)
**Why it matters:** `followLocalLeague` toggles each competition and then immediately calls `localLeague.answer('accepted')`. The two saves are independent: if the `favoriteCompetitions` write fails, `useSavedValue` rolls the competitions back, but the `localLeagueSuggestion` write can still succeed. The user sees the shared alert, the card disappears permanently, and nothing is followed. The spec says a failed save keeps the card; this path only holds for a failed answer save. Rare (chrome.storage.local write failure) and recoverable by following manually in Favorites, so not a blocker.
**Suggested fix:** Record the answer only after the competitions save succeeds (for example, have the follow path wait on the favorites save result, or roll the answer back when `competitions.saveError` turns on during a follow). Requirement lost: none.
**Resolution:**

### F-09 [P3] open - An en-US browser in an unmapped time zone is offered MLS

**File:** src/lib/localLeague.ts:107
**Found:** 2026-10-06 by /audit independent (scope: current; lens: quality)
**Why it matters:** When the time zone is known but not in `TIME_ZONE_COUNTRY` (for example `Europe/Berlin`, `Europe/Paris`, `Asia/Tokyo`), `guessCountry` falls through to the language region. Many users run Chrome with `en-US`, so a German or Japanese user gets "Follow MLS?". This matches the spec's literal order (time zone, then language region), so it is a product-quality concern rather than a contract break, and the card is one-time and dismissible.
**Suggested fix:** Needs a spec decision: use the language region only when the time zone is missing, or only when it agrees with a mapped zone's country. Requirement lost: language-only guesses for users whose time zone is set but unmapped.
**Resolution:**
