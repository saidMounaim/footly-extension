# Chrome Web Store listing: Footly

Material for the Chrome Web Store developer dashboard. Footly is not uploaded or
published automatically. Use `npm run package`, then submit
`release/footly-<version>.zip` yourself (the version comes from `package.json`).

## Store listing

**Name:** Footly

**Short description** (132 characters max):

> Upcoming matches, live scores, and results for your favorite football teams, right in your toolbar.

**Detailed description:**

> Footly is a lightweight football companion for Chrome. Open the popup to see
> your competitions at a glance, each showing its live matches or next kickoff.
> Tap one to browse its upcoming matches and results by day.
>
> **Every competition, your favorites first**
> - Home lists every competition. The Premier League, La Liga, Serie A,
>   Bundesliga, Ligue 1, Champions League, and any you follow come first,
>   showing their live matches or next kickoff.
> - Club competitions include the Europa League, Conference League, Copa
>   Libertadores, Championship, FA Cup, Copa del Rey, and top leagues from the
>   Netherlands, Portugal, Turkey, Scotland, Belgium, the USA, Mexico, Brazil,
>   Argentina, and Saudi Arabia.
> - National teams include the World Cup, Euro, Copa América, Africa Cup of
>   Nations, Nations League, Gold Cup, World Cup qualifiers, and friendlies.
> - Favorites shows your teams' upcoming and recent matches in every
>   competition they play.
> - Footly can suggest your own country's league once, guessed on your device
>   and never sent anywhere.
>
> **A match center that's easy to read**
> - Live score with each team's goal scorers.
> - Summary: a timeline of goals, cards, substitutions, and penalties, split by
>   team.
> - Stats: possession, shots, corners, and fouls as comparison bars.
> - Lineups: starting XIs on a pitch, substitutes with the minute they came on,
>   and player photos where available.
> - Clear upcoming, live, half-time, postponed, cancelled, and full-time states,
>   with a countdown to kickoff.
> - Jump to any day of fixtures or results.
>
> **Notifications**
> - Kick-off, goal, red card, half-time, and full-time alerts for your favorite
>   teams.
> - Choose which alerts you get, or turn them off.
>
> **Light, fast, and private**
> - Light and dark themes that follow your system or your choice.
> - Works offline with today's saved matches and reloads when you reconnect.
> - No account, no tracking, no ads. Your favorites and settings stay on your
>   device.

**Category:** to choose at submission.

**Language:** English

## Graphic assets

- **Store icon:** `public/icons/icon-128.png` (128×128).
- **Screenshots:** you need to capture these (see the guide below).
- **Promotional tiles:** optional; not prepared.

## Screenshot guide

Capture at **1280×800**. Use 3 to 5 screenshots. The popup is 360px wide, so
center it on a plain background that matches the theme.

1. **Home, light theme:** the competition cards, ideally during a live match so
   a card shows "N live".
2. **A competition, dark theme:** the Upcoming/Results switch with a day chip
   selected.
3. **Match detail, Summary tab:** the score card with goal scorers and the
   timeline split by team.
4. **Match detail, Lineups tab:** the starting XIs on the pitch, ideally with a
   substitutes block open.
5. **Favorites or Settings:** your teams' matches, or notification types and
   Privacy & permissions.

Before capturing, follow at least one team and one competition so personalized
sections show. Don't feature club crests prominently in promotional images.

## Privacy practices tab

**Single purpose:**

> Show upcoming football matches, live scores, and results in a compact popup,
> with optional alerts for the user's favorite teams.

**Permission justifications** (match the Settings → Privacy & permissions text):

| Permission | Justification |
|---|---|
| `storage` | Saves your favorites, settings, and recent match data on this device. |
| `alarms` | Wakes Footly around your favorite teams' kickoffs to check for alerts. |
| `notifications` | Shows kick-off, goal, red card, and result alerts. |

There are no host permissions and no content scripts.

**Remote code:** No. All JavaScript is bundled in the package. Footly only
downloads JSON data and images from ESPN.

**Data usage:** Footly does not collect or transmit any user data. In the
disclosure form, leave every data category unchecked, and certify that:

- data isn't sold or transferred to third parties;
- data isn't used for purposes unrelated to the single purpose;
- data isn't used for creditworthiness or lending.

**Privacy policy URL:**
https://github.com/saidMounaim/footly-extension/blob/main/PRIVACY.md

## Submission checklist

- [ ] `PRIVACY.md` is reachable at the URL above. The repository must be public
      and pushed.
- [ ] Run `npm run package` and upload `release/footly-<version>.zip`. Bump the
      version in `package.json` first if this version was uploaded before.
- [ ] Load `dist/` unpacked once and smoke-test Home, a match, Settings, and a
      notification.
- [ ] Paste the listing text and permission justifications above.
- [ ] Upload the 128px icon and 3–5 screenshots.
- [ ] Choose the category, regions, and visibility, then submit for review.
