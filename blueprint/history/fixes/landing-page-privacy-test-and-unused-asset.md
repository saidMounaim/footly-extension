# Fix: Landing Page Privacy Test and Unused Asset

**Type:** Fix
**Status:** verified
**Branch:** fix/landing-page-privacy-test-and-unused-asset
**Fixes:** F-12, F-13

## The problem

- **F-12:** `site/site.test.ts` is supposed to catch the hand-copied privacy page
  (`site/privacy/index.html`) drifting from `PRIVACY.md`. It only checks the
  headings, permission reasons, contacted hosts, and country note.
  - The stored-data table isn't checked.
  - If a storage key is added to `PRIVACY.md` and not to the page, the published
    privacy policy goes stale and `npm test` still passes.
- **F-13:** `site/assets/match.png` (106 KB) is shipped but neither site page
  references it.

## The fix

- **F-12:** in the existing "publishes every section of PRIVACY.md" test, also take
  every stored-data key from `PRIVACY.md` and assert the privacy page contains
  `<code>key</code>`.
  - A key is the backticked first cell of a table row, such as `` | `favoriteTeams` | ``.
  - Host rows match the same pattern. That's fine, because the page also renders
    hosts as `<code>`.
  - Assert at least one key was found, so a format change can't make the check
    pass vacuously.
- **F-13:** delete `site/assets/match.png`.
- **Must not break:** the existing site tests, lint, build, or either page. No other
  asset changes and no page markup changes.

## Build steps

- [x] **1. Stored-key drift check and unused asset removal**
  - Extend the test as described above and delete `site/assets/match.png`.
  - *Done when:*
    - `npm test` passes.
    - Temporarily renaming one `<code>` key in `site/privacy/index.html` makes the
      new assertion fail.
    - No file under `site/` references `match.png`.
    - `npm run lint` and `npm run build` pass.

## Verify

- Run `npm test`, `npm run lint`, and `npm run build`.
- Run `grep -rn match.png site` and expect no output.
- Preview with `python3 -m http.server 4173 -d site` and confirm both pages still show
  every image.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":1976,"specSha256":"79a64ad7ccc4f63e13e801b17474575f435619d54c48b03a2549055f1c57f2e9","branch":"refs/heads/fix/landing-page-privacy-test-and-unused-asset","head":"e5ed46813cd52c867d09f4bffa7f2ab51aa38402","baseRef":"refs/heads/main","baseCommit":"e5ed46813cd52c867d09f4bffa7f2ab51aa38402","sourceTree":"504d7f5533860c4e204bbb8947de7fc5e49db71d","absentOptional":[]} -->

## Findings

### landing-page-privacy-test-and-unused-asset/F-12 [P3] closed - The privacy drift test misses the stored-data table and body text

**File:** site/site.test.ts:19
**Found:** 2026-10-08 by /audit (scope: feature 29 commit e5ed468; lens: all)
**Why it matters:** `site/privacy/index.html` is a hand copy of `PRIVACY.md` and will be the Web Store privacy policy URL. The test checks headings, permission reasons, contacted hosts, and the country note, but not the stored-data keys table or the paragraphs. If a later feature adds a storage key to `PRIVACY.md`, the published policy silently goes stale while `npm test` still passes.
**Suggested fix:** In the existing test, extract each `` | `key` | `` row from `PRIVACY.md` and assert the page contains `<code>key</code>`. Requirement lost: none.
**Resolution:** Fixed on fix/landing-page-privacy-test-and-unused-asset: the test now requires every backticked first table cell in `PRIVACY.md` (12 cells) as `<code>` on the privacy page; renaming one key on the page makes it fail. Closed 2026-10-08 by /audit (scope: current; all lenses): re-review confirmed the test extracts all 12 backticked cells, guards against an empty match, passes, and lint plus `tsc -b` are clean; no new defect.

### landing-page-privacy-test-and-unused-asset/F-13 [P3] closed - match.png is shipped but never used

**File:** site/assets/match.png
**Found:** 2026-10-08 by /audit (scope: feature 29 commit e5ed468; lens: quality, performance)
**Why it matters:** Neither page references `/assets/match.png` (only `home.png` and `lineups.png`), so it is 106 KB of dead weight in the repo and the deployment.
**Suggested fix:** Delete `site/assets/match.png`. Requirement lost: none (the spec allowed `lineups.png` or `match.png` for the match tile).
**Resolution:** Fixed on fix/landing-page-privacy-test-and-unused-asset: file deleted; `grep -rn match.png site` finds nothing. Closed 2026-10-08 by /audit (scope: current; all lenses): no reference to `assets/match.png` remains in site/, src/, README.md, or STORE_LISTING.md (the README's `docs/screenshots/match.png` is a separate file and unaffected).
