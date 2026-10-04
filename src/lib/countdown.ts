import type { Match } from '../api/types.ts'

const MINUTE_MS = 60_000

/** Minutes after kickoff when Footly refetches to pick up a match that has gone live. */
const KICKOFF_CHECK_MINUTES = [1, 3, 5]

const pad = (value: number) => String(value).padStart(2, '0')

/** Row text: "in N min" within the hour, "Starting" once kickoff passes, otherwise null (show the time). */
export function rowCountdown(kickoff: Date, now: Date): string | null {
  const remaining = kickoff.getTime() - now.getTime()
  if (remaining <= 0) return 'Starting'
  if (remaining > 60 * MINUTE_MS) return null
  return `in ${Math.ceil(remaining / MINUTE_MS)} min`
}

/** Detail text: "Kicks off in 3d 04h 12m", "Kicks off in 2h 14m 05s", "Kicks off in 14m 05s", or "Starting". */
export function detailCountdown(kickoff: Date, now: Date): string {
  const remaining = kickoff.getTime() - now.getTime()
  if (remaining <= 0) return 'Starting'
  const totalSeconds = Math.ceil(remaining / 1000)
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `Kicks off in ${days}d ${pad(hours)}h ${pad(minutes)}m`
  if (hours > 0) return `Kicks off in ${hours}h ${pad(minutes)}m ${pad(seconds)}s`
  return `Kicks off in ${minutes}m ${pad(seconds)}s`
}

/** The earliest kickoff check still ahead for upcoming matches, or null when none remain. */
export function nextKickoffCheck(matches: Match[], now: Date): Date | null {
  let next: number | null = null
  for (const match of matches) {
    if (match.status !== 'upcoming') continue
    const kickoff = new Date(match.startTime).getTime()
    for (const minutes of KICKOFF_CHECK_MINUTES) {
      const at = kickoff + minutes * MINUTE_MS
      if (at > now.getTime()) {
        if (next === null || at < next) next = at
        break
      }
    }
  }
  return next === null ? null : new Date(next)
}
