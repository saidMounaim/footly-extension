import type { Match } from '../../api/types.ts'
import type { MatchListState } from '../../hooks/useMatchList.ts'
import { dayLabel, localDayKey } from '../../lib/date.ts'
import { splitByFavorites } from '../../lib/favorites.ts'
import { MatchRow } from './MatchRow.tsx'
import type { ListTab } from './tabs.ts'
import { secondaryButtonClass } from './status.ts'

const EMPTY_MESSAGE: Record<ListTab, string> = {
  upcoming: 'No upcoming matches in the next 7 days.',
  results: 'No results in the last 7 days.',
}

interface MatchListProps {
  state: MatchListState
  view: ListTab
  favoriteIds: ReadonlySet<string>
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

function Skeleton() {
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

export function MatchList({ state, view, favoriteIds, onRetry, onSelect }: MatchListProps) {
  if (state.status === 'loading') return <Skeleton />

  if (state.status === 'error') {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="text-sm text-foreground">Couldn't load match data.</p>
        <p className="text-sm text-muted">Check your connection and try again.</p>
        <button type="button" onClick={onRetry} className={secondaryButtonClass}>
          Retry
        </button>
      </div>
    )
  }

  const { result, loadedAt } = state
  const matches = result[view]
  const { favorites, others } = splitByFavorites(matches, favoriteIds)
  const headingClass =
    'bg-surface px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted'
  return (
    <div>
      {result.failedCompetitionIds.length > 0 && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-border px-4 py-2"
        >
          <p className="text-xs text-muted">Some competitions couldn't be loaded.</p>
          <button type="button" onClick={onRetry} className={secondaryButtonClass}>
            Retry
          </button>
        </div>
      )}
      {matches.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted">{EMPTY_MESSAGE[view]}</p>
      ) : (
        <>
          {favorites.length > 0 && (
            <section aria-labelledby={`${view}-your-teams`}>
              <h2 id={`${view}-your-teams`} className={headingClass}>
                Your teams
              </h2>
              <ul className="divide-y divide-border">
                {favorites.map((match) => (
                  <MatchRow key={match.id} match={match} favorite onSelect={onSelect} />
                ))}
              </ul>
            </section>
          )}
          {groupByDay(others).map((group) => (
            <section key={group[0].startTime} aria-labelledby={`${view}-day-${group[0].id}`}>
              <h2 id={`${view}-day-${group[0].id}`} className={headingClass}>
                {dayLabel(new Date(group[0].startTime), loadedAt)}
              </h2>
              <ul className="divide-y divide-border">
                {group.map((match) => (
                  <MatchRow key={match.id} match={match} onSelect={onSelect} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
