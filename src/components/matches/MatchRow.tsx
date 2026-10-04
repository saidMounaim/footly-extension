import type { Match } from '../../api/types.ts'
import { formatScore, statusLabel, upcomingLabel } from './status.ts'

interface StatusTextProps {
  match: Match
  /** Enables the "in N min" countdown for upcoming matches. */
  now?: Date
}

const pillClass = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs'

function Score({ score }: { score: string | null }) {
  if (!score) return null
  return (
    <>
      {' '}
      <span className="tabular-nums text-foreground">{score}</span>
    </>
  )
}

export function StatusText({ match, now }: StatusTextProps) {
  const score = match.score ? formatScore(match.score) : null
  switch (match.status) {
    case 'live':
      return (
        <span className={`${pillClass} border-accent font-semibold text-accent`}>
          <span aria-hidden="true" className="relative flex size-1.5">
            <span className="absolute inline-flex size-full rounded-full bg-accent opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
          </span>
          <span>
            Live
            <Score score={score} />
          </span>
        </span>
      )
    case 'halftime':
      return (
        <span className={`${pillClass} border-border bg-surface font-semibold text-foreground`}>
          <span>
            HT
            <Score score={score} />
          </span>
        </span>
      )
    case 'finished':
      return (
        <span className={`${pillClass} border-border bg-surface text-muted`}>
          <span>
            FT
            <Score score={score} />
          </span>
        </span>
      )
    case 'postponed':
      return (
        <span className={`${pillClass} border-warning font-medium text-warning`}>
          <span aria-hidden="true">⚠</span>
          <span>Postponed</span>
        </span>
      )
    case 'cancelled':
      return (
        <span className={`${pillClass} border-border bg-surface text-muted`}>
          <span aria-hidden="true">⊘</span>
          <span>Cancelled</span>
        </span>
      )
    case 'upcoming':
      return (
        <time className="tabular-nums text-foreground" dateTime={match.startTime}>
          {upcomingLabel(match, now)}
        </time>
      )
  }
}

interface MatchRowProps {
  match: Match
  favorite?: boolean
  now?: Date
  onSelect: (match: Match, trigger: HTMLButtonElement) => void
}

export function MatchRow({ match, favorite = false, now, onSelect }: MatchRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={(event) => onSelect(match, event.currentTarget)}
        aria-label={`${match.homeTeam.name} vs ${match.awayTeam.name}, ${statusLabel(match, now)}${
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
          <StatusText match={match} now={now} />
        </span>
      </button>
    </li>
  )
}
