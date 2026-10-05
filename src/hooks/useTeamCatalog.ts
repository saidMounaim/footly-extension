import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  allCompetitionsFailed,
  competitionsToLoad,
  getTeamCatalog,
  type CatalogCompetition,
  type TeamCatalogResult,
} from '../api/football.ts'
import {
  coversCompetitions,
  isTeamCatalogFresh,
  loadTeamCatalogSnapshot,
  saveTeamCatalogSnapshot,
} from '../lib/cache.ts'
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

/** The saved catalog while it is fresh and covers `competitions`, otherwise null (also when unreadable). */
async function readFreshCatalog(
  competitions: readonly CatalogCompetition[],
): Promise<TeamCatalogResult | null> {
  const storage = extensionStorage()
  if (!storage) return null
  const tableIds = competitions.filter((c) => c.hasStandings).map((c) => c.id)
  try {
    const snapshot = await loadTeamCatalogSnapshot(storage)
    if (!snapshot || !isTeamCatalogFresh(snapshot, new Date())) return null
    if (!coversCompetitions(snapshot.competitionIds, tableIds)) return null
    return { teams: snapshot.teams, failedCompetitionIds: [], competitionIds: snapshot.competitionIds }
  } catch (error) {
    reportUnexpectedCacheError(error)
    return null
  }
}

/**
 * Loads the team catalog the first time `enabled` is true, from the saved
 * catalog while it is under a day old, then keeps it for the popup. Followed
 * extra competitions with tables are included; following one reloads it.
 */
export function useTeamCatalog(
  enabled: boolean,
  followedIds: readonly string[],
): { state: TeamCatalogState; retry: () => void } {
  const key = competitionsToLoad(followedIds)
    .map((competition) => competition.id)
    .join(',')
  const competitions = useMemo(() => competitionsToLoad(key.split(',')), [key])
  const [active, setActive] = useState(enabled)
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  if (enabled && !active) setActive(true)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    const load = async () => {
      const cached = attempt === 0 ? await readFreshCatalog(competitions) : null
      if (cancelled) return
      if (cached) {
        setSettled({ attempt, status: 'success', result: cached })
        return
      }
      const result = await getTeamCatalog({ competitions })
      if (cancelled) return
      if (allCompetitionsFailed(result)) {
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
  }, [active, attempt, competitions])

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
