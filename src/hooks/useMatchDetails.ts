import { useCallback, useEffect, useState } from 'react'
import { getMatchDetails, MatchDetailsError } from '../api/football.ts'
import type { Match } from '../api/types.ts'

export type MatchDetailsState =
  | { status: 'loading' }
  | { status: 'success'; match: Match }
  | { status: 'error' }

type Settled = { key: string } & ({ status: 'success'; match: Match } | { status: 'error' })

/** Loads the open match's details; responses for a match no longer open are ignored. */
export function useMatchDetails(match: Match): { state: MatchDetailsState; retry: () => void } {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  const key = `${match.competition.id}/${match.id}#${attempt}`

  useEffect(() => {
    let cancelled = false
    getMatchDetails(match).then(
      (details) => {
        if (!cancelled) setSettled({ key, status: 'success', match: details })
      },
      (error: unknown) => {
        if (!(error instanceof MatchDetailsError)) {
          console.error('Unexpected error while loading match details', error)
        }
        if (!cancelled) setSettled({ key, status: 'error' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [match, key])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  if (!settled || settled.key !== key) return { state: { status: 'loading' }, retry }
  return {
    state: settled.status === 'success' ? { status: 'success', match: settled.match } : { status: 'error' },
    retry,
  }
}
