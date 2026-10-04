import { useCallback, useEffect, useRef, useState } from 'react'
import { COMPETITIONS, getMatchList, type MatchListResult } from '../api/football.ts'
import {
  loadMatchListSnapshot,
  matchListFreshness,
  saveMatchListSnapshot,
  type MatchListSnapshot,
} from '../lib/cache.ts'
import { FavoritesStorageError } from '../lib/favorites.ts'
import { extensionStorage } from './useSavedValue.ts'

export type MatchListState =
  | { status: 'loading' }
  | { status: 'success'; result: MatchListResult; loadedAt: Date }
  | { status: 'error' }

function reportUnexpectedCacheError(error: unknown) {
  if (!(error instanceof FavoritesStorageError)) {
    console.error('Unexpected error while accessing the match cache', error)
  }
}

/** The saved snapshot, or null when there is none or it can't be read. */
async function readSnapshot(): Promise<MatchListSnapshot | null> {
  const storage = extensionStorage()
  if (!storage) return null
  try {
    return await loadMatchListSnapshot(storage)
  } catch (error) {
    reportUnexpectedCacheError(error)
    return null
  }
}

function writeSnapshot(result: MatchListResult, savedAt: Date) {
  const storage = extensionStorage()
  if (!storage) return
  saveMatchListSnapshot(storage, result, savedAt).catch(reportUnexpectedCacheError)
}

/**
 * Loads upcoming matches and recent results once, starting from the saved
 * snapshot when it is still usable; `retry` reloads both from the network with
 * the loading state, `refresh` reloads in the background and keeps the current
 * list when every competition fails.
 */
export function useMatchList(): {
  state: MatchListState
  retry: () => void
  refresh: () => Promise<void>
} {
  const [state, setState] = useState<MatchListState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  // Bumped by every retry and on unmount so older background responses are dropped.
  const generation = useRef(0)

  const refresh = useCallback(async () => {
    const started = generation.current
    try {
      const result = await getMatchList()
      if (started !== generation.current) return
      if (result.failedCompetitionIds.length === COMPETITIONS.length) return
      const loadedAt = new Date()
      setState({ status: 'success', result, loadedAt })
      writeSnapshot(result, loadedAt)
    } catch (error) {
      console.error('Unexpected error while refreshing matches', error)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      // Only the first load may come from the cache; a retry always fetches.
      if (attempt === 0) {
        const snapshot = await readSnapshot()
        if (cancelled) return
        const freshness = snapshot ? matchListFreshness(snapshot, new Date()) : 'unusable'
        if (snapshot && freshness !== 'unusable') {
          setState({ status: 'success', result: snapshot.result, loadedAt: snapshot.savedAt })
          if (freshness === 'stale') void refresh()
          return
        }
      }
      const result = await getMatchList()
      if (cancelled) return
      if (result.failedCompetitionIds.length === COMPETITIONS.length) {
        setState({ status: 'error' })
      } else {
        const loadedAt = new Date()
        setState({ status: 'success', result, loadedAt })
        writeSnapshot(result, loadedAt)
      }
    }
    load().catch((error: unknown) => {
      console.error('Unexpected error while loading matches', error)
      if (!cancelled) setState({ status: 'error' })
    })
    return () => {
      cancelled = true
    }
  }, [attempt, refresh])

  useEffect(
    () => () => {
      generation.current += 1
    },
    [],
  )

  const retry = useCallback(() => {
    generation.current += 1
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry, refresh }
}
