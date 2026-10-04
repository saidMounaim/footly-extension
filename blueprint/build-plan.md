# Build Plan

## Your features

- [x] 1. **Match Discovery & Upcoming Games** - Show the user's upcoming football matches with competition, teams, kickoff time, and match status using the football data API.

  - [x] 1a. **Extension Shell** - Turn the Vite app into a loadable Manifest V3 Chrome extension popup with `@crxjs/vite-plugin`, Tailwind CSS, and light/dark tokens that follow the system theme. No host permissions or Chrome APIs yet.
  - [x] 1b. **Upcoming Matches** - Fetch ESPN scoreboards for a fixed top-league set (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League) for today plus the next 7 days, normalize into the internal `Team`/`Competition`/`Match` models, and list matches by kickoff with competition, teams, time, and status. Fetch directly; add `host_permissions` for `https://site.api.espn.com/*` only if CORS blocks it. No backend.

- [x] 2. **Match Details & Live Events** - Display live score, goals, yellow/red cards, substitutions, penalties, and other important match events in a clean chronological timeline.

- [x] 3. **Recent Results** - Show completed matches with final scores, key events, and match dates.

- [x] 4. **Favorite Teams** - Let users search for teams and save favorites so Footly can prioritize their matches automatically.

- [x] 5. **Favorite Competitions** - Let users follow leagues and competitions and surface their most relevant matches.

- [x] 6. **Live Match Status** - Clearly distinguish upcoming, live, halftime, postponed, cancelled, and completed matches with compact status indicators.

- [x] 7. **Match Countdown** - Show a live countdown for upcoming matches and automatically switch to live match information when the game starts.

- [x] 8. **Goal & Match Notifications** - Notify users about goals, cards, match starts, halftime, and full-time results for their favorite teams.

  - [x] 8a. **Match Start & Result Notifications** - Add the extension's first service worker with `chrome.alarms` and `notifications`; notify kickoff, halftime, and full-time for favorite teams' matches, checking only around their kickoff times.
  - [x] 8b. **Goal & Card Notifications** - Notify goals and cards in favorite teams' live matches using match summaries, built on 8a's background watcher.

- [x] 9. **Quick Match Search** - Allow users to quickly search for teams, competitions, and matches without leaving the extension.

- [ ] 10. **Match Center** - Provide a focused match view with score, timeline, teams, lineups, statistics, and other available match information.

- [ ] 11. **Smart Data Refresh & Caching** - Refresh live matches intelligently while caching stable data to minimize API requests, battery usage, and extension resource consumption.

- [ ] 12. **Personalized Home** - Build a simple personalized dashboard that prioritizes favorite teams, live matches, and the next important games.

- [ ] 13. **Extension Settings** - Provide lightweight settings for notification preferences, refresh behavior, favorite content, and appearance.

- [ ] 14. **Dark & Light Themes** - Support a polished dark and light interface that follows the user's preferred system or extension theme.

- [ ] 15. **API Error & Offline States** - Handle unavailable data, API errors, rate limits, network failures, and temporary offline states with clear recovery actions.

- [ ] 16. **Performance & Extension Optimization** - Minimize popup load time, memory usage, background activity, API requests, and unnecessary Chrome permissions.

- [ ] 17. **Privacy & Permissions** - Keep permissions minimal, clearly explain why each permission is required, and avoid collecting unnecessary user data.

- [ ] 18. **Chrome Web Store Readiness** - Prepare the extension for production with Manifest V3 compliance, icons, screenshots, metadata, privacy information, and production builds.
