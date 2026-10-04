import { useCallback, useEffect, useState } from 'react'
import { COMPETITIONS, getMatchList, type MatchListResult } from '../api/football.ts'

export type MatchListState =
  | { status: 'loading' }
  | { status: 'success'; result: MatchListResult; loadedAt: Date }
  | { status: 'error' }

/** Loads upcoming matches and recent results once; `retry` reloads both. */
export function useMatchList(): { state: MatchListState; retry: () => void } {
  const [state, setState] = useState<MatchListState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    getMatchList().then(
      (result) => {
        if (cancelled) return
        if (result.failedCompetitionIds.length === COMPETITIONS.length) {
          setState({ status: 'error' })
        } else {
          setState({ status: 'success', result, loadedAt: new Date() })
        }
      },
      (error: unknown) => {
        console.error('Unexpected error while loading matches', error)
        if (!cancelled) setState({ status: 'error' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
