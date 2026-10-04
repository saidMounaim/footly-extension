# Feature: Match Details & Live Events

**From build-plan:** feature 2
**Build attempt:** 1
**Branch:** feature/match-details-live-events
**Status:** verified

## Goal

Clicking a match in the popup list opens a match detail view with both teams,
the current score and status, and a chronological timeline of goals, penalties,
cards, and substitutions. The data comes from one ESPN per-match summary request
made when the view opens. A Back button returns to the list exactly as it was.
Feature 10 (Match Center) will later add lineups and statistics to this same view.

## In scope

- **Navigation:** each match row becomes one button. Activating it (click,
  Enter, or Space) opens the detail view. The list stays mounted but `hidden`
  while the detail view shows, so Back restores the list, its scroll position,
  and its data without refetching, and moves focus back to the row that opened it.
- **Detail view layout:**
  - Top bar: a Back button (`aria-label="Back to matches"`) and the competition
    name.
  - Score block: home team, then the score (or the local kickoff time when
    there's no score), then the away team. The status text below it reuses the
    list's status wording (Live / HT / FT / Postponed / Cancelled / kickoff time).
  - Timeline: an ordered list, oldest first. Each event shows its minute, a
    type icon with a text label (visually hidden label, `aria-hidden` icon),
    the player (for substitutions: player on and player off), and which team
    as text (the team's short name).
  - On open, focus moves to the detail view's `h2` (the "Home vs Away" heading).
- **Data:** one request to the ESPN summary endpoint for that match on every
  open (no caching). The summary's score and status replace the list's values in
  the detail view only.
- **Event types:** goal, own goal, penalty goal, missed penalty, yellow card,
  red card (including a second yellow), and substitution. Unknown or malformed
  events are skipped, never fatal.
- **States:**
  - Loading: score block from the list's data straight away, with a skeleton
    in place of the timeline (`aria-busy="true"`).
  - Empty (no events): "No match events yet."
  - Error (request failed or response unusable): "Couldn't load match details."
    with a Retry button (`role="alert"`). The score block keeps the list's data.
  - Retry re-requests the summary.
- **Competition ID becomes the ESPN slug.** `Competition.id` changes from
  ESPN's numeric league id (for example `700`) to the slug used to request it
  (for example `eng.1`). The summary URL needs the slug, and feature 5 will
  store favorite competition IDs that must map back to requests. Nothing is
  persisted yet, so this is a safe internal change; 1b tests are updated to match.

## Out of scope

- Lineups, statistics, team pages (feature 10), recent results list (feature 3).
- Auto-refresh or polling of a live match (feature 11). Reopening the match
  refetches it.
- Notifications (feature 8), favorites (features 4, 5), bottom navigation.
- Caching summaries, logos, commentary text, VAR or injury events.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`. `/complete` creates the single
feature commit. A test command exists, so every logic step ships passing tests.

## Build steps

- [x] **1. Event model and summary normalizer.** First `curl` one real summary
  for a recent finished match with goals, cards, and substitutions (and a live
  one if available), using
  `https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/summary?event={id}`.
  Confirm where the score/status and the event list live, how event types,
  minutes, teams, and players (including on/off for substitutions) are
  represented, and that CORS allows extension origins. If the shape differs
  materially from Data / contracts, stop and revise this spec. Save a trimmed
  real response as `src/api/fixtures/espn-summary.json`. Then:
  - Add `MatchEvent` and `MatchEventType` to `src/api/types.ts`.
  - Change `normalizeScoreboard(json, competitionId)` so `Competition.id` is the
    slug passed in, and update `football.ts` and the 1b tests.
  - Add `normalizeSummary(json: unknown, match: Match): Match` to `src/api/espn.ts`.
  **Done when:** `npm test` passes, covering: the fixture; each event type
  mapping; second yellow becomes `red-card`; substitution player on and off;
  stoppage-time minutes and chronological order (with ties keeping provider
  order); events with an unknown type or missing minute skipped; missing event
  list giving `events: []`; score and status taken from the summary using the
  1b mapping; a non-object response throwing `EspnResponseError`.

- [x] **2. Match details service.** Add `getMatchDetails(match, { fetchImpl })`
  to `src/api/football.ts`: one HTTPS request to the summary URL built from
  `match.competition.id` and `match.id` with `AbortSignal.timeout(10_000)`.
  Network errors, timeouts, non-2xx, invalid JSON, and `EspnResponseError`
  throw `MatchDetailsError`; any other error propagates unchanged.
  **Done when:** `npm test` passes tests with a stubbed fetch for: the exact
  URL, a successful normalized result, each expected failure becoming
  `MatchDetailsError`, and an unexpected error not being wrapped.

- [x] **3. Detail view.** Make `MatchRow` a button that calls `onSelect(match)`
  (exporting the status text so the detail view reuses it). Add
  `src/hooks/useMatchDetails.ts` (loading / success / error with `retry`,
  ignoring responses for a match that is no longer open) and
  `src/components/matches/MatchDetail.tsx` and `MatchTimeline.tsx`. `App.tsx`
  holds the selected match and keeps the list mounted but hidden while the
  detail view shows.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass. In
  Chrome, with the popup loaded from `dist/`:
  - Clicking a match, or pressing Enter on it, opens the detail view with focus
    on its heading.
  - A finished or live match shows its timeline in order with icons, minutes,
    players, and teams. An upcoming match shows "No match events yet."
  - Back returns to the same scroll position with focus on that row, and no new
    list requests appear in the Network panel.
  - Offline, opening a match shows the error and Retry, and Retry works once
    you're back online.
  - The console shows no errors.

## Files / areas

- `src/api/types.ts` - add `MatchEvent`, `MatchEventType` (replacing the placeholder)
- `src/api/espn.ts` - slug parameter, `normalizeSummary`, `summaryUrl`
- `src/api/football.ts` - pass slugs, `getMatchDetails`, `MatchDetailsError`
- `src/api/fixtures/espn-summary.json` (new) - trimmed real summary
- `src/api/espn.test.ts`, `src/api/football.test.ts` - slug update and new cases
- `src/hooks/useMatchDetails.ts` (new)
- `src/components/matches/MatchRow.tsx` - row button, exported status text
- `src/components/matches/MatchList.tsx` - pass `onSelect`
- `src/components/matches/MatchDetail.tsx`, `MatchTimeline.tsx` (new)
- `src/App.tsx` - selected match, list hidden not unmounted, focus return

## Data / contracts

```ts
type MatchEventType =
  | 'goal'
  | 'own-goal'
  | 'penalty-goal'
  | 'penalty-missed'
  | 'yellow-card'
  | 'red-card'
  | 'substitution'

interface MatchEvent {
  id: string         // provider event id; skipped when missing
  type: MatchEventType
  minute: string     // display text from the provider, e.g. "23'", "90'+4'"
  teamId?: string    // matches Match.homeTeam.id or awayTeam.id when known
  player?: string    // scorer, carded player, or substitute coming on
  playerOff?: string // substitutions only: player going off
}
```

`Match.events` is ordered chronologically by the provider's clock value, with
ties kept in provider order. `Competition.id` is the ESPN slug from the 1b list
(`eng.1`, `esp.1`, `ita.1`, `ger.1`, `fra.1`, `uefa.champions`).

ESPN summary mapping (the field paths are confirmed in step 1; untrusted input
validated with hand-written guards, no new dependency):

- Score and status come from the summary header's competition, using the same
  competitor and status rules as 1b. If they are missing or invalid, the list's
  values are kept.
- Events come from the summary's key-event list. Type is mapped from the
  provider's event type: scoring plays split into goal, own goal, and penalty
  goal; cards split into yellow and red, with a second yellow mapping to red;
  substitution; missed or saved penalty to `penalty-missed`. Anything else is
  skipped.
- Team is the event's team id when it equals one of the match's team ids,
  otherwise omitted. Players use the provider's display names. The minute uses
  the provider's display clock.
- A response that isn't an object throws `EspnResponseError`. A missing or
  non-array event list gives `events: []`.

Rendering: all provider text renders as React text nodes, never as HTML.

## Testing

- `npm test` (Vitest) covers `normalizeSummary`, the slug change, and
  `getMatchDetails` as listed in each step's Done when, using the saved fixture,
  hand-built cases, and a stubbed `fetchImpl`. No real network in tests.
- The hook and components are UI and stay out of unit tests (coding standards):
  build, lint, and the manual Chrome check cover them.
- Final gate: `npm test`, `npm run build`, `npm run lint` (no Verify command exists).
- Live Chrome evidence is manual or `/check`; do not claim it unless performed.

## Notes for the AI

- Keep ESPN specifics in `src/api/espn.ts`; components import only from
  `src/api/types.ts` and `src/api/football.ts`.
- Reuse the 1b status and score rules in `espn.ts` rather than duplicating them.
- Use the design tokens (`bg-surface`, `text-muted`, `border-border`,
  `text-accent`, …); no raw colors. Event icons can be emoji or inline SVG, but
  each needs a text label for screen readers.
- The row button must keep the row's current visual layout and have a visible
  focus ring. Its accessible name should read naturally, for example
  "Arsenal vs Leeds United, 12:30".
- No `chrome.*` APIs, so no new permissions. The summary endpoint is on the same
  ESPN host the list already fetches without a host permission; if CORS blocks
  it, stop and ask before adding a permission.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10275,"specSha256":"07d7bea8d53bf5d856a34e4d5335450d167c58d460794401a819ce36f3de41d2","branch":"refs/heads/feature/match-details-live-events","head":"9061caae90c99b39b524dcfb198fbda267839ee1","baseRef":"refs/heads/main","baseCommit":"2e8408397a0fabda78af3fb0632d5abab82bcf9e","sourceTree":"7d42841e5626fd0d110275aaf493990835ef4749","absentOptional":[]} -->

## Findings

### 2/F-01 [P3] closed - Live/HT status text has no separator before the score

**File:** src/components/matches/MatchRow.tsx:14
**Found:** 2026-10-03 by /audit independent (scope: current; lens: quality)
**Why it matters:** The visual gap between "Live"/"HT" and the score comes only
from the `ml-1` margin (lines 14 and 20). The text content is `Live2–1` /
`HT1–0`, so screen readers and copy/paste get the words run together. The spec
asks for status as text, not only visual presentation.
**Suggested fix:** Render a real space before the score (for example `{' '}`
before the score span) and drop `ml-1`. No current requirement is lost.
**Resolution:** Fixed on fix/space-before-live-ht-score: live and halftime cases render a real `{' '}` before the score span and drop `ml-1`. Re-reviewed 2026-10-04 by /audit (scope: fix commit 2e84083; all lenses): built bundle renders children [`Live`|`HT`, score && [` `, score span]], so text is `Live 2–1` / `HT 1–0` and exactly `Live` / `HT` with no score; `ml-1` removed; other cases unchanged; tests, build, lint pass. Closed.

## Independent review

**Status:** passed
**Target commit:** 9061caae90c99b39b524dcfb198fbda267839ee1
**Base commit:** 2e8408397a0fabda78af3fb0632d5abab82bcf9e
**Base ref:** refs/heads/main
**Spec hash:** 07d7bea8d53bf5d856a34e4d5335450d167c58d460794401a819ce36f3de41d2
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-03T23:23:17Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-03T23:26:04Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `2e8408397a0fabda78af3fb0632d5abab82bcf9e..9061caae90c99b39b524dcfb198fbda267839ee1` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `git rev-parse HEAD` / `git merge-base refs/heads/main HEAD` / `shasum -a 256 blueprint/context/current-feature.md` / `git status --porcelain`: pass (target, base, and spec hash match; only review.md differs)
- `npm test`: pass (4 files, 70 tests)
- `npm run build`: pass (tsc -b and vite build)
- `npm run lint`: pass (no output)
- Read-only `curl`/`fetch` GETs to ESPN scoreboard and summary endpoints: pass (shape and CORS confirmed)

### Evidence

- Freshness: HEAD equals target, merge base of refs/heads/main equals base, spec bytes match the recorded hash, no non-evidence path differs from target.
- Live ESPN summary for event 401879272 returns `access-control-allow-origin: *`; substitution `participants[0]` is the player coming on ("X replaces Y" text), matching the normalizer.
- Sampled about 70 finished eng.1/esp.1/ita.1/ger.1 summaries: stoppage-time events carry clock 2700 or 5400 in chronological provider order, so the stable clock sort gives correct order and no first-half/second-half inversion. Observed types (`goal---*`, `own-goal`, `penalty---scored/saved/hit-woodwork`, `red-card`) all map to the spec's types.
- normalizeSummary guards every untrusted field (isRecord/text/finite clock), throws EspnResponseError only for a non-object body, and renders provider text only as React text nodes; logo URLs stay HTTPS-filtered.
- Competition.id slug change: all callers (football.ts, useMatchDetails key, espn/football tests) use the slug; no numeric-id references remain outside a test fixture literal.
- getMatchDetails wraps only ProviderRequestError and EspnResponseError (network, timeout, non-2xx, invalid JSON, unusable body) as MatchDetailsError; tests cover each and the unwrapped unexpected error.
- useMatchDetails keys settled state by competition/match/attempt and cancels on cleanup, so stale or superseded responses are ignored; MatchDetail is remounted per match id.
- App keeps the list mounted under `hidden`, records the trigger and scrollY, and restores both after the list is shown; detail focuses the `h2` (tabIndex -1); Back has `aria-label="Back to matches"`; error uses `role="alert"` with Retry; skeleton has `aria-busy="true"`; icons are `aria-hidden` with sr-only labels.

### Findings

- F-02 [P3] open - Summary with a valid status but unusable score drops the list's score
- F-03 [P3] open - Match row button wraps block elements

### Remaining risk

- Manual Chrome check of the popup from `dist/` (focus, scroll restore, Network panel, offline Retry, console) was not performed by this reviewer; Check was not required.
- Second-yellow mapping relies on ESPN type names containing `red-card` or `second-yellow`; no live second-yellow event was observed in the sample.
- In-flight summary requests are not aborted on Back; responses are ignored and bounded by the 10 s timeout.
- No Verify command or CI workflow exists.
