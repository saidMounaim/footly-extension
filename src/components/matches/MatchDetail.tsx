import { useEffect, useRef } from 'react'
import type { Match } from '../../api/types.ts'
import type { FavoriteTeamsApi } from '../../hooks/useFavoriteTeams.ts'
import { TeamToggle } from '../favorites/TeamToggle.tsx'
import { useMatchDetails } from '../../hooks/useMatchDetails.ts'
import { dayLabel, formatKickoff } from '../../lib/date.ts'
import { StatusText } from './MatchRow.tsx'
import { MatchTimeline, MatchTimelineSkeleton } from './MatchTimeline.tsx'
import { formatScore, secondaryButtonClass } from './status.ts'

interface MatchDetailProps {
  match: Match
  favorites: FavoriteTeamsApi
  onBack: () => void
}

function ScoreBlock({ match, favorites }: { match: Match; favorites: FavoriteTeamsApi }) {
  return (
    <div className="flex flex-col items-center gap-1 border-b border-border px-4 py-5">
      <div className="flex w-full items-center gap-3">
        <p className="flex flex-1 items-center justify-end gap-1 text-right text-sm font-semibold text-foreground">
          <span className="min-w-0">{match.homeTeam.name}</span>
          <TeamToggle
            team={match.homeTeam}
            pressed={favorites.isFavorite(match.homeTeam.id)}
            disabled={!favorites.ready}
            onToggle={favorites.toggle}
          />
        </p>
        <p className="shrink-0 text-2xl font-bold tabular-nums text-foreground">
          {match.score ? formatScore(match.score) : formatKickoff(new Date(match.startTime))}
        </p>
        <p className="flex flex-1 items-center gap-1 text-sm font-semibold text-foreground">
          <TeamToggle
            team={match.awayTeam}
            pressed={favorites.isFavorite(match.awayTeam.id)}
            disabled={!favorites.ready}
            onToggle={favorites.toggle}
          />
          <span className="min-w-0">{match.awayTeam.name}</span>
        </p>
      </div>
      <p className="text-sm">
        {match.status === 'upcoming' ? (
          <span className="text-muted">{dayLabel(new Date(match.startTime), new Date())}</span>
        ) : (
          <StatusText match={match} />
        )}
      </p>
    </div>
  )
}

export function MatchDetail({ match, favorites, onBack }: MatchDetailProps) {
  const { state, retry } = useMatchDetails(match)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shown = state.status === 'success' ? state.match : match

  useEffect(() => {
    headingRef.current?.focus()
  }, [match])

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to matches"
          className="rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span aria-hidden="true">←</span> Back
        </button>
        <p className="truncate text-xs text-muted">{match.competition.name}</p>
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        {match.homeTeam.name} vs {match.awayTeam.name}
      </h2>
      <ScoreBlock match={shown} favorites={favorites} />
      <section aria-label="Timeline">
        {state.status === 'loading' && <MatchTimelineSkeleton />}
        {state.status === 'error' && (
          <div role="alert" className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <p className="text-sm text-foreground">Couldn't load match details.</p>
            <button type="button" onClick={retry} className={secondaryButtonClass}>
              Retry
            </button>
          </div>
        )}
        {state.status === 'success' && <MatchTimeline match={state.match} />}
      </section>
    </div>
  )
}
