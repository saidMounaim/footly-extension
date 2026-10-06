import { useCallback, useMemo } from 'react'
import { loadFavoriteCompetitions, saveFavoriteCompetitions, toggleId } from '../lib/favorites.ts'
import { useSavedValue } from './useSavedValue.ts'

export interface FavoriteCompetitionsApi {
  /** Followed competition ids, in the order they were followed. */
  ids: string[]
  idSet: ReadonlySet<string>
  isFavorite: (id: string) => boolean
  /** True once saved competitions were read; toggles are ignored until then. */
  ready: boolean
  /**
   * Follows or unfollows immediately; rolls back to the last saved list if saving
   * fails. Resolves whether the change was saved.
   */
  toggle: (id: string) => Promise<boolean>
  /** The saved competitions couldn't be read. */
  loadError: boolean
  /** The last save failed. */
  saveError: boolean
}

const NO_IDS: string[] = []

/** Followed competitions persisted in chrome.storage.local. */
export function useFavoriteCompetitions(): FavoriteCompetitionsApi {
  const { value: ids, ready, toggle, loadError, saveError } = useSavedValue(
    loadFavoriteCompetitions,
    saveFavoriteCompetitions,
    toggleId,
    NO_IDS,
  )
  const idSet = useMemo(() => new Set(ids), [ids])
  const isFavorite = useCallback((id: string) => idSet.has(id), [idSet])

  return { ids, idSet, isFavorite, ready, toggle, loadError, saveError }
}
