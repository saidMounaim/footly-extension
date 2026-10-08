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

- [x] 10. **Match Center** - Provide a focused match view with score, timeline, teams, lineups, statistics, and other available match information.

- [x] 11. **Smart Data Refresh & Caching** - Refresh live matches intelligently while caching stable data to minimize API requests, battery usage, and extension resource consumption.

- [x] 12. **Personalized Home** - Build a simple personalized dashboard that prioritizes favorite teams, live matches, and the next important games.

- [x] 13. **Extension Settings** - Provide lightweight settings for notification preferences, refresh behavior, favorite content, and appearance.

- [x] 14. **Dark & Light Themes** - Support a polished dark and light interface that follows the user's preferred system or extension theme.

- [x] 15. **API Error & Offline States** - Handle unavailable data, API errors, rate limits, network failures, and temporary offline states with clear recovery actions.

- [x] 19. **UI Refresh: Icons & Team Crests** - Replace emoji with one consistent icon set, add icons to the bottom tabs, and show club crests and competition logos in match rows, the next-match card, match detail, competition headings, and favorites.

- [x] 16. **Performance & Extension Optimization** - Minimize popup load time, memory usage, background activity, API requests, and unnecessary Chrome permissions.

- [x] 17. **Privacy & Permissions** - Keep permissions minimal, clearly explain why each permission is required, and avoid collecting unnecessary user data.

- [x] 20. **More Competitions** - Add Botola Pro and international national-team matches (friendlies, World Cup qualifiers, AFCON), followable in Favorites and searchable, loading only the default leagues plus the competitions you follow.

- [x] 21. **Modern UI Redesign** - Rework the popup's layout and visual style directly, without a mockup stage, so every screen is modern, cleaner, and easier to use.

- [x] 18. **Chrome Web Store Readiness** - Prepare the extension for production with Manifest V3 compliance, icons, screenshots, metadata, privacy information, and production builds.

- [x] 22. **Local League Suggestion** - On first open, guess the user's country from the browser time zone and language (on the device, no new permission) and offer a one-time prompt to follow that country's league when ESPN covers it; otherwise suggest the national-team competitions where relevant.

- [x] 23. **Competition Browser on Home** - Home lists competition cards (the default leagues plus followed ones) instead of games; opening a competition shows its upcoming matches and results with day chips.

- [x] 24. **More Competitions 2** - Add more club and national-team competitions (World Cup, Copa América, Euro, Nations League, Gold Cup, World Cup qualifiers for South America, Europe, CONCACAF, and Asia; Europa League, Conference League, Libertadores, Championship, FA Cup, Copa del Rey), each confirmed against ESPN, and group the followable extras in Favorites as Clubs and National teams so the longer list stays easy to scan.

- [x] 25. **Favorites & Home Reorganize** - Favorites becomes your teams' matches; every competition moves to Home.

  - [x] 25a. **Your Teams' Matches in Favorites** - Favorites shows each favorite team's upcoming and recent matches in every competition they play, from that team's ESPN schedule (one request per favorite team, only while the tab is open), instead of the competition follow lists. The "Your teams" list and team search stay.
  - [x] 25b. **All Competitions on Home** - Home lists every competition: the defaults and followed ones first with live status as today, then the rest grouped as Club competitions and National teams, loading their matches only when opened. Follow and unfollow move into the competition screen.

- [x] 26. **Match Center Refresh** - Give the match detail a modern score header (larger crests and score, a status pill, and each team's goal scorers under the score), draw the starting lineups on a pitch from each player's position with the current list kept as the fallback, and replace the flag-style goal icon with a football.
