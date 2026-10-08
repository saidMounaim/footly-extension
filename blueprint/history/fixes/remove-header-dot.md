# Fix: Remove Header Dot

**Type:** Fix
**Status:** verified
**Branch:** fix/remove-header-dot

## The problem

The popup header's wordmark has a small green dot in front of "Footly"
(`src/App.tsx`, the `<h1>` in the sticky header). The user wants only the word
"Footly".

## The fix

- Delete the decorative dot `<span aria-hidden="true" className="size-2
  rounded-full bg-accent" />` inside the header `<h1>`.
- Drop the `gap-1.5` from the `<h1>` and the `-ml-1.5` from the "ly" span. The
  negative margin only cancelled that gap, so without both "Foot" and "ly"
  still sit together as one word.
- **Must not break:**
  - The two-color "Foot" + green "ly" wordmark, its size and weight.
  - The heading's accessible name, "Footly". The dot was `aria-hidden`, so
    there's no change for screen readers.
  - The header layout with the Settings button on the right.
- **Not touched:** the toolbar and store icon (`scripts/generate-icons.mjs`,
  `public/icons/`), which keep the ball beside the "F".

## Build steps

- [x] 1. **Remove the dot.** Edit the header `<h1>` in `src/App.tsx` as above.
  **Done when:** the header shows "Footly" with no dot before it and no gap
  between "Foot" and "ly", and `npm run lint` and `npm run build` pass.

## Verify

- Run `npm test`, `npm run lint` and `npm run build`. This is a UI-only change,
  so it needs no new unit test.
- Build, reload the unpacked extension and open the popup. The header reads
  "Footly" in both themes, with no dot, "ly" still green, and the Settings
  button still on the right.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":1551,"specSha256":"e14d319e6dfa9f081ae90d0a508dde3eee955fe8021da2e0f52d5a58291e3511","branch":"refs/heads/fix/remove-header-dot","head":"9cd48c6a0d37c8d153c8d4a8e02c9546f169c73c","baseRef":"refs/heads/main","baseCommit":"9cd48c6a0d37c8d153c8d4a8e02c9546f169c73c","sourceTree":"d3dd0acba467fa867e86e28de8a9ee9da270f9cd","absentOptional":[]} -->
