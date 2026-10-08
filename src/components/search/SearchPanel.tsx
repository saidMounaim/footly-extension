import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { COMPETITIONS } from '../../api/football.ts'
import type { Match, Team } from '../../api/types.ts'
import type { FavoriteCompetitionsApi } from '../../hooks/useFavoriteCompetitions.ts'
import type { FavoriteTeamsApi } from '../../hooks/useFavoriteTeams.ts'
import type { MatchListState } from '../../hooks/useMatchList.ts'
import type { LogoLookup } from '../../lib/crest.ts'
import { searchCompetitions, searchMatches, searchTeams, teamsInMatches } from '../../lib/search.ts'
import { Crest } from '../common/Crest.tsx'
import { FavoriteToggle } from '../favorites/FavoriteToggle.tsx'
import { MatchListError, MatchListSkeleton, StaleBanner } from '../matches/MatchList.tsx'
import { MatchRow } from '../matches/MatchRow.tsx'
import { sectionHeadingClass } from '../matches/status.ts'
import { TeamRow } from '../team/TeamRow.tsx'

interface SearchPanelProps {
  state: MatchListState
  onRetry: () => void
  now: Date
  favorites: FavoriteTeamsApi
  competitions: FavoriteCompetitionsApi
  /** Competition logos from the loaded list. */
  logos: LogoLookup
  onSelect: (match: Match, trigger: HTMLButtonElement) => void
  onOpenTeam: (team: Team, trigger: HTMLButtonElement) => void
  /** Changes each time the Search tab is clicked, to move focus to the field. */
  focusRequest: number
}

const subheadingClass = 'px-4 pt-2 pb-1 text-xs font-medium text-muted'

const NO_MATCHES: Match[] = []

function MatchGroup({
  id,
  label,
  matches,
  favoriteIds,
  now,
  onSelect,
}: {
  id: string
  label: string
  matches: Match[]
  favoriteIds: ReadonlySet<string>
  now: Date
  onSelect: SearchPanelProps['onSelect']
}) {
  if (matches.length === 0) return null
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className={subheadingClass}>
        {label}
      </h3>
      <ul className="py-1.5">
        {matches.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            favorite={favoriteIds.has(match.homeTeam.id) || favoriteIds.has(match.awayTeam.id)}
            now={now}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </section>
  )
}

export function SearchPanel({
  state,
  onRetry,
  now,
  favorites,
  competitions,
  logos,
  onSelect,
  onOpenTeam,
  focusRequest,
}: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusRequest > 0) input.current?.focus()
  }, [focusRequest])

  const upcoming = state.status === 'success' ? state.result.upcoming : NO_MATCHES
  const results = state.status === 'success' ? state.result.results : NO_MATCHES
  const teams = useMemo(() => teamsInMatches([...upcoming, ...results]), [upcoming, results])

  const trimmed = query.trim()
  const foundCompetitions = searchCompetitions(COMPETITIONS, query)
  const foundTeams = searchTeams(teams, query)
  const foundUpcoming = searchMatches(upcoming, query)
  const foundResults = searchMatches(results, query)
  const nothingFound =
    state.status === 'success' &&
    foundCompetitions.length + foundTeams.length + foundUpcoming.length + foundResults.length === 0

  return (
    <div>
      {state.status === 'success' && state.stale && (
        <StaleBanner loadedAt={state.loadedAt} reason={state.stale.reason} onRetry={onRetry} />
      )}
      <div className="px-4 py-3">
        <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-muted">
          Search teams, competitions, and matches
        </label>
        <input
          ref={input}
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
          placeholder="e.g. Arsenal"
        />
      </div>

      {!trimmed ? (
        <p className="px-6 py-6 text-center text-sm text-muted">
          Search for a team, competition, or match.
        </p>
      ) : (
        <>
          {foundCompetitions.length > 0 && (
            <section aria-labelledby="search-competitions">
              <h2 id="search-competitions" className={sectionHeadingClass}>
                Competitions
              </h2>
              <ul className="divide-y divide-border">
                {foundCompetitions.map((competition) => (
                  <li key={competition.id}>
                    <FavoriteToggle
                      name={competition.name}
                      pressed={competitions.isFavorite(competition.id)}
                      disabled={!competitions.ready}
                      onToggle={() => competitions.toggle(competition.id)}
                      showName
                      icon={
                        <Crest
                          src={logos.competitions.get(competition.id)}
                          name={competition.name}
                          kind="competition"
                        />
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {state.status === 'loading' && <MatchListSkeleton />}
          {state.status === 'error' && <MatchListError reason={state.reason} onRetry={onRetry} />}

          {foundTeams.length > 0 && (
            <section aria-labelledby="search-teams">
              <h2 id="search-teams" className={sectionHeadingClass}>
                Teams
              </h2>
              <ul className="divide-y divide-border">
                {foundTeams.map((team) => (
                  <li key={team.id}>
                    <TeamRow
                      team={team}
                      favorite={favorites.isFavorite(team.id)}
                      favoriteReady={favorites.ready}
                      onToggleFavorite={() => favorites.toggle(team)}
                      onOpen={onOpenTeam}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {foundUpcoming.length + foundResults.length > 0 && (
            <section aria-labelledby="search-matches">
              <h2 id="search-matches" className={sectionHeadingClass}>
                Matches
              </h2>
              <MatchGroup
                id="search-matches-upcoming"
                label="Upcoming"
                matches={foundUpcoming}
                favoriteIds={favorites.favoriteIds}
                now={now}
                onSelect={onSelect}
              />
              <MatchGroup
                id="search-matches-results"
                label="Results"
                matches={foundResults}
                favoriteIds={favorites.favoriteIds}
                now={now}
                onSelect={onSelect}
              />
            </section>
          )}

          {nothingFound && (
            <p className="px-6 py-6 text-center text-sm text-muted">No results for “{trimmed}”.</p>
          )}
        </>
      )}
    </div>
  )
}
