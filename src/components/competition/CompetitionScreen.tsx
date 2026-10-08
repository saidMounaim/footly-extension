import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CatalogCompetition } from '../../api/football.ts'
import type { Match } from '../../api/types.ts'
import type { MatchListState } from '../../hooks/useMatchList.ts'
import { Crest } from '../common/Crest.tsx'
import { FavoriteToggle } from '../favorites/FavoriteToggle.tsx'
import { MatchList } from '../matches/MatchList.tsx'
import type { ListTab } from '../matches/tabs.ts'
import { ViewSwitch } from '../matches/ViewSwitch.tsx'

/** No "your competitions" section inside a single competition. */
const NO_COMPETITIONS: ReadonlySet<string> = new Set()

interface CompetitionScreenProps {
  competition: Pick<CatalogCompetition, 'id' | 'name'>
  logo: string | undefined
  state: MatchListState
  favoriteIds: ReadonlySet<string>
  /** Whether this competition is followed, and whether follows can be changed yet. */
  followed: boolean
  followReady: boolean
  onToggleFollow: () => void
  now: Date
  onRetry: () => void
  onSelect: (match: Match, trigger: HTMLButtonElement) => void
  onBack: () => void
}

/** One competition's upcoming matches or results, with the same day chips and cards as the tabs. */
export function CompetitionScreen({
  competition,
  logo,
  state,
  favoriteIds,
  followed,
  followReady,
  onToggleFollow,
  now,
  onRetry,
  onSelect,
  onBack,
}: CompetitionScreenProps) {
  const [view, setView] = useState<ListTab>('upcoming')
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to competitions"
          className="rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ArrowLeft aria-hidden="true" className="inline size-4 align-[-3px]" /> Back
        </button>
        <Crest src={logo} name={competition.name} size="md" kind="competition" />
        <h2
          ref={heading}
          tabIndex={-1}
          id="competition-title"
          className="min-w-0 truncate text-sm font-semibold text-foreground focus:outline-none"
        >
          {competition.name}
        </h2>
        <span className="ml-auto">
          <FavoriteToggle
            name={competition.name}
            pressed={followed}
            disabled={!followReady}
            onToggle={onToggleFollow}
          />
        </span>
      </div>
      <ViewSwitch view={view} onChange={setView} labelledBy="competition-title" />
      <MatchList
        key={view}
        state={state}
        view={view}
        favoriteIds={favoriteIds}
        competitionIds={NO_COMPETITIONS}
        onlyCompetitionId={competition.id}
        now={now}
        onRetry={onRetry}
        onSelect={onSelect}
      />
    </div>
  )
}
