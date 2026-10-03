import type { Match } from '../../api/types.ts'
import { formatKickoff } from '../../lib/date.ts'

interface MatchRowProps {
  match: Match
}

function StatusCell({ match }: MatchRowProps) {
  const score = match.score ? `${match.score.home}–${match.score.away}` : null
  switch (match.status) {
    case 'live':
      return (
        <span className="font-semibold text-accent">
          Live
          {score && (
            <>
              {' '}
              <span className="tabular-nums">{score}</span>
            </>
          )}
        </span>
      )
    case 'halftime':
      return (
        <span className="font-semibold text-foreground">
          HT
          {score && (
            <>
              {' '}
              <span className="tabular-nums">{score}</span>
            </>
          )}
        </span>
      )
    case 'postponed':
      return <span className="font-medium text-foreground">Postponed</span>
    case 'cancelled':
      return <span className="font-medium text-muted line-through">Cancelled</span>
    case 'finished':
      return <span className="text-muted">FT{score && ` ${score}`}</span>
    case 'upcoming':
      return (
        <time className="tabular-nums text-foreground" dateTime={match.startTime}>
          {formatKickoff(new Date(match.startTime))}
        </time>
      )
  }
}

export function MatchRow({ match }: MatchRowProps) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted">{match.competition.name}</p>
        <p className="truncate text-sm text-foreground">{match.homeTeam.name}</p>
        <p className="truncate text-sm text-foreground">{match.awayTeam.name}</p>
      </div>
      <div className="shrink-0 text-right text-sm">
        <StatusCell match={match} />
      </div>
    </li>
  )
}
