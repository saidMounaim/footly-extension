import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import type { Match } from '../../api/types.ts'
import type { FavoriteTeamsApi } from '../../hooks/useFavoriteTeams.ts'
import { FavoriteToggle } from '../favorites/FavoriteToggle.tsx'
import { useKickoffChecks } from '../../hooks/useKickoffChecks.ts'
import { useLiveRefresh } from '../../hooks/useLiveRefresh.ts'
import { useMatchDetails } from '../../hooks/useMatchDetails.ts'
import { useNow } from '../../hooks/useNow.ts'
import { detailCountdown } from '../../lib/countdown.ts'
import { dayLabel, formatKickoff } from '../../lib/date.ts'
import { failureMessage } from '../../lib/errors.ts'
import { Crest } from '../common/Crest.tsx'
import { MatchLineups } from './MatchLineups.tsx'
import { StatusText } from './MatchRow.tsx'
import { MatchStats } from './MatchStats.tsx'
import { MatchTimeline, MatchTimelineSkeleton } from './MatchTimeline.tsx'
import { formatScore, secondaryButtonClass } from './status.ts'

interface MatchDetailProps {
  match: Match
  favorites: FavoriteTeamsApi
  /** How often the open match refreshes while live. */
  liveRefreshMs: number
  onBack: () => void
}

function ScoreBlock({ match, favorites }: { match: Match; favorites: FavoriteTeamsApi }) {
  const upcoming = match.status === 'upcoming'
  const now = useNow(upcoming ? 1000 : null)
  return (
    <div className="mx-3 my-3 flex flex-col items-center gap-3 rounded-2xl border border-border bg-background px-4 py-5 shadow-sm">
      <div className="flex w-full items-center gap-3">
        <div className="flex flex-1 flex-col items-end gap-1.5">
          <Crest src={match.homeTeam.logo} name={match.homeTeam.name} size="lg" />
          <p className="flex items-center justify-end gap-1 text-right text-sm font-semibold text-foreground">
            <span className="min-w-0">{match.homeTeam.name}</span>
            <FavoriteToggle
              name={match.homeTeam.name}
              pressed={favorites.isFavorite(match.homeTeam.id)}
              disabled={!favorites.ready}
              onToggle={() => favorites.toggle(match.homeTeam)}
            />
          </p>
        </div>
        <p className="shrink-0 text-4xl font-bold tabular-nums text-foreground">
          {match.score ? formatScore(match.score) : formatKickoff(new Date(match.startTime))}
        </p>
        <div className="flex flex-1 flex-col items-start gap-1.5">
          <Crest src={match.awayTeam.logo} name={match.awayTeam.name} size="lg" />
          <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <FavoriteToggle
              name={match.awayTeam.name}
              pressed={favorites.isFavorite(match.awayTeam.id)}
              disabled={!favorites.ready}
              onToggle={() => favorites.toggle(match.awayTeam)}
            />
            <span className="min-w-0">{match.awayTeam.name}</span>
          </p>
        </div>
      </div>
      <p className="text-sm">
        {match.status === 'upcoming' ? (
          <span className="flex flex-col items-center">
            <span className="text-muted">{dayLabel(new Date(match.startTime), now)}</span>
            <span className="tabular-nums text-foreground">
              {detailCountdown(new Date(match.startTime), now)}
            </span>
          </span>
        ) : (
          <StatusText match={match} showScore={false} />
        )}
      </p>
    </div>
  )
}

export function MatchDetail({ match, favorites, liveRefreshMs, onBack }: MatchDetailProps) {
  const { state, retry, refresh } = useMatchDetails(match)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shown = state.status === 'success' ? state.match : match
  const checked = useMemo(() => [shown], [shown])
  useKickoffChecks(checked, refresh)
  useLiveRefresh(checked, refresh, liveRefreshMs)

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
          <ArrowLeft aria-hidden="true" className="inline size-4 align-[-3px]" /> Back
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
            <p className="text-sm text-foreground">{failureMessage(state.reason).title}</p>
            <button type="button" onClick={retry} className={secondaryButtonClass}>
              Retry
            </button>
          </div>
        )}
        {state.status === 'success' && <MatchTimeline match={state.match} />}
      </section>
      {state.status === 'success' && (
        <>
          <MatchStats match={state.match} />
          <MatchLineups match={state.match} />
        </>
      )}
    </div>
  )
}
