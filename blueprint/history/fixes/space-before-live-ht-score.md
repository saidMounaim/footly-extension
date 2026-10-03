# Fix: Space before live/HT score

**Type:** Fix
**Status:** verified
**Branch:** fix/space-before-live-ht-score
**Fixes:** F-01

## The problem

In the popup's match rows, the live and halftime status cells separate the label
from the score only visually, with the `ml-1` margin on the score span
([MatchRow.tsx](../../src/components/matches/MatchRow.tsx), `StatusCell`, the
`live` and `halftime` cases). The text content is `Live2–1` / `HT1–0`, so screen
readers and copy/paste get the words run together. The project requires status
to be conveyed as text, not only through presentation.

## The fix

In the `live` and `halftime` cases, render a real space (`{' '}`) between the
label and the score span, and remove `ml-1` from that span. The visible spacing
stays the same width (one space), and text content becomes `Live 2–1` /
`HT 1–0`. When there is no score, the output stays exactly `Live` / `HT` with no
trailing space.

Must not change: the other status cases (`finished` already renders a real
space), styling classes other than `ml-1`, or any logic. No new files,
dependencies, or tests (this is component markup; coding standards keep UI out of
unit tests).

## Build steps

- [x] **1. Real space in live/HT status.** Edit the two cases in `StatusCell` as
  described.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass, and the
  diff touches only those two cases in `src/components/matches/MatchRow.tsx`
  (plus this spec and the F-01 ledger status).

## Verify

- Automated: `npm test`, `npm run build`, `npm run lint`.
- Manual (only when a live or halftime match is on): reload the extension, open
  the popup, and inspect a live row. Its status element's text reads `Live 2–1`
  (or `HT 1–0`), and selecting and copying it keeps the space. Visually the gap
  looks the same as before.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":1837,"specSha256":"1fc2b551718f13eaa9cc45d3b3503001a9826f087c167a66011dbed4e00c561d","branch":"refs/heads/fix/space-before-live-ht-score","head":"b2115ef2ddc454e068baa3c06c91835d3c89b94d","baseRef":"refs/heads/main","baseCommit":"b2115ef2ddc454e068baa3c06c91835d3c89b94d","sourceTree":"68039a850d3a4c96c60ff34442e108ff853b63e2","absentOptional":[]} -->
