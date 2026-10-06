# Fix: Language region guess in unmapped time zones

**Type:** Fix
**Status:** verified
**Branch:** fix/language-region-guess-in-unmapped-time-zones
**Fixes:** F-09

## The problem

`guessCountry` in `src/lib/localLeague.ts` checks the time zone table first,
then falls through to the region of the first browser language whenever the
zone isn't in `TIME_ZONE_COUNTRY`.

Many people run Chrome in `en-US` wherever they live. So a user in
`Europe/Berlin`, `Europe/Paris`, or `Asia/Tokyo` with `en-US` gets
"Follow MLS?". The browser *does* know where they are; we just don't have
a league for it, and the language region overrides that.

## The fix

Use the language region only when the time zone says nothing about location.

- A **geographic** time zone (`Area/City`, for example `Europe/Berlin`) is
  trusted: mapped → that country; unmapped → no guess.
- The time zone gives **no location** when it is missing or non-geographic:
  `UTC`, `GMT`, or anything under `Etc/`. Only then use the first language
  region, as today.
- `Europe/London` is now covered by the unmapped-zone rule, so its special case
  goes away. Keep the comment explaining why it isn't in the table.
- Update the `guessCountry` doc comment to describe the new order.

**Must not break:** mapped zones (NL, PT, US, MA, ...), the London → no
suggestion rule, and the no-zone language fallback (`ar-ma` → MA).

**Requirement lost (accepted by choosing this fix):** a user whose zone is set
but unmapped no longer gets a language-only guess. For example, a Moroccan in
Paris with `fr-MA` is no longer offered Morocco's national-team matches.

## Build steps

- [x] 1. **Trust geographic zones.** Change `guessCountry` and its tests in
   `src/lib/localLeague.test.ts`:
   - `Europe/Berlin` + `en-US` → null;
   - `Europe/Paris` + `fr-MA` → null (replaces the old fallback case);
   - `undefined`, `UTC`, and `Etc/GMT+1` with `fr-MA` → MA;
   - existing mapped-zone, London, and no-guess cases still pass.

   **Done when:** `npm test`, `npm run lint`, and `npm run build` pass.

## Verify

- `npm test` covers the cases above.
- Optional manual check: in Chrome DevTools → Sensors, set the location's time
  zone to `Europe/Berlin` with language `en-US`, clear the extension's
  `localLeagueSuggestion` and followed competitions, open the popup → no local
  league card. Set it to `America/New_York` → "Follow MLS?" appears.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2417,"specSha256":"203b615f9e3e1ba912e9dbbe1e24fdba0ba121b8e9d0bd7e4451340488a693a7","branch":"refs/heads/fix/language-region-guess-in-unmapped-time-zones","head":"1edab0e5ceac4e5239e4e755fd17811fb215a1d1","baseRef":"refs/heads/main","baseCommit":"1edab0e5ceac4e5239e4e755fd17811fb215a1d1","sourceTree":"e2a4a6318d4aa7eda176274038ca72a49a6a7eea","absentOptional":[]} -->

## Findings

### language-region-guess-in-unmapped-time-zones/F-09 [P3] closed - An en-US browser in an unmapped time zone is offered MLS

**File:** src/lib/localLeague.ts:107
**Found:** 2026-10-06 by /audit independent (scope: current; lens: quality)
**Why it matters:** When the time zone is known but not in `TIME_ZONE_COUNTRY` (for example `Europe/Berlin`, `Europe/Paris`, `Asia/Tokyo`), `guessCountry` falls through to the language region. Many users run Chrome with `en-US`, so a German or Japanese user gets "Follow MLS?". This matches the spec's literal order (time zone, then language region), so it is a product-quality concern rather than a contract break, and the card is one-time and dismissible.
**Suggested fix:** Needs a spec decision: use the language region only when the time zone is missing, or only when it agrees with a mapped zone's country. Requirement lost: language-only guesses for users whose time zone is set but unmapped.
**Resolution:** Fixed on fix/language-region-guess-in-unmapped-time-zones: the language region is used only when the time zone is missing or non-geographic (UTC, GMT, Etc/*); an unmapped geographic zone gives no guess. Closed 2026-10-06 by /audit (scope: current; all lenses): re-reviewed src/lib/localLeague.ts:91-114 and its tests; `Europe/Berlin` + `en-US` now gives null, the no-zone/UTC/Etc fallback still works, and the repair introduced no new defect.
