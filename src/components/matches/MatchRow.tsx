import type { Match } from '../../api/types.ts'
import { formatKickoff } from '../../lib/date.ts'
import { formatScore, statusLabel } from './status.ts'

interface StatusTextProps {
  match: Match
}

export function StatusText({ match }: StatusTextProps) {
  const score = match.score ? formatScore(match.score) : null
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

interface MatchRowProps {
  match: Match
  favorite?: boolean
  onSelect: (match: Match, trigger: HTMLButtonElement) => void
}

export function MatchRow({ match, favorite = false, onSelect }: MatchRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={(event) => onSelect(match, event.currentTarget)}
        aria-label={`${match.homeTeam.name} vs ${match.awayTeam.name}, ${statusLabel(match)}${
          favorite ? ', favorite team' : ''
        }`}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <span className="block min-w-0 flex-1">
          <span className="block truncate text-xs text-muted">
            {favorite && (
              <>
                <span aria-hidden="true" className="text-accent">
                  ★
                </span>
                <span className="sr-only">Favorite team</span>{' '}
              </>
            )}
            {match.competition.name}
          </span>
          <span className="block truncate text-sm text-foreground">{match.homeTeam.name}</span>
          <span className="block truncate text-sm text-foreground">{match.awayTeam.name}</span>
        </span>
        <span className="block shrink-0 text-right text-sm">
          <StatusText match={match} />
        </span>
      </button>
    </li>
  )
}
