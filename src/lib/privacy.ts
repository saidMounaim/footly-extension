// Shared by the Settings privacy section and the node-side manifest test, so it
// must stay free of DOM and Chrome types.

/** Why Footly needs each manifest permission, in display order. */
export const PERMISSION_EXPLANATIONS = [
  {
    permission: 'storage',
    label: 'Storage',
    reason: 'Saves your favorites, settings, and recent match data on this device.',
  },
  {
    permission: 'alarms',
    label: 'Alarms',
    reason: "Wakes Footly around your favorite teams' kickoffs to check for alerts.",
  },
  {
    permission: 'notifications',
    label: 'Notifications',
    reason: 'Shows kick-off, goal, red card, and result alerts.',
  },
] as const

/** Shown in Settings and repeated word for word in PRIVACY.md. */
export const COUNTRY_GUESS_NOTE =
  'Your country is guessed on this device from your time zone and language, only to suggest a league; it is never sent anywhere.'

/** The only servers Footly contacts. */
export const CONTACTED_HOSTS = [
  { host: 'site.api.espn.com', purpose: 'Scores, fixtures, and team lists from ESPN.' },
  { host: 'a.espncdn.com', purpose: "Club crests, league logos, and player photos from ESPN's image server." },
] as const
