# Chrome Web Store listing: Footly 1.0.0

Material for the Chrome Web Store developer dashboard. Footly is not uploaded or
published automatically. Use `npm run package`, then submit
`release/footly-1.0.0.zip` yourself.

## Store listing

**Name:** Footly

**Short description** (132 characters max):

> Upcoming matches, live scores, and results for your favorite football teams, right in your toolbar.

**Detailed description:**

> Footly is a lightweight football companion for Chrome. Open the popup and see
> what matters right now: live matches, your team's next match with a countdown,
> and the next games coming up.
>
> **Follow what you care about**
> - Save favorite teams and follow competitions; their matches come first.
> - Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and the Champions
>   League by default.
> - Follow International Friendlies, World Cup Qualifying (Africa), and the
>   Africa Cup of Nations to add national-team matches.
>
> **Live and clear**
> - Live scores with goals, cards, substitutions, and penalties in order.
> - A match view with lineups and basic team statistics when available.
> - Clear upcoming, live, half-time, postponed, cancelled, and full-time states.
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

1. **Home, light theme,** during a live match: the live card and "Your next
   match".
2. **Upcoming, dark theme,** with a day chip selected and favorite teams listed
   first.
3. **Match detail:** score card, timeline, and lineups.
4. **Favorites:** Leagues and More competitions, with a few followed.
5. **Settings:** notification types and Privacy & permissions.

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
- [ ] Run `npm run package` and upload `release/footly-1.0.0.zip`.
- [ ] Load `dist/` unpacked once and smoke-test Home, a match, Settings, and a
      notification.
- [ ] Paste the listing text and permission justifications above.
- [ ] Upload the 128px icon and 3–5 screenshots.
- [ ] Choose the category, regions, and visibility, then submit for review.
