# Fix: Refresh the Store Listing

**Type:** Fix
**Status:** verified
**Branch:** fix/refresh-the-store-listing

## The problem

`STORE_LISTING.md` holds the Chrome Web Store text. It was written before
features 24–27, so the listing a reviewer and users will read is out of date:

- **Detailed description:** it lists only the six default leagues plus a few
  country leagues and three national-team competitions. It doesn't mention
  that every competition is on Home (25b), or the competitions added in 24
  (World Cup, Euro, Copa América, Nations League, Gold Cup, the World Cup
  qualifiers, Europa League, Conference League, Libertadores, Championship,
  FA Cup, Copa del Rey).
  - It says Favorites follows teams *and competitions*. Since 25a, Favorites is
    your teams' matches, and following a competition happens on its own screen.
  - It describes the match view as "lineups and basic team statistics". Since
    27, there are Summary, Stats and Lineups tabs, a split timeline, stat bars,
    lineups on a pitch, substitutes with their minute, and player photos.
- **Screenshot guide:**
  - Item 4 ("Favorites: Leagues and More competitions") describes a screen that
    no longer exists.
  - Item 3 doesn't name the match tabs.
- **Hard-coded version:** the file names `footly-1.0.0.zip` and "Footly 1.0.0" in
  three places. Any version bump before upload would make it wrong.

## The fix

Edit `STORE_LISTING.md` only. Every claim must match shipped behavior (the
project overview's feature list and the code).

- **Detailed description:**
  - Rewrite the "Follow what you care about" and "Live and clear" bullets for
    today's Home, Favorites, competitions and match center, as listed above.
  - Keep the "Notifications" and "Light, fast, and private" sections, which are
    still accurate.
  - Keep the short description, since it's still accurate and under 132
    characters.
- **Screenshot guide:** five shots that match the current app:
  1. Home with competition cards.
  2. A competition's Upcoming/Results with day chips.
  3. Match detail on Summary, with the split timeline.
  4. Match detail on Lineups, with the pitch.
  5. Favorites (your teams' matches) or Settings › Privacy & permissions.

  Keep the 1280×800 size and the "don't feature crests prominently" rule.
- **Version:** make the references version-neutral. Use
  `release/footly-<version>.zip` (the version comes from `package.json`) and a
  plain "Footly" heading. Don't change `package.json`. Whether to bump the
  version is the user's call at upload time.
- **Must not break:**
  - The permission justification table, which must stay word for word equal to
    `PERMISSION_EXPLANATIONS`.
  - The privacy practices answers, the privacy policy URL and the checklist
    steps.
  - Any claim about permissions, data or remote code.
- **Out of scope:** capturing the screenshots, which is the user's job, the
  README, `PRIVACY.md`, and app code.

## Build steps

- [x] 1. **Refresh the listing.** Update the description, screenshot guide and
  version references in `STORE_LISTING.md`.
  **Done when:**
  - The description and screenshot guide describe only features that exist
    today.
  - No `1.0.0` remains in the file.
  - The permission table still equals `src/lib/privacy.ts` word for word.
  - The short description is at most 132 characters.

## Verify

- Read the new listing against the app: every bullet maps to something visible
  in the popup.
- `grep -n "1.0.0" STORE_LISTING.md` returns nothing. Count the short
  description's characters.
- Run `npm test`, `npm run lint` and `npm run build` to confirm nothing else
  changed. This is a docs-only change.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3674,"specSha256":"1750b5e2000580b4495a10fa340882dfdda12abe643a081cbcd365d923078cb7","branch":"refs/heads/fix/refresh-the-store-listing","head":"02a5cdd44f19ba055cd1e8dfce017d7063d2280f","baseRef":"refs/heads/main","baseCommit":"02a5cdd44f19ba055cd1e8dfce017d7063d2280f","sourceTree":"a5d9aa2d5df7229d3b07f2ad19dc5a8b4e0b2c6a","absentOptional":[]} -->
