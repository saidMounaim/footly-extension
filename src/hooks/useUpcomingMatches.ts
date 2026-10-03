import { useCallback, useEffect, useState } from 'react'
import { COMPETITIONS, getUpcomingMatches, type UpcomingMatchesResult } from '../api/football.ts'

export type UpcomingMatchesState =
  | { status: 'loading' }
  | { status: 'success'; result: UpcomingMatchesResult; loadedAt: Date }
  | { status: 'error' }

export function useUpcomingMatches(): { state: UpcomingMatchesState; retry: () => void } {
  const [state, setState] = useState<UpcomingMatchesState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    getUpcomingMatches().then(
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
