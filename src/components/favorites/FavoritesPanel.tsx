import { useId, useState } from 'react'
import { COMPETITIONS } from '../../api/football.ts'
import type { Team } from '../../api/types.ts'
import type { FavoriteCompetitionsApi } from '../../hooks/useFavoriteCompetitions.ts'
import type { FavoriteTeamsApi } from '../../hooks/useFavoriteTeams.ts'
import type { TeamCatalogState } from '../../hooks/useTeamCatalog.ts'
import type { LogoLookup } from '../../lib/crest.ts'
import { failureMessage } from '../../lib/errors.ts'
import { searchTeams } from '../../lib/search.ts'
import { secondaryButtonClass } from '../matches/status.ts'
import { Crest } from '../common/Crest.tsx'
import { FavoriteToggle } from './FavoriteToggle.tsx'

interface FavoritesPanelProps {
  favorites: FavoriteTeamsApi
  competitions: FavoriteCompetitionsApi
  catalog: TeamCatalogState
  /** Logos from loaded data, for favorites saved without one and for competitions. */
  logos: LogoLookup
  onRetryCatalog: () => void
}

const headingClass =
  'bg-surface px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted'

function YourTeams({ favorites, logos }: { favorites: FavoriteTeamsApi; logos: LogoLookup }) {
  return (
    <section aria-labelledby="your-teams-heading">
      <h2 id="your-teams-heading" className={headingClass}>
        Your teams
      </h2>
      {favorites.teams.length === 0 ? (
        <div className="px-6 py-6 text-center text-sm">
          <p className="text-foreground">No favorite teams yet.</p>
          <p className="text-muted">Search for a team to start following their matches.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
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

function Competitions({
  competitions,
  logos,
}: {
  competitions: FavoriteCompetitionsApi
  logos: LogoLookup
}) {
  return (
    <section aria-labelledby="competitions-heading">
      <h2 id="competitions-heading" className={headingClass}>
        Competitions
      </h2>
      <ul className="divide-y divide-border">
        {COMPETITIONS.map((competition) => (
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
  logos,
  onRetryCatalog,
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
      <YourTeams favorites={favorites} logos={logos} />
      <Competitions competitions={competitions} logos={logos} />
      <section aria-labelledby="find-teams-heading">
        <h2 id="find-teams-heading" className={headingClass}>
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
