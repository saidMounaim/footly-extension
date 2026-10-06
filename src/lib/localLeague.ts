import { COMPETITIONS } from '../api/football.ts'
import { readStoredKey, writeStoredKey, type StorageArea } from './favorites.ts'

/** Key in chrome.storage.local for the user's answer to the local league card. */
export const LOCAL_LEAGUE_SUGGESTION_KEY = 'localLeagueSuggestion'

export type LocalLeagueAnswer = 'accepted' | 'dismissed'

/**
 * Time zones that identify one country well enough to suggest its football.
 * Europe/London is left out on purpose: it can't tell Scotland from England.
 */
const TIME_ZONE_COUNTRY: Readonly<Record<string, string>> = {
  'Europe/Amsterdam': 'NL',
  'Europe/Lisbon': 'PT',
  'Atlantic/Madeira': 'PT',
  'Atlantic/Azores': 'PT',
  'Europe/Istanbul': 'TR',
  'Europe/Brussels': 'BE',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Phoenix': 'US',
  'America/Los_Angeles': 'US',
  'America/Anchorage': 'US',
  'Pacific/Honolulu': 'US',
  'America/Mexico_City': 'MX',
  'America/Monterrey': 'MX',
  'America/Merida': 'MX',
  'America/Cancun': 'MX',
  'America/Tijuana': 'MX',
  'America/Sao_Paulo': 'BR',
  'America/Bahia': 'BR',
  'America/Fortaleza': 'BR',
  'America/Recife': 'BR',
  'America/Belem': 'BR',
  'America/Manaus': 'BR',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Buenos_Aires': 'AR',
  'America/Argentina/Cordoba': 'AR',
  'Asia/Riyadh': 'SA',
  'Africa/Casablanca': 'MA',
  'Africa/El_Aaiun': 'MA',
  'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN',
  'Africa/Dakar': 'SN',
  'Africa/Lagos': 'NG',
  'Africa/Abidjan': 'CI',
  'Africa/Accra': 'GH',
  'Africa/Douala': 'CM',
  'Africa/Cairo': 'EG',
}

/** Each country's top league, only where ESPN serves it. */
const COUNTRY_LEAGUE: Readonly<Record<string, string>> = {
  NL: 'ned.1',
  PT: 'por.1',
  TR: 'tur.1',
  BE: 'bel.1',
  US: 'usa.1',
  MX: 'mex.1',
  BR: 'bra.1',
  AR: 'arg.1',
  SA: 'ksa.1',
}

/** Countries whose league ESPN doesn't serve, offered their national-team competitions instead. */
const NATIONAL_TEAM_COMPETITIONS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  ['MA', 'DZ', 'TN', 'SN', 'NG', 'CI', 'GH', 'CM', 'EG'].map((country) => [
    country,
    ['caf.nations', 'fifa.worldq.caf'],
  ]),
)

const COUNTRY_NAME: Readonly<Record<string, string>> = {
  MA: 'Morocco',
  DZ: 'Algeria',
  TN: 'Tunisia',
  SN: 'Senegal',
  NG: 'Nigeria',
  CI: "Côte d'Ivoire",
  GH: 'Ghana',
  CM: 'Cameroon',
  EG: 'Egypt',
}

const COMPETITION_NAME: ReadonlyMap<string, string> = new Map(
  COMPETITIONS.map((competition) => [competition.id, competition.name]),
)

/** Zones that carry no location, so the browser language is the only hint. */
function isLocationless(timeZone: string): boolean {
  return timeZone === 'UTC' || timeZone === 'GMT' || timeZone.startsWith('Etc/')
}

/**
 * The user's likely country (ISO 3166-1 alpha-2), from the time zone when it
 * names a place, otherwise from the region of the first browser language that
 * has one; null when unknown. A place we have no table entry for gives no guess,
 * since `en-US` is common everywhere. Computed on the device and never stored or sent.
 */
export function guessCountry({
  timeZone,
  languages,
}: {
  timeZone: string | undefined
  languages: readonly string[]
}): string | null {
  if (timeZone && !isLocationless(timeZone)) return TIME_ZONE_COUNTRY[timeZone] ?? null
  for (const language of languages) {
    const region = language.split('-')[1]
    if (region && /^[A-Za-z]{2}$/.test(region)) return region.toUpperCase()
  }
  return null
}

export interface LocalLeagueSuggestion {
  country: string
  /** Competitions to follow, none of them already followed. */
  competitionIds: string[]
  /** Static card title. */
  label: string
}

/** What to offer this country, leaving out what is already followed; null when nothing is left. */
export function suggestionFor(
  country: string | null,
  followedIds: readonly string[],
): LocalLeagueSuggestion | null {
  if (!country) return null
  const followed = new Set(followedIds)
  const league = COUNTRY_LEAGUE[country]
  if (league && COMPETITION_NAME.has(league)) {
    if (followed.has(league)) return null
    return { country, competitionIds: [league], label: `Follow ${COMPETITION_NAME.get(league)}?` }
  }
  const national = NATIONAL_TEAM_COMPETITIONS[country]
  const name = COUNTRY_NAME[country]
  if (!national || !name) return null
  const remaining = national.filter((id) => COMPETITION_NAME.has(id) && !followed.has(id))
  if (remaining.length === 0) return null
  return { country, competitionIds: remaining, label: `Follow ${name}'s national-team matches?` }
}

/** Competition names for the card's detail line. */
export function competitionNames(ids: readonly string[]): string[] {
  return ids.flatMap((id) => COMPETITION_NAME.get(id) ?? [])
}

/** Validates the untrusted stored value; anything else means not answered yet. */
export function parseLocalLeagueSuggestion(value: unknown): LocalLeagueAnswer | null {
  if (typeof value !== 'object' || value === null) return null
  const { status } = value as Record<string, unknown>
  return status === 'accepted' || status === 'dismissed' ? status : null
}

export async function loadLocalLeagueAnswer(area: StorageArea): Promise<LocalLeagueAnswer | null> {
  return parseLocalLeagueSuggestion(await readStoredKey(area, LOCAL_LEAGUE_SUGGESTION_KEY))
}

export async function saveLocalLeagueAnswer(
  area: StorageArea,
  answer: LocalLeagueAnswer | null,
): Promise<void> {
  await writeStoredKey(area, LOCAL_LEAGUE_SUGGESTION_KEY, answer === null ? null : { status: answer })
}
