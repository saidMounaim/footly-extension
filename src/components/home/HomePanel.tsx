import { useMemo } from 'react'
import type { Match } from '../../api/types.ts'
import { useLiveRefresh } from '../../hooks/useLiveRefresh.ts'
import { useMatchDetails } from '../../hooks/useMatchDetails.ts'
import type { MatchListState } from '../../hooks/useMatchList.ts'
import { dayLabel, formatKickoff } from '../../lib/date.ts'
import { buildHome, recentEvents } from '../../lib/home.ts'
import { failureMessage } from '../../lib/errors.ts'
import { ListBanner, MatchListError, MatchListSkeleton } from '../matches/MatchList.tsx'
import { MatchRow } from '../matches/MatchRow.tsx'
import { EventRow, MatchTimelineSkeleton } from '../matches/MatchTimeline.tsx'
import { sectionHeadingClass, secondaryButtonClass, upcomingLabel } from '../matches/status.ts'

/** Events shown on the featured live match card. */
const RECENT_EVENT_COUNT = 3

type SelectMatch = (match: Match, trigger: HTMLButtonElement) => void

interface HomePanelProps {
  state: MatchListState
  favoriteIds: ReadonlySet<string>
  competitionIds: ReadonlySet<string>
  now: Date
  /** False while Home or the list is hidden; featured events then unmount and stop fetching. */
  active: boolean
  /** How often featured live events refresh. */
  liveRefreshMs: number
  onRetry: () => void
  onSelect: SelectMatch
  onOpenFavorites: () => void
}

function NoFavorites({ onOpenFavorites }: { onOpenFavorites: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
      <p className="text-sm text-muted">No favorite teams yet.</p>
      <button type="button" onClick={onOpenFavorites} className={secondaryButtonClass}>
        Choose favorites
      </button>
    </div>
  )
}

/** Recent events of the featured live match, kept fresh while mounted. */
function FeaturedEvents({ match, liveRefreshMs }: { match: Match; liveRefreshMs: number }) {
  const { state, retry, refresh } = useMatchDetails(match)
  const shown = state.status === 'success' ? state.match : match
  const checked = useMemo(() => [shown], [shown])
  useLiveRefresh(checked, refresh, liveRefreshMs)
  const events = recentEvents(shown.events, RECENT_EVENT_COUNT)

  return (
    <div>
      <h3 className="px-4 pt-2 text-xs font-semibold text-muted">Recent events</h3>
      {state.status === 'loading' && <MatchTimelineSkeleton />}
      {state.status === 'error' && (
        <div role="alert" className="flex items-center justify-between gap-3 px-4 py-2">
          <p className="text-xs text-muted">{failureMessage(state.reason).title}</p>
          <button type="button" onClick={retry} className={secondaryButtonClass}>
            Retry
          </button>
        </div>
      )}
      {state.status === 'success' &&
        (events.length === 0 ? (
          <p className="px-4 py-2 text-sm text-muted">No match events yet.</p>
        ) : (
          <ol aria-label="Recent match events" className="divide-y divide-border">
            {events.map((event) => (
              <EventRow key={event.id} event={event} match={shown} />
            ))}
          </ol>
        ))}
    </div>
  )
}

function NextMatchCard({ match, now, onSelect }: { match: Match; now: Date; onSelect: SelectMatch }) {
  const kickoff = new Date(match.startTime)
  const when = `${dayLabel(kickoff, now)} ${formatKickoff(kickoff)}`
  const countdown = upcomingLabel(match, now)
  return (
    <button
      type="button"
      onClick={(event) => onSelect(match, event.currentTarget)}
      aria-label={`${match.homeTeam.name} vs ${match.awayTeam.name}, ${when}${
        countdown === formatKickoff(kickoff) ? '' : `, ${countdown}`
      }`}
      className="m-3 block w-[calc(100%-1.5rem)] rounded-lg border border-border px-4 py-3 text-left hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="block truncate text-xs text-muted">{match.competition.name}</span>
      <span className="mt-1 block truncate text-base font-semibold text-foreground">
        {match.homeTeam.name}
      </span>
      <span className="block truncate text-base font-semibold text-foreground">
        {match.awayTeam.name}
      </span>
      <span className="mt-2 flex items-center justify-between text-sm">
        <time className="tabular-nums text-foreground" dateTime={match.startTime}>
          {when}
        </time>
        {countdown !== formatKickoff(kickoff) && (
          <span className="tabular-nums font-medium text-accent">{countdown}</span>
        )}
      </span>
    </button>
  )
}

export function HomePanel({
  state,
  favoriteIds,
  competitionIds,
  now,
  active,
  liveRefreshMs,
  onRetry,
  onSelect,
  onOpenFavorites,
}: HomePanelProps) {
  const home = useMemo(
    () => (state.status === 'success' ? buildHome(state.result, favoriteIds, competitionIds) : null),
    [state, favoriteIds, competitionIds],
  )
  if (state.status === 'loading') return <MatchListSkeleton />
  if (state.status === 'error') return <MatchListError reason={state.reason} onRetry={onRetry} />
  if (!home) return <MatchListError reason="unexpected" onRetry={onRetry} />

  const { live, nextMatch, nextUp } = home
  const hasFavorites = favoriteIds.size > 0
  const isFavorite = (match: Match) =>
    favoriteIds.has(match.homeTeam.id) || favoriteIds.has(match.awayTeam.id)
  const banner = <ListBanner state={state} onRetry={onRetry} />

  if (!hasFavorites && live.length === 0 && nextUp.length === 0) {
    return (
      <div>
        {banner}
        <NoFavorites onOpenFavorites={onOpenFavorites} />
      </div>
    )
  }

  return (
    <div>
      {banner}
      {live.length > 0 && (
        <section aria-labelledby="home-live">
          <h2 id="home-live" className={sectionHeadingClass}>
            Live now
          </h2>
          <ul className="divide-y divide-border">
            <MatchRow match={live[0]} favorite={isFavorite(live[0])} onSelect={onSelect} />
          </ul>
          {active && (
            <FeaturedEvents key={live[0].id} match={live[0]} liveRefreshMs={liveRefreshMs} />
          )}
          <div className="border-b border-border px-4 pb-3 pt-1">
            <button
              type="button"
              onClick={(event) => onSelect(live[0], event.currentTarget)}
              aria-label={`Open match ${live[0].homeTeam.name} vs ${live[0].awayTeam.name}`}
              className={secondaryButtonClass}
            >
              Open match
            </button>
          </div>
          {live.length > 1 && (
            <ul className="divide-y divide-border">
              {live.slice(1).map((match) => (
                <MatchRow key={match.id} match={match} favorite={isFavorite(match)} onSelect={onSelect} />
              ))}
            </ul>
          )}
        </section>
      )}
      <section aria-labelledby="home-next">
        <h2 id="home-next" className={sectionHeadingClass}>
          Your next match
        </h2>
        {nextMatch ? (
          <NextMatchCard match={nextMatch} now={now} onSelect={onSelect} />
        ) : hasFavorites ? (
          <p className="px-6 py-6 text-center text-sm text-muted">
            No matches for your teams in the next 7 days.
          </p>
        ) : (
          <NoFavorites onOpenFavorites={onOpenFavorites} />
        )}
      </section>
      {nextUp.length > 0 && (
        <section aria-labelledby="home-next-up">
          <h2 id="home-next-up" className={sectionHeadingClass}>
            Next up
          </h2>
          <ul className="divide-y divide-border">
            {nextUp.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                favorite={isFavorite(match)}
                now={now}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
