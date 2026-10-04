import { useCallback, useEffect, useRef, useState } from 'react'
import { COMPETITIONS, getMatchList, type MatchListResult } from '../api/football.ts'

export type MatchListState =
  | { status: 'loading' }
  | { status: 'success'; result: MatchListResult; loadedAt: Date }
  | { status: 'error' }

/**
 * Loads upcoming matches and recent results once; `retry` reloads both with the
 * loading state, `refresh` reloads in the background and keeps the current list
 * when every competition fails.
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

  const refresh = useCallback(async () => {
    const started = generation.current
    try {
      const result = await getMatchList()
      if (started !== generation.current) return
      if (result.failedCompetitionIds.length === COMPETITIONS.length) return
      setState({ status: 'success', result, loadedAt: new Date() })
    } catch (error) {
      console.error('Unexpected error while refreshing matches', error)
    }
  }, [])

  return { state, retry, refresh }
}
