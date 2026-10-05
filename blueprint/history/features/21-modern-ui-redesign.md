# Feature: Modern UI Redesign

**From build-plan:** feature 21
**Build attempt:** 1
**Branch:** feature/modern-ui-redesign
**Status:** verified

## Goal

Make every popup screen look modern, calmer, and quicker to use, without
changing what Footly does. The user asked for this to be designed directly, with
no mockup stage. The design below stays within the project's UI principles
(compact, easy to scan, strong hierarchy, excellent dark mode, no color-only
status) and its existing color tokens, which the contrast test guards.

## Design reference

There is no mockup, by the user's decision. The design is defined by this spec:

- **Section headings:** sentence case, `text-sm font-semibold text-foreground`,
  with space above (`px-4 pt-4 pb-2`). This replaces today's shouty uppercase
  grey bars. One shared class is used everywhere.
- **Header:** sticky at the top, with a translucent surface and a bottom border.
  It shows the wordmark (with a small accent dot) and a round icon button for
  Settings.
- **Bottom navigation:** the active tab shows its icon inside an accent-tinted
  pill (`bg-accent/15`) with accent-colored text. Inactive tabs are muted. The
  top-border indicator goes away.
- **Grouped cards:**
  - Settings and Favorites sections sit in rounded cards (`rounded-xl border
    bg-background`, `mx-3`), like modern settings lists.
  - Rows inside a card are separated by dividers.
- **Day chips:** Upcoming and Results get a horizontal row of rounded chips (All,
  Today, Tomorrow, and weekday dates) for jumping to one day. The selected chip
  is filled accent; the others are outlined.
- **Live hero (Home):** the top live match is shown as a large card:
  - crests;
  - big score (`text-3xl`);
  - the live pill;
  - recent events below.

  This replaces the plain row plus "Recent events" block. Other live matches
  stay as cards.
- **Match detail:** the score block becomes a card with a larger score
  (`text-4xl`), with the status centered under it.

## In scope

- Everything in the design reference.
- Keyboard and screen-reader behavior stays the same or improves:
  - day chips are a `radiogroup` of buttons with `aria-checked`, Left/Right arrow
    navigation, and roving tabindex;
  - all focus rings stay visible;
  - status keeps its text.
- Day chips:
  - list only days that have matches in the current view, plus All;
  - All is the default, and the choice resets when the tab's data reloads with
    no match on the chosen day;
  - the favorite and followed sections are filtered by the chosen day too.
- Empty, loading, error, stale, and partial-failure states keep their current
  behavior and text, restyled with the new headings and cards.

## Out of scope

- New features, settings, data, or network changes.
- New color tokens, fonts, or dependencies. Tailwind opacity modifiers on the
  existing tokens are allowed.
- Countdowns on every card, and suggesting a league by country.

## Build loop

Continuous run: implement all steps, verify each, then complete locally.
`workflow.checkpointCommits` is `disabled`.

## Build steps

- [x] **1. Shared look: headings, header, bottom navigation.**
  - Restyle `sectionHeadingClass` in `src/components/matches/status.ts`.
  - Replace the duplicate local `headingClass` constants in `MatchList.tsx`,
    `SearchPanel.tsx`, and `FavoritesPanel.tsx` with it.
  - Make the header sticky and translucent with a round Settings button.
  - Give the active tab in `MatchTabs` the accent pill.

  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass, and no
  local `headingClass` constant remains.

- [x] **2. Day chips for Upcoming and Results.**
  - Add `matchDays(matches)` and `onDay(matches, dayKey)` to `src/lib/date.ts`,
    built on the existing `localDayKey`, with tests.
  - `matchDays` gives the distinct local day keys in list order.
  - Add `DayChips` to `src/components/matches/`, and use it in `MatchList` above
    the sections, with labels from `dayLabel`.

  **Done when:** `npm test` passes, with cases for:
  - distinct days in order;
  - an empty list;
  - filtering keeping only the chosen day.

  Build and lint pass, and the arrow keys move between chips.

- [x] **3. Home live hero.** Replace the first live row and the "Recent events"
  block in `HomePanel` with a `LiveHero` card:
  - crests, big score, live pill, recent events, and the existing Open match
    action;
  - the card is a button that opens the match;
  - the featured events keep their mount and refresh rules from feature 12.

  **Done when:** build, lint, and tests pass.

- [x] **4. Grouped cards in Settings and Favorites.** Wrap each section body in
  `SettingsPanel`, `PrivacySection`, and `FavoritesPanel` in the rounded card
  container with dividers. Keep the headings outside the cards.
  **Done when:** build, lint, and tests pass, and no section loses content or
  labels.

- [x] **5. Match detail polish.** Turn the score block into a card with a
  `text-4xl` score and the status centered under it. Stats, lineups, and the
  timeline keep their content.
  **Done when:** build, lint, and tests pass.

## Files / areas

- `src/components/matches/status.ts`, `MatchTabs.tsx`, `MatchList.tsx`,
  `MatchDetail.tsx`, new `DayChips.tsx`
- `src/components/home/HomePanel.tsx`
- `src/components/search/SearchPanel.tsx`
- `src/components/favorites/FavoritesPanel.tsx`
- `src/components/settings/SettingsPanel.tsx`, `PrivacySection.tsx`
- `src/App.tsx` (header)
- `src/lib/date.ts`, `src/lib/date.test.ts`

## Data / contracts

- No stored data, API, or permission changes. The day chip selection is
  in-memory per tab and is not stored.

## Testing

- Vitest covers `matchDays` and `onDay`. Components are not unit-tested, per
  coding standards.
- Contrast stays guarded by the existing token test, because no tokens change.
- No browser test command exists. The visual result has not been observed in
  Chrome during this run; the packet says so.

## Notes for the AI

- Reuse `MatchRow` cards, `Crest`, `StatusText`, and the existing skeletons.
- Keep every existing `id`, `aria-*`, and role that other code or focus handling
  depends on. That includes the tab and panel IDs, `settings-` IDs, the
  `home-`, `search-`, and `favorites-` heading IDs, and the focus targets.
- Chip buttons need visible text and `aria-checked`. The selected chip must not
  rely on color alone, so it also gets a heavier font weight.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6424,"specSha256":"310db71ca2c32a4fe1da3a32ae4743128612a57eda1555f5af6a49f2a71727a3","branch":"refs/heads/feature/modern-ui-redesign","head":"4e28decd30d8a7b23494c9bbd5fbe234e6d519db","baseRef":"refs/heads/main","baseCommit":"4e28decd30d8a7b23494c9bbd5fbe234e6d519db","sourceTree":"e3a65a90380520a1e71b2a0733c0a3279298f092","absentOptional":[]} -->
