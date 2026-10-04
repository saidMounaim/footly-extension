import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Team } from '../api/types.ts'
import {
  FavoritesStorageError,
  loadFavoriteTeams,
  saveFavoriteTeams,
  toggleFavorite,
  type FavoriteTeam,
  type StorageArea,
} from '../lib/favorites.ts'

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

function reportUnexpected(error: unknown) {
  if (!(error instanceof FavoritesStorageError)) {
    console.error('Unexpected error while accessing favorites', error)
  }
}

/** chrome.storage.local when running as an extension; undefined on a plain page. */
function extensionStorage(): StorageArea | undefined {
  return typeof chrome === 'undefined' ? undefined : chrome.storage?.local
}

function unavailable(): Promise<never> {
  return Promise.reject(new FavoritesStorageError('chrome.storage is not available'))
}

/** Favorite teams persisted in chrome.storage.local. */
export function useFavoriteTeams(): FavoriteTeamsApi {
  const [teams, setTeams] = useState<FavoriteTeam[]>([])
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const latest = useRef<FavoriteTeam[]>([])
  const saved = useRef<FavoriteTeam[]>([])
  const readyRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const storage = extensionStorage()
    ;(storage ? loadFavoriteTeams(storage) : unavailable()).then(
      (loaded) => {
        if (cancelled) return
        latest.current = loaded
        saved.current = loaded
        readyRef.current = true
        setTeams(loaded)
        setReady(true)
      },
      (failure: unknown) => {
        reportUnexpected(failure)
        if (!cancelled) setLoadError(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const toggle = useCallback(
    (team: Team | FavoriteTeam) => {
      if (!readyRef.current) return
      const next = toggleFavorite(latest.current, team)
      latest.current = next
      setTeams(next)
      const storage = extensionStorage()
      ;(storage ? saveFavoriteTeams(storage, next) : unavailable()).then(
        () => {
          saved.current = next
          setSaveError(false)
        },
        (failure: unknown) => {
          reportUnexpected(failure)
          // Return to what is actually stored, unless a newer change is still in flight.
          if (latest.current === next) {
            latest.current = saved.current
            setTeams(saved.current)
          }
          setSaveError(true)
        },
      )
    },
    [],
  )

  const favoriteIds = useMemo(() => new Set(teams.map((team) => team.id)), [teams])
  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds])

  return { teams, favoriteIds, isFavorite, ready, toggle, loadError, saveError }
}
