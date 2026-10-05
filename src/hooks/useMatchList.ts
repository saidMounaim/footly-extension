import { useCallback, useEffect, useRef, useState } from 'react'
import { COMPETITIONS, getMatchList, type MatchListResult } from '../api/football.ts'
import {
  isSnapshotFromToday,
  loadMatchListSnapshot,
  matchListFreshness,
  saveMatchListSnapshot,
  type MatchListSnapshot,
} from '../lib/cache.ts'
import type { LoadFailure } from '../lib/errors.ts'
import { FavoritesStorageError } from '../lib/favorites.ts'
import { extensionStorage } from './useSavedValue.ts'

export type MatchListState =
  | { status: 'loading' }
  | {
      status: 'success'
      result: MatchListResult
      loadedAt: Date
      /** Set while the list couldn't be updated; `loadedAt` then says how old it is. */
      stale?: { reason: LoadFailure }
    }
  | { status: 'error'; reason: LoadFailure }

const allFailed = (result: MatchListResult) =>
  result.failedCompetitionIds.length === COMPETITIONS.length

const reasonOf = (result: MatchListResult): LoadFailure => result.failureReason ?? 'unexpected'

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
 * the loading state, `refresh` reloads in the background. When every
 * competition fails, today's last list (saved or shown) stays up marked stale.
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
    const markStale = (reason: LoadFailure) =>
      setState((current) => (current.status === 'success' ? { ...current, stale: { reason } } : current))
    try {
      const result = await getMatchList()
      if (started !== generation.current) return
      if (allFailed(result)) {
        markStale(reasonOf(result))
        return
      }
      const loadedAt = new Date()
      setState({ status: 'success', result, loadedAt })
      writeSnapshot(result, loadedAt)
    } catch (error) {
      console.error('Unexpected error while refreshing matches', error)
      if (started === generation.current) markStale('unexpected')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    /** Today's saved list marked stale, otherwise the error state. */
    const fallBack = async (reason: LoadFailure) => {
      const snapshot = await readSnapshot()
      if (cancelled) return
      if (snapshot && isSnapshotFromToday(snapshot, new Date())) {
        setState({
          status: 'success',
          result: snapshot.result,
          loadedAt: snapshot.savedAt,
          stale: { reason },
        })
      } else {
        setState({ status: 'error', reason })
      }
    }
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
      if (allFailed(result)) {
        await fallBack(reasonOf(result))
      } else {
        const loadedAt = new Date()
        setState({ status: 'success', result, loadedAt })
        writeSnapshot(result, loadedAt)
      }
    }
    load().catch((error: unknown) => {
      console.error('Unexpected error while loading matches', error)
      if (!cancelled) void fallBack('unexpected')
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
