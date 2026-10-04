# Feature: Live Match Status

**From build-plan:** feature 6
**Build attempt:** 1
**Branch:** feature/live-match-status
**Status:** verified

## Goal

Make every match's status readable at a glance with compact indicators that
follow the overview's UI contract: "upcoming neutral, live prominent, halftime
label, finished final score, postponed warning, cancelled clear", using text or
icons, never color alone.

All six statuses are already mapped from ESPN (`toStatus` in `src/api/espn.ts`)
and rendered as text by `StatusText`, with accessible names from `statusLabel`.
This feature closes the visual gaps and keeps the data and accessible names
unchanged:
- **Live** gets a pill with a pulsing dot, not only accent text.
- **Postponed** gets a warning icon and a warning color. Today it looks like
  ordinary text.
- **Cancelled** drops the strikethrough, which made the word harder to read, and
  gets a clear "not happening" icon.
- **Halftime** and **finished** get the same compact pill shape so the right
  column lines up.

## In scope

- **Warning token:** add `--warning` to `src/index.css` for light and dark, and
  expose it as `--color-warning` in `@theme inline`. Light `#b45309`, dark
  `#fbbf24`. Both must keep at least 4.5:1 contrast for text against
  `--background` and `--surface`; step 1 confirms this with the contrast formula
  before use.
- **Status indicator** (`StatusText` in `src/components/matches/MatchRow.tsx`,
  used by list rows and the match detail score block). Each status keeps its
  visible word and gains:

  | Status | Visible text | Icon (`aria-hidden`) | Style |
  |---|---|---|---|
  | upcoming | kickoff time in `<time dateTime>` (unchanged) | none | neutral foreground, no pill |
  | live | "Live" + score | dot, pulsing only under `motion-safe` | accent text in an accent-bordered pill |
  | halftime | "HT" + score | none | foreground text in a surface pill |
  | finished | "FT" + score | none | muted "FT", foreground score, surface pill |
  | postponed | "Postponed" | ⚠ | warning text in a warning-bordered pill |
  | cancelled | "Cancelled" | ⊘ | muted text in a surface pill, no strikethrough |

  - The score stays `tabular-nums` and keeps a real space before it, so text is
    "Live 2–1" and "HT 1–0", never run together.
  - Pills are compact enough that a row still fits the 360 px popup with long
    team names truncated, as today.
- **Accessible names stay the same:** `statusLabel` and the row button's
  `aria-label` don't change ("Live 2–1", "HT 1–0", "FT 2–1", "Postponed",
  "Cancelled", or the kickoff time). Icons and the dot are decorative
  (`aria-hidden`), so meaning never depends on them or on color.
- **Detail view:** the score block uses the same indicator for non-upcoming
  matches. Upcoming matches keep the day label there.

## Out of scope

- A live match minute (for example "67'"). It would add a field to the locked
  `Match` model and depends on refresh behavior; it belongs with feature 7
  (countdown) or feature 11 (refresh).
- Countdowns and automatic switching to live (feature 7), refresh or polling
  changes (feature 11), notifications (feature 8).
- New statuses or changes to ESPN status mapping, `MatchStatus`, or the data
  model.
- The user theme toggle and polished theme pass (feature 14).
- The open F-02 finding from feature 4; it stays in the ledger for a separate
  `/fix`.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`. `/complete` creates the single
feature commit. A test command exists; this feature adds no new pure logic, so
the existing suite must keep passing.

## Build steps

- [x] **1. Warning token.** Add `--warning` (light `#b45309`, dark `#fbbf24`) and
  `--color-warning` to `src/index.css`. Confirm the contrast ratios against
  `--background` and `--surface` in both themes with the WCAG relative-luminance
  formula, and record the four ratios in the review packet. If any is below
  4.5:1, pick the nearest shade that passes and update this spec's value.
  **Done when:** `npm run build` passes, and the four ratios are each at least
  4.5:1.

- [x] **2. Status indicators.** Update `StatusText` to the table above. Keep
  `statusLabel` and the row `aria-label` unchanged. Use `motion-safe:` for the
  live dot's pulse so reduced-motion users see a static dot.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass, and in
  Chrome, with the popup loaded from `dist/`:
  - Upcoming rows show only the kickoff time.
  - A live or halftime match (when one is available) shows its pill, and the
    row's accessible name is unchanged.
  - Finished rows in Results show "FT" and the score in a pill.
  - Light and dark system themes both render the pills legibly.
  - The console shows no errors.
  Postponed and cancelled matches may not occur in the current week; code
  inspection of `StatusText` covers them when no live example exists.

## Files / areas

- `src/index.css` - `--warning` token
- `src/components/matches/MatchRow.tsx` - `StatusText`
- `src/components/matches/MatchDetail.tsx` - unchanged call site, check only
- `src/components/matches/status.ts` - `statusLabel` unchanged, check only

## Data / contracts

No data, storage, network, or permission changes. `MatchStatus`, `Match`, and
the ESPN status mapping are unchanged. Accessible names come from the existing
`statusLabel` and do not change.

## Testing

- No new pure logic, so no new unit tests. The existing suite, including the
  ESPN status mapping and score tests, must keep passing unchanged.
- `StatusText` is UI and stays out of unit tests (coding standards). Build,
  lint, contrast arithmetic, and the manual Chrome checks cover it.
- Final gate: `npm test`, `npm run build`, `npm run lint` (no Verify command exists).
- Live Chrome evidence is manual or `/check`; do not claim it unless performed.

## Notes for the AI

- Use the design tokens only (`accent`, `foreground`, `muted`, `surface`,
  `border`, and the new `warning`); no raw color classes.
- Icons are plain Unicode characters with `aria-hidden="true"`, like the
  existing ★. No icon library or image requests.
- Keep the live pulse behind `motion-safe:` so it respects reduced-motion
  settings.
- Don't change `statusLabel`, the row `aria-label`, or the score formatting.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6381,"specSha256":"6d7733ee28db75c18f5ffe6ab239655c1fe3593b6fbe4634fa7b181cbddb1e3d","branch":"refs/heads/feature/live-match-status","head":"14ab344f38c73c2af81be1d0fcc5402bfe054a59","baseRef":"refs/heads/main","baseCommit":"14ab344f38c73c2af81be1d0fcc5402bfe054a59","sourceTree":"08241100f9f7f4fe49d584e47c88fdbd86e67437","absentOptional":[]} -->
