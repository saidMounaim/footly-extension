# Fix: Phrasing content in match row button

**Type:** Fix
**Status:** verified
**Branch:** fix/phrasing-content-in-match-row-button
**Fixes:** F-03

## The problem

Each match row in the popup list is a `<button>` that wraps `<div>` and `<p>`
elements ([MatchRow.tsx:65-72](../../src/components/matches/MatchRow.tsx)).
HTML only allows phrasing content inside a button, so the markup is invalid.
Browsers still render it, and the `aria-label` keeps the accessible name
correct, but HTML validators and accessibility checkers flag every row.

## The fix

In `MatchRow`, replace the two wrapper `div`s and the three `p`s inside the
button with `span`s:

- The left column wrapper becomes `<span className="block min-w-0 flex-1">`.
- Its three lines (competition, home team, away team) become
  `<span className="block truncate …">`, keeping their current text classes.
- The right status wrapper becomes `<span className="block shrink-0 text-right text-sm">`.

`StatusText` already renders only `span`/`time`, so it needs no change.

Must not change: the button's classes, `aria-label`, `onClick`, the visual
layout, or anything outside `MatchRow`. No new files or tests (component markup;
coding standards keep UI out of unit tests).

## Build steps

- [x] **1. Use spans inside the row button.** Make the replacements above in
  `src/components/matches/MatchRow.tsx`.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. A search
  shows no `<div` or `<p` left inside the `MatchRow` button. The diff touches
  only that block, plus this spec and the F-03 ledger status.

## Verify

- Automated: `npm test`, `npm run build`, `npm run lint`; `grep` the `MatchRow`
  component for `<div`/`<p`.
- Manual: reload the extension and open the popup. Rows look exactly as before
  (competition line, two team lines truncating, status on the right), and
  clicking a row still opens the match.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":1905,"specSha256":"8f1898c84602e563dfc1a8715cb72a413ae682b3d34169754e87a5a3a1188bd5","branch":"refs/heads/fix/phrasing-content-in-match-row-button","head":"b793a6b39eaf2802a654aace5bfe7a629c16351c","baseRef":"refs/heads/main","baseCommit":"b793a6b39eaf2802a654aace5bfe7a629c16351c","sourceTree":"6f62adcd2c283cdfabb754d5b672643b21bf3eea","absentOptional":[]} -->
