# Feature: Player Photos

**From build-plan:** feature 27b
**Build attempt:** 1
**Branch:** feature/player-photos
**Status:** verified

## Goal

Put faces on the lineup lists. Each player in the substitute rows and in the
stacked-list fallback shows their ESPN headshot in the circle that holds their
shirt number today. The pitch keeps its number circles. When a player has no photo, or the photo fails to
load, the circle shows the shirt number exactly as now.

## In scope

- **Photo data** (`src/api/espn.ts`, `src/api/types.ts`):
  - **New field:** `LineupPlayer` gains an optional `photo` (an https URL).
  - **Source:** `toLineupPlayer` reads it from the roster entry's
    `athlete.headshot.href`, through the existing `httpsUrl` guard. Non-https,
    malformed or missing values give no `photo`.
  - **Fallback (step 1 decides):** if a live ESPN summary shows that rosters
    carry no `headshot`, use the id-based headshot path instead (see Notes for
    the AI).
- **Player photo component** (`src/components/common/PlayerPhoto.tsx`, new):
  - **Loading:** it follows `Crest`'s staged fallback. It first loads the
    resized image through `sizedCrestUrl` at twice the display size, then the
    original URL once, then the shirt-number disc. Images use
    `loading="lazy"`, `decoding="async"` and `referrerPolicy="no-referrer"`,
    and are decorative (`alt=""`, `aria-hidden`). It is keyed by URL so a
    reused row never keeps an earlier image's stage.
  - **Number badge:** when the photo shows, the shirt number sits in a small
    badge on the circle's lower edge, so the number isn't lost.
  - **Fallback:** without a photo, it renders today's number disc unchanged.
- **Where photos show** (`MatchLineups.tsx`):
  - **Pitch (revised after review):** no photos. `PitchPlayer` keeps today's
    `size-7` number disc. ESPN has photos for only a few players per match (5 of
    40 observed), so a pitch mixing a few faces with many numbers looks uneven.
  - **Substitutes:** the `NumberDisc` in the used and unused substitute rows.
  - **Stacked-list fallback:** the starter rows (`PlayerRow`) get the same
    avatar in place of the bare number column.
- **Accessibility:** screen-reader text is unchanged ("Number 11, Gabriel
  Martinelli, …"). Photos add no announced content.
- **Loading cost:** photos load only when the Lineups tab is shown. Hidden tab
  panels use `hidden`, so the lazy images don't load. No new permission or
  host is needed, because images come from `a.espncdn.com` like the crests.

## Out of scope

- Photos anywhere outside the lineup lists (pitch, timeline, scorers, search).
- Player detail screens, ratings or any new player data beyond the photo URL.
- Caching or preloading photos beyond the browser's normal image cache.
- Changing the substitute matching from 27c.

## Build loop

`workflow.stepReview` is `feature`: build all steps, keep the project working
after each one, then present one review packet at the end. Checkpoint commits
are disabled. `/complete` creates the single feature commit, and nothing is
committed during `/implement`.

## Build steps

- [x] 1. **Photo source and adapter, with tests.** First inspect one live ESPN
  summary for a finished top-league match. Check whether `rosters[].roster[]
  .athlete.headshot.href` is present, and whether the id-based path
  `https://a.espncdn.com/i/headshots/soccer/players/full/<id>.png` serves photos
  for that match's players. Record what was observed in this spec's Notes.
  Then add `photo` to `LineupPlayer` and parse it in `toLineupPlayer` from the
  confirmed source.
  **Done when:** `espn.test.ts` covers an https headshot becoming `photo`, a
  non-https or malformed value being dropped, and a missing headshot leaving no
  `photo`. If the id-based path is adopted, a pure `playerPhotoUrl(id)` helper
  is tested instead, including encoding of the id. `npm test` passes.
- [x] 2. **PlayerPhoto component.** Add `PlayerPhoto` with the staged fallback
  and number badge.
  **Done when:** it renders the photo with a number badge for a working URL,
  falls back to the number disc for a missing or broken URL, and
  `npm run build` and `npm run lint` pass.
- [x] 3. **Photos in lineups.** Use `PlayerPhoto` on the pitch, in the
  substitute rows and in the fallback starter rows.
  **Done when:** opening Lineups for a big-league match shows faces where ESPN
  has them and numbers elsewhere, with nothing overlapping at 360px wide.
  Images don't load before the Lineups tab opens. `npm test`, `npm run lint`
  and `npm run build` pass.

- [x] 4. **Revision: no photos on the pitch.** Return `PitchPlayer` to the
  plain `size-7` number disc in pitch colors, which may reuse `PlayerPhoto`
  with no `src`, or the original markup. Keep photos in the substitute and
  fallback rows.
  **Done when:** the pitch shows only number circles at their original size.
  Substitute and fallback rows still show faces where ESPN has them.
  `npm test`, `npm run lint` and `npm run build` pass.

## Files / areas

- `src/api/types.ts`: `LineupPlayer.photo?: string`.
- `src/api/espn.ts` and `src/api/espn.test.ts`: `toLineupPlayer` parses the
  photo.
- `src/lib/crest.ts`: `sizedCrestUrl` and `safeImageUrl`, reused. Add
  `playerPhotoUrl` here only if step 1 adopts the id-based path.
- `src/components/common/PlayerPhoto.tsx`: new.
- `src/components/matches/MatchLineups.tsx`: the substitute rows
  (`PlayerAvatar`), `PlayerRow`, and `PitchPlayer` restored to the number disc.

## Data / contracts

- `LineupPlayer.photo?: string` is an absolute `https:` URL from the provider,
  or is absent. It isn't persisted, because match summaries are fetched per
  view and not stored. Rendering passes it through `safeImageUrl` again, as
  crests do.
- No other type, storage, manifest or permission changes.

## Testing

- Vitest unit tests for the adapter's photo parsing (or `playerPhotoUrl`),
  which is the logic gate for step 1.
- UI steps 2–3 are exempt from unit tests under the coding standards. They are
  verified by `npm run build`, `npm run lint`, and a manual popup check of
  Lineups in both themes, with and without photos, or `/check`.
- Baseline observed in this session, after 27c's completion: `npm test` 454
  passed, `npm run lint` clean, `npm run build` succeeded. No Verify command is
  declared.

## Notes for the AI

- **Photo source is unknown:** none of the saved fixtures shows an athlete
  `headshot`, but they are trimmed, so its absence proves nothing. Prefer the
  provider's `headshot.href`. Use the id-based path only if step 1 shows rosters
  lack `headshot` and the path serves real photos. Then build it with
  `encodeURIComponent(id)` and let the browser's 404 fall back to the number.
  Record which source was chosen, and why, here.
- **Step 1 observed (2026-10-08):** the live summary for event 740648
  (Brighton at Chelsea, 2025-09-27, `eng.1`) had 40 roster players, 5 with
  `athlete.headshot.href` (for example
  `https://a.espncdn.com/i/headshots/soccer/players/full/353951.png`). The
  id-based path returned 200 for the same 5 of 39 ids and 404 for the rest, so
  the field is used, which costs no 404 requests. ESPN's resizer
  (`/combiner/i?img=…`) serves the headshots. Expect photos for a minority of
  players. In the same response, all 9 substitution events' player names
  matched roster `displayName`s exactly, confirming 27c's matching.
- Don't add a request to check photo existence. The `<img>` error fallback is
  the check.
- Keep the badge and disc on the existing tokens (`pitch`, `pitch-line`,
  `surface`, `border`). Don't add colors.

## Open questions

None blocking. `project-plan.md`'s `LineupPlayer` has no photo field. The
overview records this, and the user can add `photo?` to the plan and re-run
`/overview`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7801,"specSha256":"ccdbe1638bc56f0130b8d94e19485a47f587aa3c3ae49b37082aa5b973f67ca4","branch":"refs/heads/feature/player-photos","head":"3375e0d9d90de51266566a14155b3fc6f9bd990a","baseRef":"refs/heads/main","baseCommit":"3375e0d9d90de51266566a14155b3fc6f9bd990a","sourceTree":"288a665f07a4116169701be813470e463b27baf5","absentOptional":[]} -->
