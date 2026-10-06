import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Match } from '../../api/types.ts'
import type { MatchListState } from '../../hooks/useMatchList.ts'
import { useState } from 'react'
import { dayLabel, formatKickoff, localDayKey, matchDays, onDay } from '../../lib/date.ts'
import { failureMessage, type LoadFailure } from '../../lib/errors.ts'
import { groupByCompetition, splitByCompetitions, splitByFavorites } from '../../lib/favorites.ts'
import { Crest } from '../common/Crest.tsx'
import { DayChips } from './DayChips.tsx'
import { MatchRow } from './MatchRow.tsx'
import type { ListTab } from './tabs.ts'
import { secondaryButtonClass, sectionHeadingClass } from './status.ts'

const EMPTY_MESSAGE: Record<ListTab, string> = {
  upcoming: 'No upcoming matches in the next 7 days.',
  results: 'No results in the last 7 days.',
}

interface MatchListProps {
  state: MatchListState
  view: ListTab
  favoriteIds: ReadonlySet<string>
  competitionIds: ReadonlySet<string>
  /** Show only this competition's matches (the competition screen). */
  onlyCompetitionId?: string
  /** Current time for upcoming countdowns. */
  now: Date
  onRetry: () => void
  onSelect: (match: Match, trigger: HTMLButtonElement) => void
}

function groupByDay(matches: Match[]): Match[][] {
  const groups = new Map<string, Match[]>()
  for (const match of matches) {
    const key = localDayKey(new Date(match.startTime))
    groups.set(key, [...(groups.get(key) ?? []), match])
  }
  return [...groups.values()]
}

export function MatchListSkeleton() {
  return (
    <div aria-busy="true" className="px-4 py-3">
      <span className="sr-only">Loading matches…</span>
      <ul aria-hidden="true" className="space-y-3">
        {[0, 1, 2, 3, 4].map((row) => (
          <li key={row} className="flex animate-pulse items-center gap-3">
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-24 rounded bg-surface" />
              <div className="h-3 w-40 rounded bg-surface" />
              <div className="h-3 w-32 rounded bg-surface" />
            </div>
            <div className="h-3 w-10 rounded bg-surface" />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MatchListError({ reason, onRetry }: { reason: LoadFailure; onRetry: () => void }) {
  const { title, hint } = failureMessage(reason)
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-foreground">{title}</p>
      <p className="text-sm text-muted">{hint}</p>
      <button type="button" onClick={onRetry} className={secondaryButtonClass}>
        Retry
      </button>
    </div>
  )
}

/** A tinted, bordered panel marking a personal section; its heading names it, so color isn't the only cue. */
function HighlightPanel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="mx-3 mt-3 overflow-hidden rounded-2xl border border-accent/40 bg-accent/10"
    >
      <h2 id={id} className="flex items-center gap-1.5 px-3 pt-3 pb-1 text-sm font-semibold text-foreground">
        <Star aria-hidden="true" className="size-4 fill-current text-accent" />
        {title}
      </h2>
      {children}
    </section>
  )
}

export function PartialFailureBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 border-b border-border px-4 py-2"
    >
      <p className="text-xs text-muted">Some competitions couldn't be loaded.</p>
      <button type="button" onClick={onRetry} className={secondaryButtonClass}>
        Retry
      </button>
    </div>
  )
}

interface StaleBannerProps {
  loadedAt: Date
  reason: LoadFailure
  onRetry: () => void
}

/** Shown over a list that couldn't be updated, so old scores aren't mistaken for live ones. */
export function StaleBanner({ loadedAt, reason, onRetry }: StaleBannerProps) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 border-b border-border px-4 py-2"
    >
      <p className="text-xs text-muted">
        Showing matches from {formatKickoff(loadedAt)}. {failureMessage(reason).title}
      </p>
      <button type="button" onClick={onRetry} className={secondaryButtonClass}>
        Retry
      </button>
    </div>
  )
}

/** The stale banner when the list couldn't be updated, otherwise the partial-failure banner if needed. */
export function ListBanner({
  state,
  onRetry,
}: {
  state: Extract<MatchListState, { status: 'success' }>
  onRetry: () => void
}) {
  if (state.stale) {
    return <StaleBanner loadedAt={state.loadedAt} reason={state.stale.reason} onRetry={onRetry} />
  }
  if (state.result.failedCompetitionIds.length > 0) return <PartialFailureBanner onRetry={onRetry} />
  return null
}

export function MatchList({
  state,
  view,
  favoriteIds,
  competitionIds,
  onlyCompetitionId,
  now,
  onRetry,
  onSelect,
}: MatchListProps) {
  // Per tab and in memory only; a day that disappears after a reload falls back to All.
  const [day, setDay] = useState<string | null>(null)
  if (state.status === 'loading') return <MatchListSkeleton />
  if (state.status === 'error') return <MatchListError reason={state.reason} onRetry={onRetry} />

  const { result, loadedAt } = state
  const allMatches =
    onlyCompetitionId === undefined
      ? result[view]
      : result[view].filter((match) => match.competition.id === onlyCompetitionId)
  const days = matchDays(allMatches)
  const chosen = day !== null && days.includes(day) ? day : null
  const matches = chosen === null ? allMatches : onDay(allMatches, chosen)
  const { favorites, others: rest } = splitByFavorites(matches, favoriteIds)
  const { favorites: followed, others } = splitByCompetitions(rest, competitionIds)
  return (
    <div>
      <ListBanner state={state} onRetry={onRetry} />
      {days.length > 1 && (
        <DayChips
          days={days}
          selected={chosen}
          onChange={setDay}
          now={now}
          label={view === 'upcoming' ? 'Upcoming days' : 'Result days'}
        />
      )}
      {matches.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted">{EMPTY_MESSAGE[view]}</p>
      ) : (
        <>
          {favorites.length > 0 && (
            <HighlightPanel id={`${view}-your-teams`} title="Your teams">
              <ul className="pb-1.5">
                {favorites.map((match) => (
                  <MatchRow key={match.id} match={match} favorite now={now} onSelect={onSelect} />
                ))}
              </ul>
            </HighlightPanel>
          )}
          {followed.length > 0 && (
            <HighlightPanel id={`${view}-your-competitions`} title="Your competitions">
              {groupByCompetition(followed).map((group) => (
                <div key={group.id} role="group" aria-labelledby={`${view}-competition-${group.id}`}>
                  <h3
                    id={`${view}-competition-${group.id}`}
                    className="flex items-center gap-2 px-4 pt-2 text-xs font-semibold text-muted"
                  >
                    <Crest src={group.logo} name={group.name} size="sm" kind="competition" />
                    <span className="min-w-0 truncate">{group.name}</span>
                  </h3>
                  <ul className="pb-1.5">
                    {group.matches.map((match) => (
                      <MatchRow key={match.id} match={match} now={now} onSelect={onSelect} />
                    ))}
                  </ul>
                </div>
              ))}
            </HighlightPanel>
          )}
          {(favorites.length > 0 || followed.length > 0) && others.length > 0 && (
            <h2 id={`${view}-other-matches`} className={`${sectionHeadingClass} mt-2`}>
              Other matches
            </h2>
          )}
          {groupByDay(others).map((group) => (
            <section key={group[0].startTime} aria-labelledby={`${view}-day-${group[0].id}`}>
              <h2 id={`${view}-day-${group[0].id}`} className={sectionHeadingClass}>
                {dayLabel(new Date(group[0].startTime), loadedAt)}
              </h2>
              <ul className="py-1.5">
                {group.map((match) => (
                  <MatchRow key={match.id} match={match} now={now} onSelect={onSelect} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
