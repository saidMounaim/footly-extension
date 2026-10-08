import { useCallback, useEffect, useState } from 'react'
import { allCompetitionsFailed, getMatchList, type CatalogCompetition } from '../api/football.ts'
import { coversCompetition } from '../lib/home.ts'
import type { MatchListState } from './useMatchList.ts'

type Settled = { request: string; state: MatchListState }

/**
 * The open competition's matches: the main list's state when it already loaded
 * that competition, otherwise a one-off load of just that competition while its
 * screen is open. Nothing is saved.
 */
export function useCompetitionMatches(
  competition: CatalogCompetition | undefined,
  main: { state: MatchListState; retry: () => void },
): { state: MatchListState; retry: () => void } {
  const covered = competition !== undefined && coversCompetition(main.state, competition.id)
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  const request = competition && !covered ? `${attempt}|${competition.id}` : null

  useEffect(() => {
    if (!competition || request === null) return
    let cancelled = false
    getMatchList({ competitions: [competition] })
      .then((result) => {
        if (cancelled) return
        setSettled({
          request,
          state: allCompetitionsFailed(result)
            ? { status: 'error', reason: result.failureReason ?? 'unexpected' }
            : { status: 'success', result, loadedAt: new Date() },
        })
      })
      .catch((error: unknown) => {
        console.error('Unexpected error while loading a competition', error)
        if (!cancelled) setSettled({ request, state: { status: 'error', reason: 'unexpected' } })
      })
    return () => {
      cancelled = true
    }
  }, [competition, request])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  if (request === null) return main
  if (!settled || settled.request !== request) return { state: { status: 'loading' }, retry }
  return { state: settled.state, retry }
}
