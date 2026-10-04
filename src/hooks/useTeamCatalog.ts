import { useCallback, useEffect, useState } from 'react'
import { COMPETITIONS, getTeamCatalog, type TeamCatalogResult } from '../api/football.ts'

export type TeamCatalogState =
  | { status: 'loading' }
  | { status: 'success'; result: TeamCatalogResult }
  | { status: 'error' }

type Settled = { attempt: number } & ({ status: 'success'; result: TeamCatalogResult } | { status: 'error' })

/** Loads the team catalog the first time `enabled` is true, then keeps it for the popup. */
export function useTeamCatalog(enabled: boolean): { state: TeamCatalogState; retry: () => void } {
  const [active, setActive] = useState(enabled)
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  if (enabled && !active) setActive(true)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    getTeamCatalog().then(
      (result) => {
        if (cancelled) return
        if (result.failedCompetitionIds.length === COMPETITIONS.length) {
          setSettled({ attempt, status: 'error' })
        } else {
          setSettled({ attempt, status: 'success', result })
        }
      },
      (error: unknown) => {
        console.error('Unexpected error while loading teams', error)
        if (!cancelled) setSettled({ attempt, status: 'error' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [active, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  if (!settled || settled.attempt !== attempt) return { state: { status: 'loading' }, retry }
  return {
    state: settled.status === 'success' ? { status: 'success', result: settled.result } : { status: 'error' },
    retry,
  }
}
