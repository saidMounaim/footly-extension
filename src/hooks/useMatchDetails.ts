import { useCallback, useEffect, useRef, useState } from 'react'
import { getMatchDetails, MatchDetailsError } from '../api/football.ts'
import type { Match } from '../api/types.ts'

export type MatchDetailsState =
  | { status: 'loading' }
  | { status: 'success'; match: Match }
  | { status: 'error' }

type Settled = { key: string } & ({ status: 'success'; match: Match } | { status: 'error' })

function reportUnexpected(error: unknown) {
  if (!(error instanceof MatchDetailsError)) {
    console.error('Unexpected error while loading match details', error)
  }
}

/**
 * Loads the open match's details; responses for a match no longer open are
 * ignored. `refresh` refetches in the background and keeps the shown details
 * when it fails.
 */
export function useMatchDetails(match: Match): {
  state: MatchDetailsState
  retry: () => void
  refresh: () => Promise<void>
} {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  const key = `${match.competition.id}/${match.id}#${attempt}`
  const currentKey = useRef(key)
  // Key of the last foreground load that settled; refresh waits for the current one.
  const settledKey = useRef('')

  useEffect(() => {
    currentKey.current = key
    let cancelled = false
    getMatchDetails(match).then(
      (details) => {
        if (cancelled) return
        settledKey.current = key
        setSettled({ key, status: 'success', match: details })
      },
      (error: unknown) => {
        reportUnexpected(error)
        if (cancelled) return
        settledKey.current = key
        setSettled({ key, status: 'error' })
      },
    )
    return () => {
      cancelled = true
      currentKey.current = ''
    }
  }, [match, key])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const refresh = useCallback(async () => {
    const started = currentKey.current
    // The foreground load still in flight already returns fresh details.
    if (!started || settledKey.current !== started) return
    try {
      const details = await getMatchDetails(match)
      if (started === currentKey.current) {
        setSettled({ key: started, status: 'success', match: details })
      }
    } catch (error) {
      reportUnexpected(error)
    }
  }, [match])

  if (!settled || settled.key !== key) return { state: { status: 'loading' }, retry, refresh }
  return {
    state: settled.status === 'success' ? { status: 'success', match: settled.match } : { status: 'error' },
    retry,
    refresh,
  }
}
