import type { Match, Team } from '../api/types.ts'

/** Key in chrome.storage.local holding the favorite teams array. */
export const FAVORITE_TEAMS_KEY = 'favoriteTeams'

/** What is saved per favorite team: enough to list it without a network request. */
export type FavoriteTeam = Pick<Team, 'id' | 'name' | 'shortName'>

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
    const { id, name, shortName } = entry as Record<string, unknown>
    if (!nonEmptyString(id) || !nonEmptyString(name) || seen.has(id)) continue
    seen.add(id)
    teams.push({ id, name, ...(nonEmptyString(shortName) && { shortName }) })
  }
  return teams
}

export async function loadFavoriteTeams(area: StorageArea): Promise<FavoriteTeam[]> {
  let stored: Record<string, unknown>
  try {
    stored = await area.get(FAVORITE_TEAMS_KEY)
  } catch (cause) {
    throw new FavoritesStorageError("Couldn't read favorite teams", { cause })
  }
  return parseFavoriteTeams(stored?.[FAVORITE_TEAMS_KEY])
}

export async function saveFavoriteTeams(area: StorageArea, teams: FavoriteTeam[]): Promise<void> {
  const value = teams.map(({ id, name, shortName }) => ({
    id,
    name,
    ...(shortName && { shortName }),
  }))
  try {
    await area.set({ [FAVORITE_TEAMS_KEY]: value })
  } catch (cause) {
    throw new FavoritesStorageError("Couldn't save favorite teams", { cause })
  }
}

/** Adds the team at the end, or removes it when already a favorite. */
export function toggleFavorite(teams: FavoriteTeam[], team: Team | FavoriteTeam): FavoriteTeam[] {
  if (teams.some((favorite) => favorite.id === team.id)) {
    return teams.filter((favorite) => favorite.id !== team.id)
  }
  const { id, name, shortName } = team
  return [...teams, { id, name, ...(shortName && { shortName }) }]
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
