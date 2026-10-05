import { Ban, Star, TriangleAlert } from 'lucide-react'
import type { Match } from '../../api/types.ts'
import { Crest } from '../common/Crest.tsx'
import { formatScore, statusLabel, upcomingLabel } from './status.ts'

interface StatusTextProps {
  match: Match
  /** Enables the "in N min" countdown for upcoming matches. */
  now?: Date
  /** False when the scores are shown elsewhere, as in the match card. */
  showScore?: boolean
}

const pillClass = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs'

function Score({ score }: { score: string | null }) {
  if (!score) return null
  return (
    <>
      {' '}
      <span className="font-semibold tabular-nums text-foreground">{score}</span>
    </>
  )
}

export function StatusText({ match, now, showScore = true }: StatusTextProps) {
  const score = showScore && match.score ? formatScore(match.score) : null
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
          <TriangleAlert aria-hidden="true" className="size-3" />
          <span>Postponed</span>
        </span>
      )
    case 'cancelled':
      return (
        <span className={`${pillClass} border-border bg-surface text-muted`}>
          <Ban aria-hidden="true" className="size-3" />
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

/** One team in the match card: crest, name, and its own score when there is one. */
function TeamLine({
  name,
  logo,
  score,
  dimmed,
}: {
  name: string
  logo: string | undefined
  score: number | undefined
  /** The losing side of a finished match. */
  dimmed: boolean
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Crest src={logo} name={name} />
      <span
        className={`min-w-0 flex-1 truncate text-sm ${dimmed ? 'text-muted' : 'font-medium text-foreground'}`}
      >
        {name}
      </span>
      {score !== undefined && (
        <span
          className={`w-6 text-right text-base font-semibold tabular-nums ${dimmed ? 'text-muted' : 'text-foreground'}`}
        >
          {score}
        </span>
      )}
    </span>
  )
}

interface MatchRowProps {
  match: Match
  favorite?: boolean
  now?: Date
  onSelect: (match: Match, trigger: HTMLButtonElement) => void
}

export function MatchRow({ match, favorite = false, now, onSelect }: MatchRowProps) {
  const { score } = match
  const finished = match.status === 'finished' && score !== undefined
  return (
    <li className="px-3 py-1.5">
      <button
        type="button"
        onClick={(event) => onSelect(match, event.currentTarget)}
        aria-label={`${match.homeTeam.name} vs ${match.awayTeam.name}, ${statusLabel(match, now)}${
          favorite ? ', favorite team' : ''
        }`}
        className="block w-full rounded-xl border border-border bg-background p-3 text-left shadow-sm transition-colors hover:border-accent hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="flex items-center gap-2 text-xs text-muted">
          <Crest
            src={match.competition.logo}
            name={match.competition.name}
            size="sm"
            kind="competition"
          />
          <span className="min-w-0 flex-1 truncate">{match.competition.name}</span>
          {favorite && (
            <>
              <Star aria-hidden="true" className="size-3.5 shrink-0 fill-current text-accent" />
              <span className="sr-only">Favorite team</span>
            </>
          )}
          <span className="shrink-0 text-sm">
            <StatusText match={match} now={now} showScore={false} />
          </span>
        </span>
        <span className="mt-3 flex flex-col gap-2.5">
          <TeamLine
            name={match.homeTeam.name}
            logo={match.homeTeam.logo}
            score={score?.home}
            dimmed={finished && score.home < score.away}
          />
          <TeamLine
            name={match.awayTeam.name}
            logo={match.awayTeam.logo}
            score={score?.away}
            dimmed={finished && score.away < score.home}
          />
        </span>
      </button>
    </li>
  )
}
