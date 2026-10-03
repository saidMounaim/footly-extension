# Feature: Upcoming Matches

**From build-plan:** feature 1b
**Build attempt:** 1
**Branch:** feature/upcoming-matches
**Status:** verified

## Goal

When the popup opens, fetch ESPN scoreboards for six fixed competitions, normalize
them into Footly's internal `Team` / `Competition` / `Match` models, and show the
matches from today through the next 7 days, grouped by day and sorted by kickoff.
Each row shows the competition, both teams, the local kickoff time, and the match
status as text. Loading, empty, partial-failure, and error states are covered.
React never sees ESPN's raw response format.

## In scope

- **Competition set** (fixed, in this order for display tie-breaks):
  Premier League `eng.1`, La Liga `esp.1`, Serie A `ita.1`, Bundesliga `ger.1`,
  Ligue 1 `fra.1`, Champions League `uefa.champions`.
- **Endpoint:** `GET https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard?dates={YYYYMM}`,
  one request per competition per calendar month the padded window touches
  (6 requests usually, 12 when it crosses a month boundary), all sent in
  parallel, HTTPS only, 10 s timeout each. (Revised during implementation: ESPN
  returns HTTP 400 for `YYYYMMDD-YYYYMMDD` ranges; month queries return 200.)
- **Window:** local start of today (00:00 in the user's timezone) up to, but not
  including, local start of today + 8 days, which is today plus the next 7 days.
  The window is padded by one calendar day on each side to pick the months to
  request, so timezone differences can't drop matches; the exact window is
  applied to `startTime` after normalization.
- **Which matches are listed:** every match in the window except `finished`
  (finished results are feature 3). Today's live and halftime matches show
  their score; postponed and cancelled matches stay listed with their status.
- **Normalization** into the overview's models plus a defined `MatchStatus`
  (see Data / contracts). Malformed individual events are skipped; an
  unparseable league response counts as that competition failing.
  Duplicate match IDs are kept once.
- **UI states:**
  - Loading: skeleton rows (`aria-busy="true"` on the list region).
  - Success: day groups ("Today", "Tomorrow", then weekday + date, local
    format), each row with the competition name, home vs away team, and a status cell.
  - Empty (all requests succeeded, nothing in the window): "No upcoming matches
    in the next 7 days."
  - Partial failure (some competitions failed, at least one succeeded): show the
    matches plus a notice "Some competitions couldn't be loaded." with a Retry
    button.
  - Error (every competition failed): "Couldn't load match data. Check your
    connection and try again." with a Retry button.
  - Retry re-runs all six requests and shows the loading state again.
- **Status cell text** (never color alone): upcoming → local kickoff time
  (`HH:mm` via `Intl.DateTimeFormat`); live → "Live" + `home–away` score;
  halftime → "HT" + score; postponed → "Postponed"; cancelled → "Cancelled".
- **Permission:** fetch directly with no host permission. If the extension popup
  is blocked by CORS, add exactly `host_permissions: ["https://site.api.espn.com/*"]`
  and update the manifest test to assert that exact single entry.

## Out of scope

- Finished results (feature 3), match events/timeline (feature 2), favorites
  (features 4, 5), rich status badges (feature 6), countdowns (feature 7).
- Caching, `chrome.storage`, auto-refresh or polling, service worker (feature 11).
  Data is fetched once per popup open and on Retry.
- Rendering team or competition logos (the model keeps `logo`; no image requests yet).
- Rate-limit-specific or offline-specific messaging (feature 15); they use the
  generic error path here.
- Navigation, match detail view, theme toggle.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`. `/complete` creates the single
feature commit. A test command exists, so every logic step ships passing tests.

## Build steps

- [x] **1. Models and ESPN normalizer.** Before writing code, fetch one real
  scoreboard per slug with `curl` to confirm the response shape and whether
  `Access-Control-Allow-Origin` permits extension origins; record the CORS result
  in the review packet. Save one trimmed real response (a few events covering
  scheduled, and if available live/halftime/postponed/final) as
  `src/api/fixtures/espn-scoreboard.json`. Add `src/api/types.ts` and the pure
  `normalizeScoreboard(json: unknown): Match[]` in `src/api/espn.ts`.
  **Done when:** `npm test` passes tests for the fixture plus hand-built cases:
  each status mapping, score only for live/halftime/finished, missing optional
  fields (no `shortName`/`logo`), a non-https logo dropped, malformed events
  skipped (missing id, missing competitor, unparseable date), and non-object or
  missing-`events` input throwing `EspnResponseError`.

- [x] **2. Upcoming-matches service.** In `src/api/football.ts`, add the
  competition list and `getUpcomingMatches({ now, fetchImpl })` (both defaulting
  to real values; injectable for tests): derive the `YYYYMM` months from the
  padded window, request every competition × month in parallel with
  `AbortSignal.timeout(10_000)`, use `Promise.allSettled`, treat non-2xx or
  `EspnResponseError` on any of a competition's months as that competition
  failing, merge, dedupe by
  `id`, drop `finished`, apply the exact window, and sort by `startTime` then
  competition order. Date helpers live in `src/lib/date.ts`.
  **Done when:** `npm test` passes tests with an injected `now` and a stubbed
  fetch for: month list (one month, and a window crossing a month and a year
  boundary) and window edges (a match at local 00:00 today
  included; one at local start of day 8 excluded; across a DST change), sorting,
  dedupe, finished filtered, one competition failing yields a partial result,
  all failing yields the all-failed result, and URLs are the exact HTTPS endpoint.

- [x] **3. Popup list and states.** Add `src/hooks/useUpcomingMatches.ts`
  (loading / success / error with `retry`), `src/components/matches/MatchList.tsx`
  (day groups, skeleton, empty, notice, error) and `MatchRow.tsx`, and render
  the list in `src/App.tsx` in place of the placeholder. Day labels and times use
  helpers from `src/lib/date.ts` (unit-tested). Apply the CORS result from step 1:
  only if blocked, add the single host permission and update
  `manifest.config.test.ts`.
  **Done when:** `npm test`, `npm run build`, and `npm run lint` pass; the
  popup loaded from `dist/` in Chrome shows a skeleton, then day-grouped matches
  with competition, teams, time/status text, and no console or CORS errors.
  With the network offline in popup devtools, it shows the error message and
  Retry works once the network is back.

## Files / areas

- `src/api/types.ts` (new) - `Team`, `Competition`, `Match`, `MatchStatus`, `MatchEvent`
- `src/api/espn.ts` (new) - `normalizeScoreboard`, `EspnResponseError`, scoreboard URL builder
- `src/api/football.ts` (new) - competition list, `getUpcomingMatches`
- `src/api/fixtures/espn-scoreboard.json` (new) - trimmed real response for tests
- `src/lib/date.ts` (new) - window bounds, months to request, day label, time format
- `src/hooks/useUpcomingMatches.ts` (new)
- `src/components/matches/MatchList.tsx`, `MatchRow.tsx` (new)
- `src/App.tsx` - render the list
- Tests next to source: `espn.test.ts`, `football.test.ts`, `date.test.ts`
- `manifest.config.ts` and `manifest.config.test.ts` - only if CORS requires the host permission

## Data / contracts

Internal models (locked once feature 1 ships; later features build on them):

```ts
type Team = { id: string; name: string; shortName?: string; logo?: string }
type Competition = { id: string; name: string; logo?: string }
type MatchStatus = 'upcoming' | 'live' | 'halftime' | 'finished' | 'postponed' | 'cancelled'
type MatchEvent = { id: string } // placeholder; feature 2 defines the real shape
type Match = {
  id: string
  homeTeam: Team
  awayTeam: Team
  competition: Competition
  startTime: string // ISO 8601 UTC, from Date#toISOString()
  status: MatchStatus
  score?: { home: number; away: number } // only for live, halftime, finished
  events: MatchEvent[] // always [] in 1b
}
```

ESPN → model mapping (untrusted input; validated with hand-written type guards,
no new dependency):

- `Match.id` ← `event.id`; `startTime` ← `event.date` parsed, rejected if invalid.
- Teams ← `event.competitions[0].competitors[]` by `homeAway` (`home`/`away`);
  `id` ← `team.id`, `name` ← `team.displayName`, `shortName` ←
  `team.shortDisplayName`, `logo` ← `team.logo` only if it is an `https:` URL.
- `Competition` ← response `leagues[0]` (`id`, `name`, first `https:` logo href).
- Score ← `competitor.score` parsed as a non-negative integer, set only for
  live/halftime/finished; dropped if either side is not a valid integer.
- Status ← `event.status.type`: `name` `STATUS_HALFTIME` → halftime;
  `STATUS_POSTPONED` → postponed; `STATUS_CANCELED` or `STATUS_ABANDONED` →
  cancelled; otherwise `state` `pre` → upcoming, `in` → live, `post` → finished.
  Any other combination makes the event malformed (skipped).
- An event is skipped, not fatal, when any required field is missing or the
  wrong type. A response that is not an object or lacks an `events` array
  throws `EspnResponseError`.

Service result:

```ts
type UpcomingMatchesResult = { matches: Match[]; failedCompetitionIds: string[] }
```

`getUpcomingMatches` never throws for per-competition failures. The hook treats
"all six failed" as the error state. Unexpected errors (bugs) are not caught in
the normalizer and surface through the hook's error state.

Rendering: all provider text renders as React text nodes; never
`dangerouslySetInnerHTML`, never provider HTML.

## Testing

- `npm test` (Vitest) covers `espn.ts`, `football.ts`, and `date.ts` as listed in
  each step's Done when, using an injected `now` and a stubbed `fetchImpl`; no
  real network in tests. Pin the timezone (for example `TZ=Europe/London` via
  the Vitest config `test.env`) so window and DST tests are deterministic.
- Components and the hook are UI and stay out of unit tests (coding standards):
  build, lint, and the manual Chrome check cover them.
- Final gate: `npm test`, `npm run build`, `npm run lint` (no Verify command exists).
- Live Chrome evidence (popup, offline + Retry) is manual or `/check`; do not claim
  it unless performed.

## Notes for the AI

- Keep ESPN specifics inside `src/api/espn.ts`; components import only from
  `src/api/types.ts` and `src/api/football.ts`.
- Use the design tokens from 1a (`bg-surface`, `text-muted`, `border-border`,
  `text-accent`, …); no raw colors.
- Retry and error states are real `<button>`s with visible focus; the error
  message and partial notice use `role="alert"` when they appear.
- No `chrome.*` calls in this feature, so no `@types/chrome`.
- If the curl check in step 1 shows ESPN's shape differs materially from the
  mapping above (for example no `leagues[0]`), stop and revise this spec rather
  than improvising.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11247,"specSha256":"3433c561e5d221d3d399f3ef1f8717d1909c413c2e89c0df7588e1d3c45d6e45","branch":"refs/heads/feature/upcoming-matches","head":"86fdd8421ca688cbe1ef65b017941ed80614a5f6","baseRef":"refs/heads/main","baseCommit":"332fb9adaff4ceaf4c1d53c0f5fcf186ff36f0ac","sourceTree":"324a502aefd8e5b9386fcf62351ffb7cce0dd9e5","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 86fdd8421ca688cbe1ef65b017941ed80614a5f6
**Base commit:** 332fb9adaff4ceaf4c1d53c0f5fcf186ff36f0ac
**Base ref:** refs/heads/main
**Spec hash:** 3433c561e5d221d3d399f3ef1f8717d1909c413c2e89c0df7588e1d3c45d6e45
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-03T22:57:03Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-03T22:58:26Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `332fb9adaff4ceaf4c1d53c0f5fcf186ff36f0ac..86fdd8421ca688cbe1ef65b017941ed80614a5f6` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `git rev-parse HEAD`: pass (equals Target commit)
- `git merge-base refs/heads/main HEAD`: pass (equals Base commit)
- `shasum -a 256 blueprint/context/current-feature.md`: pass (equals Spec hash; spec is tracked)
- `git status --porcelain`: pass (only blueprint/context/review.md differs)
- `npm test`: pass (4 files, 38 tests)
- `npm run build`: pass (tsc -b and vite build; manifest has no permissions)
- `npm run lint`: pass
- `curl` GET ESPN `eng.1` and `uefa.champions` `?dates=202610` with an extension Origin: pass (200, `access-control-allow-origin: *`, ~24 KB gzipped each); `dates=YYYYMMDD-YYYYMMDD` returns 400

### Evidence

- Reviewed full delta 332fb9a..86fdd84 (20 files): src/api/{types,espn,football}.ts, src/lib/date.ts, src/hooks/useUpcomingMatches.ts, src/components/matches/{MatchList,MatchRow}.tsx, src/App.tsx, tests, fixture, vite/tsconfig/package config, AGENTS.md, overview, spec.
- Normalizer validates untrusted JSON with type guards, keeps only https logos, skips malformed events, throws EspnResponseError on bad top-level shape; status and score mapping match the spec.
- Service derives months from the padded window, issues competition x month requests in parallel with a 10 s AbortSignal timeout, uses allSettled, fails a competition on any month failure, rethrows unexpected errors, dedupes, drops finished, applies the exact local window, sorts by kickoff then competition order.
- UI renders provider text as React text nodes only (no dangerouslySetInnerHTML), uses design tokens, real buttons with focus-visible, role="alert" on error and partial notice, aria-busy skeleton; all-failed maps to error state in the hook.
- Live CORS check confirms direct fetch works, so no host permission is correct and the manifest test asserting none is consistent with the spec.

### Findings

- F-01 [P3] open - Live/HT status text has no separator before the score (src/components/matches/MatchRow.tsx:14)

### Remaining risk

- Live Chrome evidence (popup from dist/, offline then Retry, console free of CORS errors) was not performed by this reviewer; Check was not required.
- Hook and components are not unit tested by design (coding standards); their state transitions rely on build, lint, and manual verification.
- No Verify command or CI workflow exists.
