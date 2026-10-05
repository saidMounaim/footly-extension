import { useCallback, useEffect, useState } from 'react'
import { COMPETITIONS, getTeamCatalog, type TeamCatalogResult } from '../api/football.ts'
import { isTeamCatalogFresh, loadTeamCatalogSnapshot, saveTeamCatalogSnapshot } from '../lib/cache.ts'
import type { LoadFailure } from '../lib/errors.ts'
import { FavoritesStorageError } from '../lib/favorites.ts'
import { extensionStorage } from './useSavedValue.ts'

export type TeamCatalogState =
  | { status: 'loading' }
  | { status: 'success'; result: TeamCatalogResult }
  | { status: 'error'; reason: LoadFailure }

type Settled = { attempt: number } & (
  | { status: 'success'; result: TeamCatalogResult }
  | { status: 'error'; reason: LoadFailure }
)

function reportUnexpectedCacheError(error: unknown) {
  if (!(error instanceof FavoritesStorageError)) {
    console.error('Unexpected error while accessing the team cache', error)
  }
}

/** The saved catalog while it is fresh, otherwise null (also when it can't be read). */
async function readFreshCatalog(): Promise<TeamCatalogResult | null> {
  const storage = extensionStorage()
  if (!storage) return null
  try {
    const snapshot = await loadTeamCatalogSnapshot(storage)
    if (!snapshot || !isTeamCatalogFresh(snapshot, new Date())) return null
    return { teams: snapshot.teams, failedCompetitionIds: [] }
  } catch (error) {
    reportUnexpectedCacheError(error)
    return null
  }
}

/**
 * Loads the team catalog the first time `enabled` is true, from the saved
 * catalog while it is under a day old, then keeps it for the popup.
 */
export function useTeamCatalog(enabled: boolean): { state: TeamCatalogState; retry: () => void } {
  const [active, setActive] = useState(enabled)
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  if (enabled && !active) setActive(true)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    const load = async () => {
      const cached = attempt === 0 ? await readFreshCatalog() : null
      if (cancelled) return
      if (cached) {
        setSettled({ attempt, status: 'success', result: cached })
        return
      }
      const result = await getTeamCatalog()
      if (cancelled) return
      if (result.failedCompetitionIds.length === COMPETITIONS.length) {
        setSettled({ attempt, status: 'error', reason: result.failureReason ?? 'unexpected' })
        return
      }
      setSettled({ attempt, status: 'success', result })
      const storage = extensionStorage()
      if (storage) saveTeamCatalogSnapshot(storage, result, new Date()).catch(reportUnexpectedCacheError)
    }
    load().catch((error: unknown) => {
      console.error('Unexpected error while loading teams', error)
      if (!cancelled) setSettled({ attempt, status: 'error', reason: 'unexpected' })
    })
    return () => {
      cancelled = true
    }
  }, [active, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  if (!settled || settled.attempt !== attempt) return { state: { status: 'loading' }, retry }
  return {
    state:
      settled.status === 'success'
        ? { status: 'success', result: settled.result }
        : { status: 'error', reason: settled.reason },
    retry,
  }
}
