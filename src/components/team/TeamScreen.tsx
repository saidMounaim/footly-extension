import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { TEAM_MATCH_WINDOW_DAYS } from '../../api/football.ts'
import type { Match, Team } from '../../api/types.ts'
import type { TeamMatchesState } from '../../hooks/useTeamMatches.ts'
import { groupByCompetition, type CompetitionGroup } from '../../lib/favorites.ts'
import { Crest } from '../common/Crest.tsx'
import { FavoriteToggle } from '../favorites/FavoriteToggle.tsx'
import { MatchListError, MatchListSkeleton } from '../matches/MatchList.tsx'
import { MatchRow } from '../matches/MatchRow.tsx'
import type { ListTab } from '../matches/tabs.ts'
import { ViewSwitch } from '../matches/ViewSwitch.tsx'

interface TeamScreenProps {
  team: Team
  logo: string | undefined
  /** Competition logos from loaded data, for groups whose matches carry none. */
  competitionLogos: ReadonlyMap<string, string>
  state: TeamMatchesState
  favoriteIds: ReadonlySet<string>
  /** Whether this team is a favorite, and whether favorites can be changed yet. */
  favorite: boolean
  favoriteReady: boolean
  onToggleFavorite: () => void
  /** Names the list Back returns to, e.g. "search". */
  backTo: string
  now: Date
  onRetry: () => void
  onSelect: (match: Match, trigger: HTMLButtonElement) => void
  onBack: () => void
}

function CompetitionSection({
  group,
  logo,
  favoriteIds,
  now,
  onSelect,
}: {
  group: CompetitionGroup
  logo: string | undefined
  favoriteIds: ReadonlySet<string>
  now: Date
  onSelect: TeamScreenProps['onSelect']
}) {
  return (
    <details open className="group border-b border-border">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        <Crest src={logo} name={group.name} size="sm" kind="competition" />
        <span className="min-w-0 flex-1 truncate font-medium">
          {group.name}{' '}
          <span className="font-normal tabular-nums text-muted">({group.matches.length})</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
        />
      </summary>
      <ul className="pb-1.5">
        {group.matches.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            favorite={favoriteIds.has(match.homeTeam.id) || favoriteIds.has(match.awayTeam.id)}
            now={now}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </details>
  )
}

/** One team's upcoming matches or recent results in every competition, grouped by competition. */
export function TeamScreen({
  team,
  logo,
  competitionLogos,
  state,
  favoriteIds,
  favorite,
  favoriteReady,
  onToggleFavorite,
  backTo,
  now,
  onRetry,
  onSelect,
  onBack,
}: TeamScreenProps) {
  const [view, setView] = useState<ListTab>('upcoming')
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  const matches = state.status === 'success' ? state.result[view] : []
  const empty =
    view === 'upcoming'
      ? `No matches for ${team.name} in the next ${TEAM_MATCH_WINDOW_DAYS} days.`
      : `No results for ${team.name} in the last ${TEAM_MATCH_WINDOW_DAYS} days.`

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={`Back to ${backTo}`}
          className="rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ArrowLeft aria-hidden="true" className="inline size-4 align-[-3px]" /> Back
        </button>
        <Crest src={logo} name={team.name} size="md" />
        <h2
          ref={heading}
          tabIndex={-1}
          id="team-title"
          className="min-w-0 truncate text-sm font-semibold text-foreground focus:outline-none"
        >
          {team.name}
        </h2>
        <span className="ml-auto">
          <FavoriteToggle
            name={team.name}
            pressed={favorite}
            disabled={!favoriteReady}
            onToggle={onToggleFavorite}
          />
        </span>
      </div>
      <ViewSwitch view={view} onChange={setView} labelledBy="team-title" />
      {state.status === 'loading' && <MatchListSkeleton />}
      {state.status === 'error' && <MatchListError reason={state.reason} onRetry={onRetry} />}
      {state.status === 'success' &&
        (matches.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">{empty}</p>
        ) : (
          <div key={view} className="mt-2">
            {groupByCompetition(matches).map((group) => (
              <CompetitionSection
                key={group.id}
                group={group}
                logo={group.logo ?? competitionLogos.get(group.id)}
                favoriteIds={favoriteIds}
                now={now}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
    </div>
  )
}
