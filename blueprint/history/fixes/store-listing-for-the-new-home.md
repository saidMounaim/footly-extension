# Fix: Store listing for the new Home

**Type:** Fix
**Status:** verified
**Branch:** fix/store-listing-for-the-new-home

## The problem

`STORE_LISTING.md` still describes the Home screen from before feature 23 and
the competition set from before feature 22. Submitting it as is would describe
features the extension no longer has.

- **Detailed description:** says opening the popup shows "live matches, your
  team's next match with a countdown, and the next games coming up". Home now
  shows competition cards, and opening one shows its upcoming matches and results
  with day chips.
- **"Follow what you care about" bullets:** list only the international
  competitions. They miss the ten country leagues added in feature 22 (for
  example Eredivisie, MLS, Brasileirão) and the one-time local league
  suggestion.
- **Screenshot guide:** shot 1 asks for "the live card and 'Your next match'"
  on Home, and neither exists any more.

## The fix

Update only `STORE_LISTING.md`, so it matches the shipped app.

- **Detailed description:**
  - **Opening paragraph:** Home lists your competitions with live counts or the
    next kickoff; tap one to see its upcoming matches and results by day.
  - **"Follow what you care about":** add the country leagues (named
    generically: "top leagues from the Netherlands, Portugal, Turkey, Scotland,
    Belgium, the USA, Mexico, Brazil, Argentina, and Saudi Arabia") and a bullet
    for the one-time suggestion of your own country's league, guessed on the
    device.
  - Keep every other bullet as it is.
- **Screenshot guide:**
  - shot 1 becomes "Home: competition cards, ideally during a live match so a
    card shows 'N live'";
  - add a shot of a competition screen with the Upcoming/Results switch and day
    chips.

  Keep 3–5 shots in total.
- **Must not change:**
  - the short description (it stays accurate and 132 characters or fewer);
  - the permission justifications, word for word from `src/lib/privacy.ts`;
  - the data-use answers;
  - the privacy policy URL and the submission checklist.
- **No promises of what doesn't ship:** no Botola Pro, no league tables.

## Build steps

- [x] **1. Update the listing text and screenshot guide.**
  **Done when:**
  - `STORE_LISTING.md` has no mention of "next match", "live card", or "Next up";
  - it names competition cards and the competition screen;
  - it lists the country leagues and the local league suggestion;
  - the short description is unchanged and 132 characters or fewer;
  - the permission justifications still match `src/lib/privacy.ts` word for word
    (checked by a command);
  - `npm run lint` and `npm run build` still pass.

## Verify

- Read `STORE_LISTING.md` against the running app: every feature it names exists,
  and every screenshot it asks for can be taken.
- Run the same word-match command used in feature 18 for the permission
  justifications.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2895,"specSha256":"53bfdb723290e18135b2bffaa0f2f0d6209dded71341a109eec35c3eafc66b03","branch":"refs/heads/fix/store-listing-for-the-new-home","head":"df6e33e2d5bf453e3e6579f64f91e0b2fec8a434","baseRef":"refs/heads/main","baseCommit":"df6e33e2d5bf453e3e6579f64f91e0b2fec8a434","sourceTree":"7c134213b0f67fb1698603756a2cc6ab520dd5bf","absentOptional":[]} -->
