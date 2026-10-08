# Fix: Privacy Text for Player Photos

**Type:** Fix
**Status:** verified
**Branch:** fix/privacy-text-for-player-photos

## The problem

Since feature 27b, Footly loads player headshots from `a.espncdn.com`. The
privacy disclosures still say that host serves only "Club crests and league
logos from ESPN's image server." The stale text is in two places that are meant
to match word for word:

- `src/lib/privacy.ts`, `CONTACTED_HOSTS` (line 30). This is shown in Settings ›
  Privacy & permissions.
- `PRIVACY.md`, the "Servers Footly contacts" table (line 51).

No test ties the two together, which is how they could go stale without anyone
noticing.

## The fix

- Change the `a.espncdn.com` purpose in both places to:
  "Club crests, league logos, and player photos from ESPN's image server."
- Add one node-side test in `manifest.config.test.ts`, next to the existing
  permission check. For every entry in `CONTACTED_HOSTS`, `PRIVACY.md` must
  contain the row ``| `<host>` | <purpose> |``. Now that the two have to match,
  the test fails on future drift instead of relying on memory. It reads the file
  with `node:fs`, as the test already runs in Node.
- **Must not break:**
  - The other host row, the permission explanations, and the rest of
    `PRIVACY.md`, including the "no referrer" sentence, which player photos
    respect through `referrerPolicy="no-referrer"`.
  - The Settings privacy list rendering.
- **Out of scope:** `STORE_LISTING.md`, the README, and any change to what Footly
  actually requests.

## Build steps

- [x] 1. **Correct the text and guard it.** Update both strings and add the
  drift test.
  **Done when:**
  - Settings › Privacy & permissions and `PRIVACY.md` both list player photos
    for `a.espncdn.com`.
  - The new test passes, and fails if either copy is edited alone.
  - `npm test`, `npm run lint` and `npm run build` pass.

## Verify

- Run `npm test` and confirm the new check is in the passing suite. Then run
  `npm run lint` and `npm run build`.
- Build, reload the extension, and open Settings › Privacy & permissions. The
  `a.espncdn.com` line mentions player photos. `PRIVACY.md`'s server table says
  the same.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2179,"specSha256":"d03a4a52506926dbc0c227e920331996b1a28b78fe15af2f62fc1623d12b4d07","branch":"refs/heads/fix/privacy-text-for-player-photos","head":"19fc63974cef9e3bdc4926beeda3ff6e1e0e81ac","baseRef":"refs/heads/main","baseCommit":"19fc63974cef9e3bdc4926beeda3ff6e1e0e81ac","sourceTree":"b342d22dc185ed24f3eeacb5b2ec81f20bec3233","absentOptional":[]} -->
