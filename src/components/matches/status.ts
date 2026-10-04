import type { Match } from '../../api/types.ts'
import { formatKickoff } from '../../lib/date.ts'

/** Shared look for Retry and similar secondary buttons. */
export const secondaryButtonClass =
  'rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50'

export function formatScore(score: NonNullable<Match['score']>): string {
  return `${score.home}–${score.away}`
}

/** Plain-text status, used for accessible names: "Live 2–1", "Postponed", "15:00". */
export function statusLabel(match: Match): string {
  const score = match.score ? ` ${formatScore(match.score)}` : ''
  switch (match.status) {
    case 'live':
      return `Live${score}`
    case 'halftime':
      return `HT${score}`
    case 'finished':
      return `FT${score}`
    case 'postponed':
      return 'Postponed'
    case 'cancelled':
      return 'Cancelled'
    case 'upcoming':
      return formatKickoff(new Date(match.startTime))
  }
}
