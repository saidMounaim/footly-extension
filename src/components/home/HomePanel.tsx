import { useMemo, type ReactNode } from 'react'
import type { Match } from '../../api/types.ts'
import { useLiveRefresh } from '../../hooks/useLiveRefresh.ts'
import { useMatchDetails } from '../../hooks/useMatchDetails.ts'
import type { MatchListState } from '../../hooks/useMatchList.ts'
import { dayLabel, formatKickoff } from '../../lib/date.ts'
import { buildHome, recentEvents } from '../../lib/home.ts'
import { failureMessage } from '../../lib/errors.ts'
import { Crest } from '../common/Crest.tsx'
import { ListBanner, MatchListError, MatchListSkeleton } from '../matches/MatchList.tsx'
import { MatchRow, StatusText } from '../matches/MatchRow.tsx'
import { EventRow, MatchTimelineSkeleton } from '../matches/MatchTimeline.tsx'
import {
  formatScore,
  sectionHeadingClass,
  secondaryButtonClass,
  statusLabel,
  upcomingLabel,
} from '../matches/status.ts'

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
      <h3 className="px-4 pt-3 text-xs font-semibold text-muted">Recent events</h3>
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

/**
 * The top live match as a large card. The score area is the "open match" button;
 * the recent events sit below it so their Retry stays a separate control.
 */
function LiveHero({
  match,
  onSelect,
  children,
}: {
  match: Match
  onSelect: SelectMatch
  children: ReactNode
}) {
  return (
    <div className="mx-3 my-1.5 overflow-hidden rounded-2xl border border-accent/40 bg-background shadow-sm">
      <button
        type="button"
        onClick={(event) => onSelect(match, event.currentTarget)}
        aria-label={`Open match ${match.homeTeam.name} vs ${match.awayTeam.name}, ${statusLabel(match)}`}
        className="block w-full p-4 text-left transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <span className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="flex min-w-0 items-center gap-1.5">
            <Crest
              src={match.competition.logo}
              name={match.competition.name}
              size="sm"
              kind="competition"
            />
            <span className="min-w-0 truncate">{match.competition.name}</span>
          </span>
          <StatusText match={match} showScore={false} />
        </span>
        <span className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <CardTeam name={match.homeTeam.name} logo={match.homeTeam.logo} />
          <span className="text-3xl font-bold tabular-nums text-foreground">
            {match.score ? formatScore(match.score) : 'vs'}
          </span>
          <CardTeam name={match.awayTeam.name} logo={match.awayTeam.logo} />
        </span>
      </button>
      <div className="border-t border-border pb-1">{children}</div>
    </div>
  )
}

function CardTeam({ name, logo }: { name: string; logo: string | undefined }) {
  return (
    <span className="flex min-w-0 flex-col items-center gap-2 text-center">
      <Crest src={logo} name={name} size="lg" />
      <span className="line-clamp-2 text-sm font-semibold text-foreground">{name}</span>
    </span>
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
      className="m-3 block w-[calc(100%-1.5rem)] rounded-xl border border-border p-4 text-left shadow-sm transition-colors hover:border-accent hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
        <Crest
          src={match.competition.logo}
          name={match.competition.name}
          size="sm"
          kind="competition"
        />
        <span className="min-w-0 truncate">{match.competition.name}</span>
      </span>
      <span className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-4">
        <CardTeam name={match.homeTeam.name} logo={match.homeTeam.logo} />
        <span className="pt-3 text-xs font-medium text-muted">vs</span>
        <CardTeam name={match.awayTeam.name} logo={match.awayTeam.logo} />
      </span>
      <span className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
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
          <h2 id="home-live" tabIndex={-1} className={`${sectionHeadingClass} focus:outline-none`}>
            Live now
          </h2>
          <LiveHero match={live[0]} onSelect={onSelect}>
            {active && (
              <FeaturedEvents key={live[0].id} match={live[0]} liveRefreshMs={liveRefreshMs} />
            )}
          </LiveHero>
          {live.length > 1 && (
            <ul className="py-1.5">
              {live.slice(1).map((match) => (
                <MatchRow key={match.id} match={match} favorite={isFavorite(match)} onSelect={onSelect} />
              ))}
            </ul>
          )}
        </section>
      )}
      <section aria-labelledby="home-next">
        <h2 id="home-next" tabIndex={-1} className={`${sectionHeadingClass} focus:outline-none`}>
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
          <ul className="py-1.5">
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
