import { useCallback, useMemo } from 'react'
import type { Team } from '../api/types.ts'
import {
  loadFavoriteTeams,
  saveFavoriteTeams,
  toggleFavorite,
  type FavoriteTeam,
} from '../lib/favorites.ts'
import { useSavedList } from './useSavedList.ts'

export interface FavoriteTeamsApi {
  teams: FavoriteTeam[]
  favoriteIds: ReadonlySet<string>
  isFavorite: (id: string) => boolean
  /** True once saved favorites were read; toggles are ignored until then. */
  ready: boolean
  /** Adds or removes the team immediately; rolls back to the last saved list if saving fails. */
  toggle: (team: Team | FavoriteTeam) => void
  /** The saved favorites couldn't be read. */
  loadError: boolean
  /** The last save failed. */
  saveError: boolean
}

/** Favorite teams persisted in chrome.storage.local. */
export function useFavoriteTeams(): FavoriteTeamsApi {
  const { items: teams, ready, toggle, loadError, saveError } = useSavedList(
    loadFavoriteTeams,
    saveFavoriteTeams,
    toggleFavorite,
  )
  const favoriteIds = useMemo(() => new Set(teams.map((team) => team.id)), [teams])
  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds])

  return { teams, favoriteIds, isFavorite, ready, toggle, loadError, saveError }
}
