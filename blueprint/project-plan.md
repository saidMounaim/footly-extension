# Project Plan

## 1. Problem - What problem are we solving?

Football fans often need to open multiple websites or apps to check upcoming matches, live scores, goals, cards, substitutions, and final results.

Footly is a lightweight Chrome extension that puts the most important football information directly in the browser, without requiring users to open a full football website.

The main goal is **instant football information with minimal interaction**:

> Open Footly → immediately know what is happening in football.

Footly should prioritize the user's favorite teams and competitions while keeping the interface fast, compact, and easy to understand.

The extension should complement the existing Koora Next project rather than becoming another full football website.

### Core principles

- Fast: the popup should load quickly.
- Simple: users should understand the current state immediately.
- Focused: show important football information instead of overwhelming users with data.
- Lightweight: minimize memory usage, CPU usage, background work, and API requests.
- Reliable: gracefully handle delayed or unavailable football data.
- Privacy-first: collect and store only what is necessary.
- API-independent: keep the application data model separate from the external provider's response format.

### Explicit exclusions for the MVP

- No social network.
- No chat.
- No betting functionality.
- No gambling-related features.
- No unnecessary account system.
- No large content feed.
- No AI-generated football analysis.
- No video streaming.
- No scraping of arbitrary football websites.
- No intrusive advertisements in the initial version.

---

## 2. Users - Who is this for?

Footly is primarily designed for:

- Football fans who regularly check scores and fixtures.
- Users who want quick football information while browsing the web.
- Fans following several clubs or competitions.
- Users who want live match notifications without keeping a football website open.
- Developers and general Chrome users who prefer lightweight browser tools.

The initial target user is a football fan who follows a few favorite teams and wants to check their next match or live result in a few seconds.

The product should work for both casual football fans and users who follow football closely, but the UI should remain simple enough for casual users.

---

## 3. Features - What does the MVP need?

- Upcoming matches with kickoff time, competition, and teams.
- Live match scores and match status.
- Goals and important match events.
- Yellow and red cards.
- Recent match results.
- Favorite teams.
- Favorite competitions.
- Local league suggestion: a one-time prompt to follow the user's own country's league, guessed on the device.
- More competitions beyond the six default leagues, grouped on Home as Club competitions and National teams: national-team matches (friendlies, World Cup, World Cup qualifiers for Africa, South America, Europe, CONCACAF, and Asia, AFCON, Copa América, Euro, Nations League, Gold Cup) and more club competitions (other countries' top leagues, Europa League, Conference League, Libertadores, Championship, FA Cup, Copa del Rey), each only where ESPN serves it. Botola Pro is not available from ESPN, and no free source works without a backend, so it is left out. Their matches load only when followed or opened, so the default request count stays the same.
- Favorites tab: your favorite teams' upcoming and recent matches in every competition, plus the team list and team search; following competitions happens on Home.
- Match countdown.
- Quick team and match search.
- Match detail view, with basic team statistics and starting lineups when the provider supplies them.
- Intelligent API refresh and caching.
- Basic goal and match notifications.
- Dark and light themes.
- Settings for preferences and notifications.
- Clear loading, empty, offline, and API error states.

The MVP should focus on the smallest useful football experience before expanding into advanced statistics (such as player-level statistics and extended history) and additional match information.

---

## 4. Data - What are we storing?

### Local user preferences

Footly should primarily use Chrome's local storage for user preferences.

Potential stored data:

- Favorite team IDs.
- Favorite competition IDs.
- Notification preferences.
- Theme preference.
- Refresh preferences if required.
- Last selected team or competition.
- Lightweight cached football data where appropriate.

### Football data

Football data comes from the configured football data provider, initially ESPN's available API endpoints.

Footly should normalize provider responses into internal application models such as:

```ts
type Team = {
  id: string;
  name: string;
  shortName?: string;
  logo?: string;
};

type Competition = {
  id: string;
  name: string;
  logo?: string;
};

type Match = {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  competition: Competition;
  startTime: string;
  status: MatchStatus;
  score?: {
    home: number;
    away: number;
  };
  events: MatchEvent[];
  stats?: {
    home: TeamMatchStats;
    away: TeamMatchStats;
  };
  lineups?: {
    home: Lineup;
    away: Lineup;
  };
};

// Basic team statistics; each value is optional because providers omit some.
type TeamMatchStats = {
  possession?: number; // percent, 0-100
  shots?: number;
  shotsOnTarget?: number;
  corners?: number;
  fouls?: number;
};

type Lineup = {
  formation?: string; // e.g. "4-2-3-1"
  starters: LineupPlayer[];
  substitutes: LineupPlayer[];
};

type LineupPlayer = {
  id: string;
  name: string;
  jersey?: string;
  position?: string; // short label, e.g. "G", "CD-L"
};
```

`stats` and `lineups` come from the match summary and are missing when the provider does not supply them; the match detail view hides those sections instead of showing empty values.

The exact data model can evolve as more football features are implemented.

### Data storage principles

- Do not permanently store unnecessary football data locally.
- Do not store full API responses when normalized data is sufficient.
- Do not store private user information unless required.
- Prefer local storage for user preferences.
- Cache short-lived football data only when it improves performance or reduces API requests.

---

## 5. Tech - What stack are we using?

### Chrome Extension

- TypeScript
- React
- Vite
- Manifest V3
- Tailwind CSS
- Chrome Extension APIs
- `@crxjs/vite-plugin`

### UI

- React components.
- Tailwind CSS.
- Lightweight custom components.
- Optional shadcn/ui components where they improve the interface without unnecessarily increasing complexity.
- lucide-react for one consistent line-icon set; only imported icons are bundled.

The extension should avoid a large UI framework when a simple component can do the job.

### Football data

Initial provider:

- ESPN API / available ESPN football endpoints.

A dedicated data-access layer should isolate ESPN-specific implementation.

Example:

```text
src/
├── api/
│   ├── football.ts
│   ├── espn.ts
│   └── types.ts
│
├── components/
├── features/
├── hooks/
├── lib/
└── popup/
```

React components should not directly understand ESPN's raw response format.

Instead:

```text
ESPN response
      ↓
ESPN adapter
      ↓
Normalized Footly models
      ↓
React UI
```

This makes it possible to change providers later without rewriting the entire extension.

### Chrome APIs

Potential APIs:

- `chrome.storage` for local preferences.
- `chrome.alarms` for scheduled background checks.
- `chrome.notifications` for match notifications.
- `chrome.runtime` for communication between popup and service worker.

Use the minimum permissions required by each feature.

### Backend

The initial MVP does not require a dedicated backend if the ESPN data can safely and reliably be consumed from the extension.

If API restrictions, caching, rate limits, CORS, reliability, or notification requirements make a backend necessary, Footly can use the existing Koora Next infrastructure.

Potential backend stack:

- Next.js
- TypeScript
- Route Handlers/API endpoints
- PostgreSQL + Prisma only if persistent server-side data becomes necessary.

The backend should not be introduced simply for the sake of having one.

### Testing

Potential testing stack:

- Vitest for utility and data transformation tests.
- React Testing Library for UI behavior.
- Chrome extension manual testing for permissions, popup behavior, service workers, and notifications.

---

## 6. Monetize - How will this make money?

The first version should be free and focused on adoption.

Potential future monetization:

### Free

- Upcoming matches.
- Recent results.
- Favorite teams.
- Basic live scores.
- Basic match events.
- Basic notifications.

### Footly Plus

Potential premium features:

- More advanced notifications.
- Advanced statistics.
- More personalization.
- Multiple notification profiles.
- Extended match history.
- Advanced competition tracking.
- Additional football data providers.

Monetization should not make the core extension frustrating to use.

Avoid intrusive ads, aggressive upgrade prompts, or blocking basic score information behind a paywall.

The monetization strategy can be finalized after real user feedback and usage data.

---

## 7. UI/UX - How should this look and feel?

Footly should feel like a **modern, compact football companion**, not a miniature football website.

### Design principles

- Clean.
- Fast.
- Compact.
- Football-focused.
- Easy to scan.
- Minimal navigation.
- Strong visual hierarchy.
- Clear live status.
- Excellent dark mode.
- Responsive within the Chrome popup dimensions.

### Redesign

- A full visual redesign makes every screen modern, cleaner, and easier to use. It is designed directly in the feature spec, without a mockup stage.

### Crests and icons

- Club crests and competition logos from the data provider appear in match rows, the next-match card, match detail, competition headings, and favorites.
- Crests are decorative because names stay visible, sit on a neutral backdrop so they read in both themes, and fall back to the team's initials when missing or broken.
- Icons come from one consistent line-icon set instead of emoji, always with a text label or accessible name.

### Popup structure

Current direction (features 23 and 25): Home lists every competition card. The default leagues and followed ones come first, each showing live games or the next kickoff; the rest follow, grouped as Club competitions and National teams. Opening a competition shows its upcoming matches and results with day chips and a Follow button. Favorites shows your teams' matches. The original sketch below is kept for history.

The default popup should prioritize the most relevant information:

```text
┌──────────────────────────────┐
│ ⚽ Footly              ⚙     │
├──────────────────────────────┤
│                              │
│ YOUR NEXT MATCH              │
│                              │
│        Barcelona             │
│             vs               │
│        Real Madrid           │
│                              │
│       Tomorrow · 20:00       │
│                              │
├──────────────────────────────┤
│ 🔴 LIVE                      │
│                              │
│ Liverpool        2           │
│ Arsenal          1           │
│                              │
│ ⚽ 23' Salah                 │
│ 🟨 71' Rice                 │
│                              │
├──────────────────────────────┤
│ Home    Favorites    Search  │
└──────────────────────────────┘
```

### Match status

Use clear visual states:

- Upcoming → neutral status.
- Live → prominent live indicator.
- Halftime → clear halftime label.
- Finished → final score.
- Postponed → warning state.
- Cancelled → clear cancelled state.

Avoid relying only on color. Status should also use text/icons so it remains understandable in different themes and accessibility contexts.

### Match events

Events should be displayed chronologically:

```text
23'   ⚽ Salah
45+2' 🟨 Rice
61'   🔄 Player A → Player B
78'   ⚽ Nunez
90'   🟥 Player C
```

### Navigation

Keep navigation minimal:

- Home
- Favorites
- Search
- Settings

A user should be able to reach the most important information within one or two clicks.

### Loading

Use lightweight skeletons instead of blank screens.

### Empty states

Example:

> No favorite teams yet.

> Search for a team to start following their matches.

### Error states

Example:

> Couldn't load match data.

> Check your connection and try again.

Include a simple retry action.

### Accessibility

- Keyboard-friendly interactions where applicable.
- Sufficient text contrast.
- Meaningful labels for icons.
- Avoid color-only status indicators.
- Respect system theme where possible.
- Keep text readable at the small popup size.

---

## 8. Deployment - Where and how will this ship?

### Chrome Extension

Footly will be distributed through the **Chrome Web Store**.

The production build will generate the extension bundle that can be uploaded to the Chrome Web Store.

Expected build command:

```bash
npm run build
```

Vite will generate the production extension files in the configured output directory, typically:

```text
dist/
```

The extension should use:

```text
Manifest V3
```

### Development

Run locally with the Vite development workflow and load the generated extension through:

```text
chrome://extensions
```

using Developer Mode and "Load unpacked" when appropriate.

### Backend

The MVP should not require a backend unless technically necessary.

If a backend is introduced, the preferred stack is:

- Next.js
- Vercel or another suitable serverless platform.
- Environment variables for API configuration.
- Optional PostgreSQL/Prisma only when server-side persistence becomes necessary.

### Environment variables

If a backend is used, sensitive configuration should be stored as environment variables rather than committed to the repository.

Potential variables:

```text
FOOTBALL_API_BASE_URL
FOOTBALL_API_KEY
```

Only expose variables to the extension when they are explicitly safe to expose.

Never put private API credentials directly into the extension bundle.

### Storage

Initial storage:

```text
Chrome local storage
```

No database is required for the MVP.

### Workers / background processing

The extension may use a Manifest V3 service worker for:

- scheduled checks,
- notification processing,
- background API refresh,
- extension lifecycle events.

The service worker should remain event-driven and should not continuously run polling loops.

### Performance constraints

Avoid:

- aggressive polling.
- unnecessary API requests.
- large JavaScript bundles.
- content scripts injected into every website.
- continuous DOM observers.
- unnecessary background processing.

The extension should not need access to the contents of normal webpages to provide football scores.

### Permissions

Request the minimum permissions necessary.

Avoid broad permissions such as unrestricted access to every website unless a future feature genuinely requires them.

The initial extension should ideally operate without content scripts or host permissions.

---

## 9. Usage model and constraints

Footly is an internet-facing Chrome extension intended for individual users.

### Expected scale

The initial MVP is expected to support a small user base, with architecture that can later scale if adoption increases.

No enterprise requirements are assumed.

### User model

- Individual users.
- No required account for the MVP.
- Local-first preferences.
- No multi-tenant server database initially.

### API constraints

Footly depends on the availability and behavior of its football data provider.

The application must handle:

- API rate limits.
- Missing match data.
- Delayed updates.
- Cancelled matches.
- Postponed matches.
- Incomplete event information.
- Network failures.
- Provider outages.
- Unexpected provider response changes.

The UI should never assume that every match has every possible event or statistic.

### Real-time expectations

"Live" does not necessarily mean millisecond-level real-time data.

The extension should prioritize:

- reasonable update frequency,
- API efficiency,
- reliability,
- battery/resource usage.

Refresh intervals should be configurable internally and optimized based on match state.

For example:

```text
Upcoming match
→ infrequent refresh

Live match
→ more frequent refresh

Finished match
→ stop frequent polling
```

### Security

- Do not expose private API credentials inside the extension.
- Use HTTPS for network requests.
- Request minimal Chrome permissions.
- Validate and safely handle external API data.
- Do not execute arbitrary HTML or JavaScript received from the football API.
- Avoid unnecessary collection of user information.

### Privacy

The MVP should not require an account.

Favorite teams, competitions, theme settings, and notification preferences should remain local where possible.

Country is guessed on the device from time zone and language; it is never sent anywhere.

Do not collect browsing history.

Do not inspect the contents of websites.

Do not inject scripts into arbitrary websites.

Do not sell user data.

### Explicit non-requirements

The MVP does not require:

- User accounts.
- Social profiles.
- Chat.
- Football betting.
- Gambling features.
- Video streaming.
- User-generated content.
- Full editorial football news.
- AI-generated match predictions.
- Cryptocurrency or blockchain functionality.
- Background access to every website.
- A permanent server connection.
- A large database.

The product should remain a **small, fast, privacy-conscious football companion for Chrome**.
