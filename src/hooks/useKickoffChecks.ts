import { useEffect, useRef, useState } from 'react'
import type { Match } from '../api/types.ts'
import { nextKickoffCheck } from '../lib/countdown.ts'

/**
 * Calls `refresh` at each kickoff check (kickoff + 1, 3, and 5 min) still ahead
 * for the upcoming `matches`, one timeout at a time.
 */
export function useKickoffChecks(matches: Match[], refresh: () => Promise<void>) {
  const [fired, setFired] = useState(0)
  const lastCheck = useRef(0)

  useEffect(() => {
    // Never count a check that just fired as still ahead, even if the clock lags.
    const from = new Date(Math.max(Date.now(), lastCheck.current))
    const next = nextKickoffCheck(matches, from)
    if (!next) return
    let cancelled = false
    const timer = setTimeout(() => {
      lastCheck.current = next.getTime()
      refresh().finally(() => {
        if (!cancelled) setFired((n) => n + 1)
      })
    }, next.getTime() - Date.now())
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [matches, refresh, fired])
}
