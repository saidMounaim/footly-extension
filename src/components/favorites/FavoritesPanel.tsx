import { useId, useState } from 'react'
import { COMPETITIONS } from '../../api/football.ts'
import type { Team } from '../../api/types.ts'
import type { FavoriteCompetitionsApi } from '../../hooks/useFavoriteCompetitions.ts'
import type { FavoriteTeamsApi } from '../../hooks/useFavoriteTeams.ts'
import type { NotificationsSettingApi } from '../../hooks/useNotificationsSetting.ts'
import type { TeamCatalogState } from '../../hooks/useTeamCatalog.ts'
import { searchTeams } from '../../lib/search.ts'
import { secondaryButtonClass } from '../matches/status.ts'
import { FavoriteToggle } from './FavoriteToggle.tsx'

interface FavoritesPanelProps {
  favorites: FavoriteTeamsApi
  competitions: FavoriteCompetitionsApi
  notifications: NotificationsSettingApi
  catalog: TeamCatalogState
  onRetryCatalog: () => void
}

const headingClass =
  'bg-surface px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted'

function NotificationsSwitch({ notifications }: { notifications: NotificationsSettingApi }) {
  const { enabled } = notifications
  return (
    <div className="flex items-start gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0 flex-1">
        <p id="notifications-label" className="text-sm font-medium text-foreground">
          Match notifications
        </p>
        <p id="notifications-help" className="text-xs text-muted">
          Kick-off, half-time, and full-time alerts for your favorite teams.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby="notifications-label"
        aria-describedby="notifications-help"
        disabled={!notifications.ready}
        onClick={notifications.toggle}
        className="flex shrink-0 items-center gap-2 rounded-full text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className={`flex h-5 w-9 items-center rounded-full border p-0.5 ${
            enabled ? 'justify-end border-accent bg-accent' : 'justify-start border-border bg-surface'
          }`}
        >
          <span className="size-3.5 rounded-full bg-background shadow" />
        </span>
        <span aria-hidden="true" className="w-6 text-left">
          {enabled ? 'On' : 'Off'}
        </span>
      </button>
    </div>
  )
}

function YourTeams({ favorites }: { favorites: FavoriteTeamsApi }) {
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

function Competitions({ competitions }: { competitions: FavoriteCompetitionsApi }) {
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
          />
        </li>
      ))}
    </ul>
  )
}

export function FavoritesPanel({
  favorites,
  competitions,
  notifications,
  catalog,
  onRetryCatalog,
}: FavoritesPanelProps) {
  const [query, setQuery] = useState('')
  const inputId = useId()
  const ready = catalog.status === 'success'

  return (
    <div>
      {(favorites.loadError || competitions.loadError || notifications.loadError) && (
        <p role="alert" className="border-b border-border px-4 py-2 text-xs text-foreground">
          Couldn't load your saved favorites.
        </p>
      )}
      <NotificationsSwitch notifications={notifications} />
      <YourTeams favorites={favorites} />
      <Competitions competitions={competitions} />
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
            <p className="text-sm text-foreground">Couldn't load teams.</p>
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
