# Fix: Highlight followed competitions in Upcoming

**Type:** Fix
**Status:** verified
**Branch:** fix/highlight-followed-competitions-in-upcoming

## The problem

The Upcoming and Results lists (`src/components/matches/MatchList.tsx`) already
put matches in three sections: "Your teams", then "Your competitions", then
everything else by day. All three look the same: plain headings and identical
cards. Matches from competitions the user follows don't stand out from the rest.

## The fix

Make the personal sections visually distinct, with no data or behavior change.

- **"Your teams" and "Your competitions":** each sits in a highlighted panel:
  - a rounded container with a soft accent tint (`bg-accent/10`) and an accent
    border (`border-accent/40`), inset from the edges like the other cards;
  - a heading with a filled star icon (decorative; the heading text carries the
    meaning).
- **Inside "Your competitions":** matches are grouped by competition, in
  first-appearance order (which follows kickoff order). Each group has a small
  header with the competition logo (the existing `Crest`, from the match's
  `competition.logo`) and name. Matches keep kickoff order inside each group.
- **Everything else:** goes under an **"Other matches"** heading, then the
  existing day groups, in the current plain style. The heading appears only when
  at least one highlighted section is shown above it, so lists without follows
  look exactly as today.
- **Scope:** applies to both Upcoming and Results, which share `MatchList`. The
  competition screen (feature 23) passes no followed competitions, so it gets no
  "Your competitions" panel and no "Other matches" heading. Its "Your teams"
  panel is highlighted like elsewhere.
- **Must not break:**
  - the day chips filter all sections as today;
  - the existing section IDs and `aria-labelledby` links keep working, and the
    new IDs use the `${view}-` prefix;
  - empty, loading, error, stale, and partial-failure states are unchanged;
  - status text and crests in the cards are unchanged;
  - there is no color-only meaning, because each panel's heading names it.

## Build steps

- [x] **1. Highlighted panels and per-competition groups.**
  - Add `groupByCompetition(matches)` next to `splitByCompetitions` in
    `src/lib/favorites.ts`. It returns `{ id, name, logo, matches }[]` in
    first-appearance order, with each group's matches in input order.
  - Add tests in `src/lib/favorites.test.ts`.
  - Update `MatchList` as described.

  **Done when:** `npm test`, `npx tsc -b`, `npm run lint`, and `npm run build`
  pass. The tests cover:
  - group order by first appearance;
  - matches keeping their order within a group;
  - an empty input;
  - the logo coming from the first match that has one.

## Verify

- **Automated:** `npm test`, typecheck, lint, and build.
- **In Chrome** (after `npm run build` and reloading the extension):
  - follow a team and a competition. In Upcoming, "Your teams" and "Your
    competitions" show as tinted panels, the competitions panel is grouped with
    logo headers, and "Other matches" follows in plain style;
  - with nothing followed, Upcoming looks exactly as before;
  - day chips still filter every section;
  - Results shows the same treatment.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3269,"specSha256":"7fef7d9ba0114541bb29f943e4e3595ec52206a32b7f1e426f31e2b815a61219","branch":"refs/heads/fix/highlight-followed-competitions-in-upcoming","head":"1b20a054f70e2084f74ac0ac96ff609ffc9a7706","baseRef":"refs/heads/main","baseCommit":"1b20a054f70e2084f74ac0ac96ff609ffc9a7706","sourceTree":"b07cdc19c2328104ec5e35ac416ef5c92d3fbd04","absentOptional":[]} -->
