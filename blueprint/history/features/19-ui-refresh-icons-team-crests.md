# Feature: UI Refresh: Icons & Team Crests

**From build-plan:** feature 19
**Build attempt:** 1
**Branch:** feature/ui-refresh-icons-team-crests
**Status:** verified

## Goal

Make the popup look modern and easier to scan. One consistent line-icon set
(`lucide-react`) replaces the emoji and Unicode symbols, and the bottom tabs get
icons above their labels. Club crests and competition logos from the provider
appear in:

- match rows;
- the "Your next match" card;
- the match detail score;
- competition names;
- the favorites lists.

Crests stay decorative, readable in both themes, and never break the layout when
an image is missing or fails to load.

## In scope

- **Dependency:** add `lucide-react` (1.x, React 19 peer supported). Import
  icons by name so only the used icons are bundled.
- **Icons replacing emoji and symbols:**

  | Where | Today | Icon |
  |---|---|---|
  | Header settings button | ⚙ | `Settings` |
  | Back buttons (match detail, settings) | ← | `ArrowLeft` |
  | Favorite toggle and favorite marker in rows | ★ / ☆ | `Star`, filled when on |
  | Postponed badge | ⚠ | `TriangleAlert` |
  | Cancelled badge | ⊘ | `Ban` |
  | Timeline: goal, own goal, penalty goal | ⚽ | `Goal` |
  | Timeline: missed penalty | ❌ | `CircleX` |
  | Timeline: substitution | 🔄 | `ArrowLeftRight` |
  | Timeline: yellow and red card | 🟨 / 🟥 | A small card shape filled with new `--card-yellow` and `--card-red` tokens |
  | Bottom tabs | text only | `House`, `CalendarDays`, `History`, `Star`, `Search` above the existing labels |

  - Every icon is `aria-hidden`. The visible label, an existing `aria-label`, or
    the existing `sr-only` text stays the accessible name. No meaning moves from
    text into an icon.
  - The live pulse dot and status text stay as they are.
- **Crest component** (`Crest`), used for teams and competitions:
  - Sizes: 16px for competition names, 20px for rows and lists, 40px for the
    next-match card and match detail.
  - Renders `<img alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer">`
    inside a round neutral backdrop (`bg-surface` plus `border-border`), so dark
    crests stay visible in dark mode.
  - Only `https:` URLs are rendered. If there is no logo, an unsafe URL, or the
    image fails to load (`onError`), it shows the team's initials, or a `Trophy`
    icon for competitions, in the same backdrop. The row never shifts.
- **Where crests appear:**
  - **`MatchRow`:** a crest before each team name, plus the competition logo
    before the competition name.
  - **Home `NextMatchCard`:** a large crest beside each team.
  - **`MatchDetail` score block:** a large crest above each team name.
  - **Favorites "Your teams" and team search results:** a crest before the name.
  - **Competition lists in Favorites and Search:** the competition logo before
    the name. The logo is taken from the loaded match list
    (`match.competition.logo` per competition ID). Before the list loads, or when
    a competition has no logo, the `Trophy` fallback shows.
- **Favorite team logos:** saved favorites keep an optional `logo` (an `https:`
  URL) when the team it came from has one.
  - Existing favorites without a logo use the logo from the loaded team catalog or
    match list for the same team ID, otherwise initials. No migration.
- **Visual polish:**
  - The "Your next match" card gets crest-led two-column team layout.
  - Scores in rows are right-aligned and `font-semibold`.
  - Tab labels go to `text-xs` under the icon to fit five tabs.
  - Existing color tokens only, apart from the two card tokens.

## Out of scope

- Image resizing or proxying: crests use the provider URL as is. Image weight and
  caching budgets belong to feature 16.
- Store screenshots and listing assets (feature 18).
- New screens, layout restructuring beyond the items above, and animations.
- Changes to data fetching, refresh, or notification icons.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet for the whole feature. `workflow.checkpointCommits` is `disabled`.
`/complete` creates the feature commit.

## Build steps

- [x] **1. Logo data helpers.**
  - Add `src/lib/crest.ts` with:
    - `safeImageUrl(value)`, which returns the string only for a parseable
      `https:` URL;
    - `initials(name)`: up to 2 uppercase letters from the first letters of the
      first two words, or the first 2 letters of a single word, ignoring
      punctuation. Empty input gives `''`.
  - Extend `FavoriteTeam` in `src/lib/favorites.ts` to
    `Pick<Team, 'id' | 'name' | 'shortName' | 'logo'>`:
    - `parseFavoriteTeams` keeps `logo` only when `safeImageUrl` accepts it;
    - `toggleFavorite` and `saveFavoriteTeams` copy `logo` when present.
  - Add `src/lib/crest.test.ts` and extend `src/lib/favorites.test.ts`.

  **Done when:** `npm test` passes, with cases for:
  - accepted `https:` URLs, and rejected `http:`, `javascript:`, relative,
    empty, and non-string values;
  - initials for "Manchester City" → "MC", "Arsenal" → "AR", "1. FC Köln" → "FK",
    and empty;
  - favorites parsing that keeps a valid logo, drops an invalid one, and still
    loads entries saved without a logo;
  - `toggleFavorite` copying the logo.

- [x] **2. Icon set.**
  - Install `lucide-react` (`npm install lucide-react`).
  - Replace every emoji and symbol in the table above, and add the tab icons.
  - Add `--card-yellow` and `--card-red` tokens in `src/index.css` for light and
    both dark blocks.
  - Add the two names to the token list in `src/lib/contrast.test.ts` (they are
    not contrast-checked, since they are decorative with text labels).

  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass. A search
  for `⚽|🟨|🟥|🔄|❌|★|☆|⚙|⚠|⊘|←` in `src/components` and `src/App.tsx` finds
  nothing. The five tabs show icon plus label and keep their arrow-key behavior.

- [x] **3. Crests in match views.**
  - Add `src/components/common/Crest.tsx` (team and competition variants with
    fallbacks).
  - Use it in `MatchRow`, Home `NextMatchCard`, and the `MatchDetail` score
    block. Apply the row and next-match polish.

  **Done when:** `npm run build` and `npm run lint` pass. In the loaded extension:
  - rows, the next-match card, and match detail show crests in both themes;
  - blocking `a.espncdn.com` in DevTools (request blocking) shows initials and
    trophy fallbacks with no layout shift.

  Record what was actually observed.

- [x] **4. Crests in Favorites and Search.**
  - Show crests in Favorites "Your teams" and the team search results, with the
    catalog or list fallback for old favorites.
  - Show competition logos in the Favorites and Search competition lists, from
    the loaded match list.

  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass. In the
  loaded extension:
  - a team favorited after this change keeps its crest across popup reopen;
  - an older favorite shows a crest once the catalog loads;
  - competitions show logos after the list loads.

  Record what was actually observed.

- [x] **5. Roomier match cards (review feedback).**
  - Each match row becomes a rounded card with more space:
    - a header with the competition logo and name, the favorite star, and the
      status (without the score);
    - one line per team with crest, name, and that team's own score;
    - on a finished match, the losing side is muted.
  - The Home "Your next match" card gets wider gaps and a divider above the
    kickoff line.
  - `StatusText` gains `showScore` (default `true`), so the detail view is
    unchanged. Match lists drop their divider lines in favor of card spacing.

  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass, and the
  crest, name, and score no longer crowd each other in rows at 360px. Record
  whether this was seen in Chrome.

## Files / areas

- New: `src/lib/crest.ts`, `src/lib/crest.test.ts`,
  `src/components/common/Crest.tsx`
- Changed:
  - Setup and styles: `package.json`, `package-lock.json`, `src/index.css`
  - Logic and tests: `src/lib/favorites.ts`, `src/lib/favorites.test.ts`,
    `src/lib/contrast.test.ts`
  - Match components: `src/components/matches/MatchRow.tsx`,
    `MatchTimeline.tsx`, `MatchTabs.tsx`, `MatchDetail.tsx`
  - Other components: `src/components/home/HomePanel.tsx`,
    `src/components/favorites/FavoriteToggle.tsx`,
    `src/components/favorites/FavoritesPanel.tsx`,
    `src/components/search/SearchPanel.tsx`,
    `src/components/settings/SettingsPanel.tsx`
  - App: `src/App.tsx`
- Reused: `Team.logo` and `Competition.logo`, already filled by `src/api/espn.ts`
  (`httpsUrl`); the existing color tokens.

## Data / contracts

- The stored `favoriteTeams` entries gain an optional `logo`:
  `{ id, name, shortName?, logo? }`.
  - `logo` is saved only as an `https:` URL string and validated again on read.
  - Older entries without it stay valid; there is no migration and no version bump.
  - The background worker reads only `id` from favorites, so it is unaffected.
- Image URLs come from untrusted provider data and stored values. They are
  rendered only through `<img src>` after `safeImageUrl`, never as HTML or CSS.
- `referrerPolicy="no-referrer"` keeps the extension's page address out of crest
  requests. No new permissions: extension pages may load remote images under the
  default MV3 policy.

## Testing

- Vitest covers `safeImageUrl`, `initials`, the favorite logo handling (step 1),
  and the token list (step 2). Components are not unit-tested, per coding standards.
- No browser test command exists. Steps 3–4 are checked manually in Chrome, in
  both themes and with crest requests blocked. Record what was actually observed.

## Notes for the AI

- Import lucide icons individually (`import { Star } from 'lucide-react'`). Size
  them with `size-4` / `size-5` classes and color them with `currentColor` through
  the existing text tokens.
- The filled favorite star uses `fill-current` on `Star`. Keep `aria-pressed` and
  the existing labels.
- `Crest` keeps its own `failed` state, reset when `src` changes (key it by URL),
  so a recycled row never shows a stale fallback.
- Do not add a logo cache, image proxy, or preloading. Feature 16 decides any
  budget.
- Keep text truncation (`truncate`, `min-w-0`) working with the new leading
  crest in every row.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10426,"specSha256":"ed6a385ee6a12d4d83905c43a9757ef68309e24486093a6fc4d0da8c240022c0","branch":"refs/heads/feature/ui-refresh-icons-team-crests","head":"da5b5ba98f0c7034ac8691c82ffadba3389772e8","baseRef":"refs/heads/main","baseCommit":"da5b5ba98f0c7034ac8691c82ffadba3389772e8","sourceTree":"bc086ac78cab7fd57c01beede84923dd2ca8d9f6","absentOptional":[]} -->
