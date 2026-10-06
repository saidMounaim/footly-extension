# Feature: Local League Suggestion

**From build-plan:** feature 22
**Build attempt:** 1
**Branch:** feature/local-league-suggestion
**Status:** verified

## Goal

On first open, Footly guesses the user's country on the device, from the browser
time zone and then the language region. It offers a one-time card on Home to
follow that country's league when ESPN covers it. For countries ESPN doesn't
cover, such as Morocco, it suggests the relevant national-team competitions.

- Nothing is followed without the user's tap.
- No permission is added.
- Nothing about the user leaves the device.
- Request cost doesn't change until the user follows something.

## In scope

- **Local leagues in the catalog:**
  - Each candidate ID is checked against ESPN in step 1 (scoreboard league name,
    and standings group entries for `hasStandings`).
  - Confirmed IDs are added to `EXTRA_COMPETITIONS`, so anyone can follow them in
    Favorites and Search. Any that fail are dropped and reported.

  Candidates:

  | Country | Id | Name |
  |---|---|---|
  | Netherlands (NL) | `ned.1` | Eredivisie |
  | Portugal (PT) | `por.1` | Primeira Liga |
  | Turkey (TR) | `tur.1` | Süper Lig |
  | Scotland (GB-SCT) | `sco.1` | Scottish Premiership |
  | Belgium (BE) | `bel.1` | Belgian Pro League |
  | United States (US) | `usa.1` | MLS |
  | Mexico (MX) | `mex.1` | Liga MX |
  | Brazil (BR) | `bra.1` | Brasileirão |
  | Argentina (AR) | `arg.1` | Liga Profesional |
  | Saudi Arabia (SA) | `ksa.1` | Saudi Pro League |
  | Egypt (EG) | `egy.1` | Egyptian Premier League |

- **Country guess** (`src/lib/localLeague.ts`, pure, with the clock-free inputs
  passed in):
  1. A small time zone → country table for the countries above and the
     national-team fallback countries below.
  2. Otherwise, the region from the first browser language that has one, for
     example `fr-MA` → `MA`.
  3. Otherwise, no guess.

  Scotland can't be told apart from the rest of the UK by time zone or language,
  so `Europe/London` maps to no suggestion.
- **Suggestion rule:** `suggestionFor(country, followedIds)`:
  - the country's confirmed league when there is one;
  - for MA, DZ, TN, SN, NG, CI, GH, CM, and EG when `egy.1` is unconfirmed:
    `caf.nations` and `fifa.worldq.caf`, labelled as that country's national-team
    competitions;
  - competitions already followed are left out;
  - `null` when nothing is left to suggest.
- **One-time state:**
  - stored key `localLeagueSuggestion`: `{ "status": "accepted" | "dismissed" }`;
  - once set, the card never shows again;
  - when the suggestion is `null` (no guess, or already following everything),
    nothing is stored and nothing shows.
- **Home card** at the top of Home, above Live now:
  - title "Follow \<name\>?" for one league, or "Follow \<Country\>'s
    national-team matches?" for the fallback;
  - one line listing the competitions;
  - **Follow** and **No thanks** buttons.

  Behavior:
  - Follow adds each suggested competition through the existing
    `useFavoriteCompetitions`. Already-followed ones are skipped, never toggled
    off. The new competitions then load through feature 20's background reload.
  - Either button saves the status and removes the card. Focus moves to the Home
    panel's first heading, so it isn't lost.
  - The card shows only after both the favorites and the suggestion state have
    loaded. If either fails to load, the card doesn't show.
  - A failed save uses the shared "Couldn't save your changes. Try again." alert,
    and the card stays.
- **Privacy wording:** add "Your country is guessed on this device from your
  time zone and language, only to suggest a league; it is never sent anywhere."
  to `PRIVACY.md` and to the Settings Privacy & permissions summary. The wording
  is identical in both. `localLeagueSuggestion` is added to `PRIVACY.md`'s
  storage table.

## Out of scope

- Botola Pro or any second data provider.
- Geolocation or IP lookup.
- Re-showing the suggestion, or a Settings control to reset it (Erase Footly
  data already resets everything).
- Following teams automatically.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet for the whole feature. `workflow.checkpointCommits` is `disabled`.
`/complete` creates the feature commit.

## Build steps

- [x] **1. Confirm and add the local leagues.**
  - Check each candidate against ESPN with read-only `curl`, recording the
    league name and standings group count in the packet.
  - Add the confirmed ones to `EXTRA_COMPETITIONS` with the right
    `hasStandings`.

  **Done when:** `npm test` passes, the catalog test lists the new IDs, and the
  favorites parse test accepts one of them.

- [x] **2. Country guess, suggestion rule, stored state.**
  - Add `src/lib/localLeague.ts` with:
    - `guessCountry({ timeZone, languages })`;
    - `suggestionFor(country, followedIds)` returning
      `{ country, competitionIds, label } | null`;
    - `parseLocalLeagueSuggestion`, plus load and save.
  - Add `src/lib/localLeague.test.ts`.

  **Done when:** `npm test` passes, with cases for:
  - `Europe/Amsterdam` → NL → `ned.1` (if confirmed);
  - `Africa/Casablanca` → MA → `caf.nations` and `fifa.worldq.caf`;
  - an unknown time zone with `fr-MA` → MA;
  - `Europe/London` → no suggestion;
  - no time zone and no regional language → null;
  - leaving out already-followed IDs, and null when all are followed;
  - parsing valid, invalid, and missing stored values;
  - a save round trip.

- [x] **3. Home card and privacy wording.**
  - Add `src/hooks/useLocalLeagueSuggestion.ts` (`useSavedValue`-based). It reads
    `Intl.DateTimeFormat().resolvedOptions().timeZone` and `navigator.languages`
    once.
  - Add a `LocalLeagueCard` to `HomePanel` and wire the follow and dismiss
    actions in `App`.
  - Update `PRIVACY.md` and `PrivacySection.tsx` with the identical sentence, and
    add the storage key to `PRIVACY.md`.

  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass. In Chrome,
  with the system time zone set to Morocco:
  - Home shows the national-team card;
  - Follow adds both competitions to Favorites and loads their matches;
  - reopening shows no card;
  - after Erase Footly data, the card returns.

  Record what was observed.

## Files / areas

- New:
  - logic: `src/lib/localLeague.ts`, `src/lib/localLeague.test.ts`
  - hook: `src/hooks/useLocalLeagueSuggestion.ts`
- Changed:
  - API: `src/api/football.ts`, `src/api/football.test.ts`
  - Tests: `src/lib/favorites.test.ts`
  - UI: `src/components/home/HomePanel.tsx`, `src/App.tsx`,
    `src/components/settings/PrivacySection.tsx`
  - Docs: `PRIVACY.md`

## Data / contracts

- New `chrome.storage.local` key `localLeagueSuggestion`:
  `{ "status": "accepted" | "dismissed" }`. Anything else reads as not answered.
  It holds no country and no time zone.
- The country guess is computed in memory on each popup open and never stored or
  sent anywhere.
- Followed competitions use the existing `favoriteCompetitions` key and
  validation.
- No new permission. The manifest test still asserts the same three.

## Testing

- Vitest covers country guessing, the suggestion rule, and stored-state parsing
  and saving, plus catalog and favorites acceptance of the new IDs. The hook and
  UI are not unit-tested, per coding standards.
- Step 1 is a read-only network check recorded in the packet. No browser test
  command exists. Step 3's Chrome behavior is checked manually; record what was
  actually observed.

## Notes for the AI

- Read `Intl` and `navigator.languages` only in the hook, and pass the values
  into the pure functions so tests stay deterministic.
- Country names in the card come from a small static map in `localLeague.ts`.
  Do not use `Intl.DisplayNames` output as user-controlled text; all strings are
  static.
- Keep the card's IDs prefixed with `home-local-`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7936,"specSha256":"e1c45fd7e73b51dccbfc14256e2615c1682ec0c0803f68210ff1a35f1019f935","branch":"refs/heads/feature/local-league-suggestion","head":"e1a79144fc971ca374d022ea7237baf1b8b08b80","baseRef":"refs/heads/main","baseCommit":"1e08afcfc6a1e041795cc12cebb6d606de91abdc","sourceTree":"b2b103bb0f7165b6a4f280d336c83c35b0fded60","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** e1a79144fc971ca374d022ea7237baf1b8b08b80
**Base commit:** 1e08afcfc6a1e041795cc12cebb6d606de91abdc
**Base ref:** main
**Spec hash:** e1c45fd7e73b51dccbfc14256e2615c1682ec0c0803f68210ff1a35f1019f935
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-06T20:43:44Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-06T20:44:52Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `shasum -a 256 blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`: pass (target, base, and spec hash match; only review.md differs)
- `npm test`: pass (17 files, 405 tests)
- `npm run lint`: pass
- `npx tsc -b`: pass
- `npm run build`: pass

## Evidence

- Reviewed the full 1e08afc..e1a7914 delta (18 files) against the tracked, verified spec, plus `useSavedValue`, `useFavoriteCompetitions`, `readStoredKey`/`writeStoredKey`, `erase.ts`, and Home heading markup.
- Privacy: the guess is computed in `useMemo` from `Intl` and `navigator.languages` and lives only in memory; `saveLocalLeagueAnswer` writes only `{ status }`; no new fetch, permission, or manifest change; the background script does not import the module.
- Card text comes only from static maps (`COUNTRY_NAME`, catalog names); stored value is validated by `parseLocalLeagueSuggestion`; Erase clears all of `chrome.storage.local`, so the card returns.
- Follow skips already-followed IDs; sequential toggles compose through `latest.current`, so both MA competitions are kept. Card waits for `competitions.ready` and the answer load; load failure hides it.
- `PRIVACY.md` and `COUNTRY_GUESS_NOTE` sentences are identical; storage table lists the key with no country.
- Request cost: new leagues are in `EXTRA_COMPETITIONS`, loaded only while followed.

## Findings

- F-08 [P2] open: a failed competitions save during Follow still records `accepted` (src/App.tsx:129)
- F-09 [P3] open: an `en-US` browser in an unmapped time zone is offered MLS (src/lib/localLeague.ts:107)

## Remaining risk

- Hook, card, and focus behavior are not unit-tested (per coding standards); no browser run in this review, and no browser test command exists.
- ESPN coverage of the new league IDs was not re-confirmed (no network access in review).
- No Verify command or GitHub workflow exists.
