# Fix: Ellipsis in countdown doc comment

**Type:** Fix
**Status:** verified
**Branch:** fix/ellipsis-in-countdown-doc-comment
**Fixes:** F-04

## The problem

The `detailCountdown` doc comment in `src/lib/countdown.ts:18` uses the
ellipsis character twice ("… 2h 14m 05s", "… 14m 05s"). The coding standards'
Writing section says to avoid it in generated content such as comments.

## The fix

Write the comment's examples out in full, with no ellipsis character:

```ts
/** Detail text: "Kicks off in 3d 04h 12m", "Kicks off in 2h 14m 05s", "Kicks off in 14m 05s", or "Starting". */
```

Must not break: the comment only, with no code change. The three `sr-only`
"Loading…" texts in `FavoritesPanel`, `MatchList`, and `MatchTimeline` are
user-facing copy from earlier features, not comments, and stay as they are.

## Build steps

- [x] **1. Rewrite the comment.** Replace the doc comment as above.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass, and
  `grep -n "…" src/lib/countdown.ts` finds nothing. Mark F-04 `fixed` in
  `blueprint/context/findings.md`.

## Verify

- `npm test`, `npm run build`, `npm run lint` (no Verify command exists).
- `grep -n "…" src/lib/countdown.ts` returns no lines.
- A review pass (`/audit`) can then close F-04.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":1283,"specSha256":"0f504f9044992bd026146e327d582e53a645a5194e7918152ef50ed76b38ab98","branch":"refs/heads/fix/ellipsis-in-countdown-doc-comment","head":"5eaea06766da25580bf1a21835326b3a8885875d","baseRef":"refs/heads/main","baseCommit":"5eaea06766da25580bf1a21835326b3a8885875d","sourceTree":"0ecfd7477c5ef3f54935b735d92f901340f545eb","absentOptional":[]} -->
