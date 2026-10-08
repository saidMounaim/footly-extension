# Footly Privacy Policy

Footly is a Chrome extension that shows football fixtures, live scores, and
results. Footly has no account and collects nothing about you. Your favorites and
settings stay on this device.

Your country is guessed on this device from your time zone and language, only to suggest a league; it is never sent anywhere.

## What Footly does not do

- No accounts, sign-in, analytics, tracking, or advertising.
- No access to your browsing history or to the pages you visit. Footly has no
  host permissions and injects no scripts into websites.
- No selling or sharing of data. Footly has no server of its own, so nothing
  about you is sent to the developer.

## Permissions

| Permission | Why Footly needs it |
|---|---|
| Storage | Saves your favorites, settings, and recent match data on this device. |
| Alarms | Wakes Footly around your favorite teams' kickoffs to check for alerts. |
| Notifications | Shows kick-off, goal, red card, and result alerts. |

## What is stored on this device

Everything below lives in Chrome's local extension storage on your computer. It
never leaves the device.

| Key | Contents | Why |
|---|---|---|
| `favoriteTeams` | Team IDs, names, and crest addresses you chose | Prioritize and alert on your teams |
| `favoriteCompetitions` | Competition IDs you follow | Surface their matches |
| `notificationsEnabled` | On or off | The match notifications switch |
| `notificationTypes` | Match updates, goals, and red cards on or off | Which alerts you get |
| `liveRefreshMinutes` | 1, 2, or 5 | How often live scores refresh in the popup |
| `theme` | System, light, or dark | Your chosen appearance |
| `matchListCache` | Today's fixtures and recent results, with save time | Open the popup instantly and make fewer requests |
| `teamCatalogCache` | Clubs in the supported competitions, with save time | Team search without reloading every time |
| `watchedMatches` | Your teams' upcoming matches and their last status | Send each alert once |
| `localLeagueSuggestion` | Whether you accepted or dismissed the local league card (no country) | Show the card only once |

The popup also keeps a copy of your theme choice under `footly-theme` in its own
local storage, so it opens in the right theme without a flash.

## Servers Footly contacts

| Server | Purpose |
|---|---|
| `site.api.espn.com` | Scores, fixtures, and team lists from ESPN. |
| `a.espncdn.com` | Club crests, league logos, and player photos from ESPN's image server. |

Like any web request, these reveal your IP address to ESPN. Footly sends nothing
else about you: no identifiers, no favorites, and no referrer. ESPN's own privacy
policy applies to those requests.

## Erasing your data

- In Footly, open **Settings → Privacy & permissions → Erase Footly data**. This
  removes your favorites, settings, and saved matches from this device, and stops
  background checks.
- Removing the extension from Chrome also deletes everything it stored.

## Contact

Questions or concerns: open an issue at
https://github.com/saidMounaim/footly-extension/issues.
