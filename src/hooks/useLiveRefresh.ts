import { useEffect, useState } from 'react'
import type { Match } from '../api/types.ts'
import { hasLiveMatch, LIVE_REFRESH_MS } from '../lib/cache.ts'

/**
 * While any of `matches` is live or at halftime, calls `refresh` every
 * `intervalMs`, waiting for each call to settle before scheduling the next.
 */
export function useLiveRefresh(
  matches: Match[],
  refresh: () => Promise<void>,
  intervalMs: number = LIVE_REFRESH_MS,
) {
  const live = hasLiveMatch(matches)
  const [ticks, setTicks] = useState(0)

  useEffect(() => {
    if (!live) return
    let cancelled = false
    const timer = setTimeout(() => {
      refresh().finally(() => {
        if (!cancelled) setTicks((n) => n + 1)
      })
    }, intervalMs)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [live, refresh, ticks, intervalMs])
}
