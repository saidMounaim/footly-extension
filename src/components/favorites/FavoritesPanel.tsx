import { useId, useState } from 'react'
import { TEAM_MATCH_WINDOW_DAYS } from '../../api/football.ts'
import type { Match, Team } from '../../api/types.ts'
import type { FavoriteCompetitionsApi } from '../../hooks/useFavoriteCompetitions.ts'
import type { FavoriteTeamsApi } from '../../hooks/useFavoriteTeams.ts'
import type { TeamCatalogState } from '../../hooks/useTeamCatalog.ts'
import type { TeamMatchesState } from '../../hooks/useTeamMatches.ts'
import type { LogoLookup } from '../../lib/crest.ts'
import { failureMessage } from '../../lib/errors.ts'
import { searchTeams } from '../../lib/search.ts'
import { groupCardClass, secondaryButtonClass, sectionHeadingClass } from '../matches/status.ts'
import { Crest } from '../common/Crest.tsx'
import { MatchListError, MatchListSkeleton } from '../matches/MatchList.tsx'
import { MatchRow } from '../matches/MatchRow.tsx'
import { FavoriteToggle } from './FavoriteToggle.tsx'

interface FavoritesPanelProps {
  favorites: FavoriteTeamsApi
  /** Only its load error is shown here; competitions are followed elsewhere. */
  competitions: FavoriteCompetitionsApi
  catalog: TeamCatalogState
  teamMatches: TeamMatchesState
  /** Logos from loaded data, for favorites saved without one. */
  logos: LogoLookup
  /** Current time for upcoming countdowns. */
  now: Date
  onRetryCatalog: () => void
  onRetryTeamMatches: () => void
  onSelectMatch: (match: Match, trigger: HTMLButtonElement) => void
}

function MatchGroup({
  title,
  matches,
  now,
  onSelect,
}: {
  title: string
  matches: Match[]
  now: Date
  onSelect: (match: Match, trigger: HTMLButtonElement) => void
}) {
  return (
    <div>
      <h3 className="px-4 pt-2 pb-1 text-xs font-medium text-muted">{title}</h3>
      <ul className="pb-1.5">
        {matches.map((match) => (
          <MatchRow key={match.id} match={match} favorite now={now} onSelect={onSelect} />
        ))}
      </ul>
    </div>
  )
}

/** The favorite teams' upcoming matches and recent results, in every competition. */
function TeamMatches({
  state,
  now,
  onRetry,
  onSelect,
}: {
  state: TeamMatchesState
  now: Date
  onRetry: () => void
  onSelect: (match: Match, trigger: HTMLButtonElement) => void
}) {
  if (state.status === 'idle') return null
  return (
    <section aria-labelledby="team-matches-heading">
      <h2 id="team-matches-heading" className={sectionHeadingClass}>
        Your teams' matches
      </h2>
      {state.status === 'loading' && <MatchListSkeleton />}
      {state.status === 'error' && <MatchListError reason={state.reason} onRetry={onRetry} />}
      {state.status === 'success' && (
        <>
          {state.result.failedTeamIds.length > 0 && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 border-y border-border px-4 py-2"
            >
              <p className="text-xs text-muted">Some teams' matches couldn't be loaded.</p>
              <button type="button" onClick={onRetry} className={secondaryButtonClass}>
                Retry
              </button>
            </div>
          )}
          {state.result.upcoming.length > 0 ? (
            <MatchGroup title="Upcoming" matches={state.result.upcoming} now={now} onSelect={onSelect} />
          ) : (
            <p className="px-6 py-4 text-center text-sm text-muted">
              No matches for your teams in the next {TEAM_MATCH_WINDOW_DAYS} days.
            </p>
          )}
          {state.result.results.length > 0 && (
            <MatchGroup title="Results" matches={state.result.results} now={now} onSelect={onSelect} />
          )}
        </>
      )}
    </section>
  )
}


function YourTeams({ favorites, logos }: { favorites: FavoriteTeamsApi; logos: LogoLookup }) {
  return (
    <section aria-labelledby="your-teams-heading">
      <h2 id="your-teams-heading" className={sectionHeadingClass}>
        Your teams
      </h2>
      {favorites.teams.length === 0 ? (
        <div className="px-6 py-6 text-center text-sm">
          <p className="text-foreground">No favorite teams yet.</p>
          <p className="text-muted">Search for a team to start following their matches.</p>
        </div>
      ) : (
        <ul className={groupCardClass}>
          {favorites.teams.map((team) => (
            <li key={team.id} className="flex items-center gap-3 px-4 py-2">
              <Crest src={team.logo ?? logos.teams.get(team.id)} name={team.name} />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{team.name}</span>
              <button
                type="button"
                disabled={!favorites.ready}
                onClick={() => favorites.toggle(team)}
                aria-label={`Remove ${team.name} from favorites`}
                className={secondaryButtonClass}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CatalogSkeleton() {
  return (
    <div aria-busy="true" className="px-4 py-3">
      <span className="sr-only">Loading teams…</span>
      <ul aria-hidden="true" className="space-y-3">
        {[0, 1, 2].map((row) => (
          <li key={row} className="h-3 w-40 animate-pulse rounded bg-surface" />
        ))}
      </ul>
    </div>
  )
}

function SearchResults({ teams, query, favorites }: { teams: Team[]; query: string; favorites: FavoriteTeamsApi }) {
  if (!query.trim()) return null
  const found = searchTeams(teams, query)
  if (found.length === 0) {
    return <p className="px-6 py-6 text-center text-sm text-muted">No teams match “{query.trim()}”.</p>
  }
  return (
    <ul aria-label="Search results" className="divide-y divide-border">
      {found.map((team) => (
        <li key={team.id}>
          <FavoriteToggle
            name={team.name}
            pressed={favorites.isFavorite(team.id)}
            disabled={!favorites.ready}
            onToggle={() => favorites.toggle(team)}
            showName
            icon={<Crest src={team.logo} name={team.name} />}
          />
        </li>
      ))}
    </ul>
  )
}

export function FavoritesPanel({
  favorites,
  competitions,
  catalog,
  teamMatches,
  logos,
  now,
  onRetryCatalog,
  onRetryTeamMatches,
  onSelectMatch,
}: FavoritesPanelProps) {
  const [query, setQuery] = useState('')
  const inputId = useId()
  const ready = catalog.status === 'success'

  return (
    <div>
      {(favorites.loadError || competitions.loadError) && (
        <p role="alert" className="border-b border-border px-4 py-2 text-xs text-foreground">
          Couldn't load your saved favorites.
        </p>
      )}
      <TeamMatches
        state={teamMatches}
        now={now}
        onRetry={onRetryTeamMatches}
        onSelect={onSelectMatch}
      />
      <YourTeams favorites={favorites} logos={logos} />
      <section aria-labelledby="find-teams-heading">
        <h2 id="find-teams-heading" className={sectionHeadingClass}>
          Find teams
        </h2>
        <div className="px-4 py-3">
          <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-muted">
            Search teams
          </label>
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={!ready}
            autoComplete="off"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
            placeholder="e.g. Arsenal"
          />
        </div>
        {catalog.status === 'loading' && <CatalogSkeleton />}
        {catalog.status === 'error' && (
          <div role="alert" className="flex flex-col items-center gap-3 px-6 py-6 text-center">
            <p className="text-sm text-foreground">{failureMessage(catalog.reason).title}</p>
            <button type="button" onClick={onRetryCatalog} className={secondaryButtonClass}>
              Retry
            </button>
          </div>
        )}
        {catalog.status === 'success' && (
          <>
            {catalog.result.failedCompetitionIds.length > 0 && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 border-y border-border px-4 py-2"
              >
                <p className="text-xs text-muted">Some competitions couldn't be loaded.</p>
                <button type="button" onClick={onRetryCatalog} className={secondaryButtonClass}>
                  Retry
                </button>
              </div>
            )}
            <SearchResults teams={catalog.result.teams} query={query} favorites={favorites} />
          </>
        )}
      </section>
    </div>
  )
}
