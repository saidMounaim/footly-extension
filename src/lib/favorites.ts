import { COMPETITIONS } from '../api/football.ts'
import type { Match, Team } from '../api/types.ts'
import { safeImageUrl } from './crest.ts'

/** Key in chrome.storage.local holding the favorite teams array. */
export const FAVORITE_TEAMS_KEY = 'favoriteTeams'

/** Key in chrome.storage.local holding the followed competition ids. */
export const FAVORITE_COMPETITIONS_KEY = 'favoriteCompetitions'

const COMPETITION_IDS: ReadonlySet<string> = new Set(COMPETITIONS.map((competition) => competition.id))

/** What is saved per favorite team: enough to list it, crest included, without a network request. */
export type FavoriteTeam = Pick<Team, 'id' | 'name' | 'shortName' | 'logo'>

/** The part of a chrome.storage area used here; injectable for tests. */
export interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
}

/** Thrown when favorites can't be read from or written to storage. */
export class FavoritesStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'FavoritesStorageError'
  }
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

/** Validates an untrusted stored value: invalid entries dropped, duplicate ids keep the first. */
export function parseFavoriteTeams(value: unknown): FavoriteTeam[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const teams: FavoriteTeam[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue
    const { id, name, shortName, logo } = entry as Record<string, unknown>
    if (!nonEmptyString(id) || !nonEmptyString(name) || seen.has(id)) continue
    seen.add(id)
    const safeLogo = safeImageUrl(logo)
    teams.push({
      id,
      name,
      ...(nonEmptyString(shortName) && { shortName }),
      ...(safeLogo && { logo: safeLogo }),
    })
  }
  return teams
}

/** Validates an untrusted stored value: only known competition ids, duplicates keep the first. */
export function parseFavoriteCompetitionIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ids: string[] = []
  for (const entry of value) {
    if (typeof entry === 'string' && COMPETITION_IDS.has(entry) && !ids.includes(entry)) {
      ids.push(entry)
    }
  }
  return ids
}

/** Reads one key, wrapping storage failures in FavoritesStorageError. */
export async function readStoredKey(area: StorageArea, key: string): Promise<unknown> {
  try {
    const stored = await area.get(key)
    return stored?.[key]
  } catch (cause) {
    throw new FavoritesStorageError(`Couldn't read ${key}`, { cause })
  }
}

/** Writes one key, wrapping storage failures in FavoritesStorageError. */
export async function writeStoredKey(area: StorageArea, key: string, value: unknown): Promise<void> {
  try {
    await area.set({ [key]: value })
  } catch (cause) {
    throw new FavoritesStorageError(`Couldn't save ${key}`, { cause })
  }
}

export async function loadFavoriteTeams(area: StorageArea): Promise<FavoriteTeam[]> {
  return parseFavoriteTeams(await readStoredKey(area, FAVORITE_TEAMS_KEY))
}

export async function saveFavoriteTeams(area: StorageArea, teams: FavoriteTeam[]): Promise<void> {
  const value = teams.map(({ id, name, shortName, logo }) => ({
    id,
    name,
    ...(shortName && { shortName }),
    ...(logo && { logo }),
  }))
  await writeStoredKey(area, FAVORITE_TEAMS_KEY, value)
}

export async function loadFavoriteCompetitions(area: StorageArea): Promise<string[]> {
  return parseFavoriteCompetitionIds(await readStoredKey(area, FAVORITE_COMPETITIONS_KEY))
}

export async function saveFavoriteCompetitions(area: StorageArea, ids: string[]): Promise<void> {
  await writeStoredKey(area, FAVORITE_COMPETITIONS_KEY, [...ids])
}

/** Adds the id at the end, or removes it when present. */
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id]
}

/** Adds the team at the end, or removes it when already a favorite. */
export function toggleFavorite(teams: FavoriteTeam[], team: Team | FavoriteTeam): FavoriteTeam[] {
  if (teams.some((favorite) => favorite.id === team.id)) {
    return teams.filter((favorite) => favorite.id !== team.id)
  }
  const { id, name, shortName } = team
  const logo = safeImageUrl(team.logo)
  return [...teams, { id, name, ...(shortName && { shortName }), ...(logo && { logo }) }]
}

/** Splits matches into those involving a favorite team and the rest, keeping order. */
export function splitByFavorites(
  matches: Match[],
  favoriteIds: ReadonlySet<string>,
): { favorites: Match[]; others: Match[] } {
  const favorites: Match[] = []
  const others: Match[] = []
  for (const match of matches) {
    const isFavorite = favoriteIds.has(match.homeTeam.id) || favoriteIds.has(match.awayTeam.id)
    ;(isFavorite ? favorites : others).push(match)
  }
  return { favorites, others }
}

/** Splits matches into those in a followed competition and the rest, keeping order. */
export function splitByCompetitions(
  matches: Match[],
  competitionIds: ReadonlySet<string>,
): { favorites: Match[]; others: Match[] } {
  const favorites: Match[] = []
  const others: Match[] = []
  for (const match of matches) {
    ;(competitionIds.has(match.competition.id) ? favorites : others).push(match)
  }
  return { favorites, others }
}
