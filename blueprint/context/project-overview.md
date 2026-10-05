# Footly - Project Overview

<!-- blueprint:source-hash c4efd179e3ff04577a45f7dc855fb2e87d6acf0fd7ff9481ac65a43f67ac7dd0 -->

> Footly is a lightweight Chrome extension that shows upcoming matches, live scores, and results in a compact popup, prioritizing the user's favorite teams and competitions.

## Problem

Football fans juggle several websites and apps to check fixtures, live scores, goals, cards, and results. Footly puts the essentials in the browser: open the popup and immediately know what is happening. It complements the existing Koora Next project and is not another full football website.

Principles: fast, simple, focused, lightweight (few requests, little background work), reliable when data is delayed or missing, privacy-first, and API-independent (internal models separate from the provider's format).

## Users

- Football fans who regularly check scores and fixtures, including those following several clubs or competitions.
- Chrome users who want live notifications without keeping a football site open.
- Initial target: a fan with a few favorite teams who wants the next match or live result in seconds. Must work for casual and close followers; UI stays simple.

## Usage model

- Internet-facing Chrome extension for individual users; small initial user base, no enterprise requirements.
- No account for the MVP; local-first preferences; no server database initially.
- Must handle rate limits, missing or delayed data, cancelled/postponed matches, incomplete events, network failures, provider outages, and unexpected response changes. Never assume every match has every event or statistic.
- "Live" is not millisecond real-time: prefer reasonable refresh rates, API efficiency, reliability, and low resource use. Refresh by match state: upcoming is infrequent, live is more frequent, finished stops frequent polling.
- Security: no private API credentials in the extension bundle, HTTPS only, minimal permissions, validate external data, never execute HTML or JS from the API.
- Privacy: no browsing history, no inspection of websites, no scripts injected into arbitrary sites, no selling data.
- Non-requirements: accounts, social profiles, chat, betting or gambling, video streaming, user-generated content, editorial news, AI predictions, crypto, access to every website, a permanent server connection, a large database. MVP also excludes intrusive ads and a large content feed.

## Features

Build order from `build-plan.md`; features 1 to 17 and 19 are done. Feature 19 was listed after 15 and built before 16; features 20 and 21 are listed after 17 and built before 18. Headline: the compact popup with next match and live score.

1. **Match Discovery & Upcoming Games** (done) - upcoming matches with competition, teams, kickoff, status. Split into:
   - **1a. Extension Shell** - MV3 popup via `@crxjs/vite-plugin`, Tailwind CSS, light/dark tokens following the system theme; no permissions.
   - **1b. Upcoming Matches** - ESPN scoreboards for a fixed set (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League), today plus the next 7 days, normalized into `Team`/`Competition`/`Match`, listed by kickoff. Direct fetch; `host_permissions` for `https://site.api.espn.com/*` only if CORS blocks it. No backend.
2. **Match Details & Live Events** (done) - live score and chronological timeline (goals, cards, substitutions, penalties).
3. **Recent Results** (done) - completed matches with final scores, key events, dates.
4. **Favorite Teams** (done) - search and save teams; their matches are prioritized.
5. **Favorite Competitions** (done) - follow leagues and surface their matches.
6. **Live Match Status** (done) - compact indicators for upcoming, live, halftime, postponed, cancelled, completed.
7. **Match Countdown** (done) - countdown to kickoff, switching to live info at start.
8. **Goal & Match Notifications** (done) - goals, cards, start, halftime, full-time for favorite teams. Split into:
   - **8a. Match Start & Result Notifications** - first service worker with `chrome.alarms` and `notifications`; kickoff, halftime, full-time alerts, checking only around favorite teams' kickoffs.
   - **8b. Goal & Card Notifications** - goal and card alerts for favorite teams' live matches from match summaries, on 8a's watcher.
9. **Quick Match Search** (done) - search teams, competitions, matches inside the extension.
10. **Match Center** (done) - the match detail view (from feature 2) plus basic team statistics and starting lineups when the provider supplies them; hidden when missing.
11. **Smart Data Refresh & Caching** (done) - state-based refresh, cache stable data, minimize requests.
12. **Personalized Home** (done) - dashboard prioritizing favorites, live matches, next games.
13. **Extension Settings** (done) - notifications, refresh behavior, favorites, appearance.
14. **Dark & Light Themes** (done) - polished themes following system or extension preference.
15. **API Error & Offline States** (done) - clear handling of errors, rate limits, offline, with retry.
19. **UI Refresh: Icons & Team Crests** (done) - one consistent icon set instead of emoji, icons on the bottom tabs, club crests and competition logos in match rows, the next-match card, match detail, competition headings, and favorites.
16. **Performance & Extension Optimization** (done) - popup load time, memory, background activity, permissions.
17. **Privacy & Permissions** (done) - minimal, explained permissions; no unnecessary data collection.
20. **More Competitions** - Botola Pro and international national-team matches (friendlies, World Cup qualifiers, AFCON); followable and searchable; only the six default leagues plus followed competitions are loaded.
21. **Modern UI Redesign** - rework layout and visual style directly (no mockup stage) so every screen is modern, cleaner, and easier to use.
18. **Chrome Web Store Readiness** - Manifest V3 compliance, icons, screenshots, metadata, privacy info, production build.

## Data model

Provider data is normalized into internal models; UI never sees the raw ESPN shape. The plan says the model may evolve. `Team`, `Competition`, and `Match` shapes below come from the plan and are locked once feature 1 ships, since later features depend on them.

### Team

- `id` (string)
- `name` (string)
- `shortName` (string, optional)
- `logo` (string, optional)

### Competition

- `id` (string)
- `name` (string)
- `logo` (string, optional)

### Match

- `id` (string)
- `homeTeam` (Team), `awayTeam` (Team), `competition` (Competition)
- `startTime` (string, ISO)
- `status` (MatchStatus) - covers upcoming, live, halftime, finished, postponed, cancelled
- `score` (`{ home: number, away: number }`, optional)
- `events` (MatchEvent[]) - goals, cards, substitutions, penalties; may be empty or incomplete
- `stats` (`{ home: TeamMatchStats, away: TeamMatchStats }`, optional) - from the match summary; missing when the provider omits it
- `lineups` (`{ home: Lineup, away: Lineup }`, optional) - from the match summary; missing when the provider omits it

> TODO: `MatchStatus` and `MatchEvent` fields are not defined in the plans.

### TeamMatchStats

Basic team statistics; every field is optional because providers omit some.

- `possession` (number, optional) - percent, 0-100
- `shots`, `shotsOnTarget`, `corners`, `fouls` (number, optional)

### Lineup

- `formation` (string, optional) - e.g. "4-2-3-1"
- `starters` (LineupPlayer[]), `substitutes` (LineupPlayer[])

### LineupPlayer

- `id` (string), `name` (string)
- `jersey` (string, optional), `position` (string, optional) - short label such as "G" or "CD-L"

> The match detail view hides the stats and lineup sections when the data is missing instead of showing empty values. Player-level statistics and extended history stay out of the MVP.

### Local preferences (chrome.storage.local)

- Favorite team IDs, favorite competition IDs
- Notification preferences, theme preference
- Refresh preferences (if required), last selected team or competition
- Short-lived cached football data only where it helps performance or reduces requests; no full API responses, no private user data

## Tech stack

- **TypeScript, React, Vite** - extension UI and build
- **Manifest V3, `@crxjs/vite-plugin`** - extension packaging and dev workflow
- **Tailwind CSS** - styling; optional shadcn/ui only where it adds value
- **lucide-react** - one consistent line-icon set; only imported icons are bundled
- **Chrome APIs** - `storage` (preferences), `alarms` (scheduled checks), `notifications`, `runtime` (popup/service worker messaging)
- **ESPN endpoints** - initial data provider, isolated behind an adapter (`src/api/`: `football.ts`, `espn.ts`, `types.ts`); other folders `components/`, `features/`, `hooks/`, `lib/`, `popup/`
- **Backend** - none for the MVP; if CORS, rate limits, reliability, or notifications require one, use Koora Next (Next.js route handlers, Prisma/PostgreSQL only if persistence is needed)
- **Testing** - Vitest for utilities and data transformation, React Testing Library for UI, manual Chrome testing for permissions, popup, service worker, notifications

## Monetization

Not in v1: free and adoption-focused. Possible later "Footly Plus" (advanced notifications, advanced statistics beyond the MVP's basic team stats, personalization, notification profiles, extended history, advanced competition tracking, more providers). Never block basic scores or use intrusive ads or upgrade prompts. Decide after real feedback.

## UI/UX

Modern, compact football companion, not a mini football website. Clean, fast, easy to scan, strong hierarchy, clear live status, excellent dark mode, fits the Chrome popup size.

- Popup `Home` - "Your next match" card, live match with recent events, bottom navigation
- `Favorites` - followed teams and competitions
- `Search` - teams and matches
- `Settings` - preferences and notifications
- Status uses text or icons, not color alone (upcoming neutral, live prominent, halftime label, finished final score, postponed warning, cancelled clear)
- Events listed chronologically (minute, icon, player)
- Skeleton loaders, friendly empty states ("No favorite teams yet."), error states with a retry action
- Redesign: designed directly in the feature 21 spec, without a mockup stage
- Crests and logos from the provider in rows, the next-match card, match detail, competition headings, and favorites: decorative (names stay visible), on a neutral backdrop for both themes, with an initials fallback when missing or broken
- Icons from one line-icon set instead of emoji, always with a text label or accessible name
- Accessibility: keyboard use, sufficient contrast, labeled icons, no color-only indicators, respect system theme, readable at small size

## Deployment

- Distributed through the Chrome Web Store as a Manifest V3 extension
- Build: `npm run build`, output in `dist/`; local dev through Vite, loaded via `chrome://extensions` (Developer Mode, Load unpacked)
- Storage: Chrome local storage only; no database
- Service worker: event-driven only (scheduled checks, notification processing, background refresh, lifecycle); no continuous polling loops
- No content scripts or host permissions ideally; request minimal permissions
- Avoid aggressive polling, large bundles, DOM observers, unnecessary background work
- Env vars only if a backend is added (`FOOTBALL_API_BASE_URL`, `FOOTBALL_API_KEY`); never ship private credentials in the bundle
- > TODO: backend host (Vercel or similar), health check, domain are undecided and only relevant if a backend is introduced

## Open questions

> Resolve in the plans, then re-run /overview.

- **Overlap.** Feature 10 (Match Center) builds on feature 2's detail view rather than replacing it; the project plan now scopes it to basic team statistics and starting lineups.
- **Themes.** 1a follows the system theme; feature 14 still owns a user theme toggle and the polished pass.
- **Cross-cutting items.** Features 15, 16, and 17 are cross-cutting concerns that earlier features will already need in part.
- **Provider risk.** ESPN endpoints are unofficial and CORS from the popup is unverified. The build plan allows one narrow ESPN host permission in 1b if needed; the project plan says the extension should *ideally* have none.
- **Search** appears in the plan as team and match search; build plan adds competitions.
- **Undefined types.** `MatchStatus` and `MatchEvent` shapes are missing. 1b must define `MatchStatus` (it locks the `Match` shape); `MatchEvent` can wait for feature 2.
- **Default competitions.** The six-league default for 1b lives only in the build plan; how it combines with favorites (features 4, 5, 12) is undecided.
- **Competition ids.** The ESPN ids for Botola Pro and the international competitions are not confirmed in the plans; feature 20 verifies them before relying on them.
- **Testing.** The plan lists Vitest and React Testing Library; only Vitest is configured (`npm test`), and UI stays out of unit tests by the coding standards.
