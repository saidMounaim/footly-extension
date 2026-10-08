import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getTeamMatches, type TeamMatchesResult } from '../api/football.ts'
import type { Team } from '../api/types.ts'
import type { LoadFailure } from '../lib/errors.ts'

export type TeamMatchesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: TeamMatchesResult }
  | { status: 'error'; reason: LoadFailure }

type Settled = { request: string } & (
  | { status: 'success'; result: TeamMatchesResult }
  | { status: 'error'; reason: LoadFailure }
)

/**
 * Loads the given teams' matches while `enabled` (the Favorites tab or a team
 * screen is open), then keeps them for the popup. A changed set of teams reloads,
 * but only once enabled again; nothing is requested without teams.
 */
export function useTeamMatches(
  enabled: boolean,
  teams: readonly Pick<Team, 'id'>[],
): { state: TeamMatchesState; retry: () => void } {
  const key = teams
    .map((team) => team.id)
    .sort()
    .join(',')
  const ids = useMemo(() => (key ? key.split(',').map((id) => ({ id })) : []), [key])
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  const request = `${attempt}|${key}`
  // The request already started or finished, so revisiting the tab doesn't refetch.
  const started = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || ids.length === 0 || started.current === request) return
    started.current = request
    let done = false
    getTeamMatches(ids)
      .then((result) => {
        done = true
        if (started.current !== request) return
        if (result.failedTeamIds.length === result.teamIds.length) {
          setSettled({ request, status: 'error', reason: result.failureReason ?? 'unexpected' })
          return
        }
        setSettled({ request, status: 'success', result })
      })
      .catch((error: unknown) => {
        done = true
        console.error("Unexpected error while loading your teams' matches", error)
        if (started.current === request) setSettled({ request, status: 'error', reason: 'unexpected' })
      })
    return () => {
      // Left before it finished (tab switch or a newer request): ask again next time.
      if (!done && started.current === request) started.current = null
    }
  }, [enabled, ids, request])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  if (ids.length === 0) return { state: { status: 'idle' }, retry }
  if (!settled || settled.request !== request) return { state: { status: 'loading' }, retry }
  return {
    state:
      settled.status === 'success'
        ? { status: 'success', result: settled.result }
        : { status: 'error', reason: settled.reason },
    retry,
  }
}
