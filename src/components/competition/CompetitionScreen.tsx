import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { CatalogCompetition } from '../../api/football.ts'
import type { Match } from '../../api/types.ts'
import type { MatchListState } from '../../hooks/useMatchList.ts'
import { Crest } from '../common/Crest.tsx'
import { MatchList } from '../matches/MatchList.tsx'
import type { ListTab } from '../matches/tabs.ts'

const VIEWS: { id: ListTab; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'results', label: 'Results' },
]

/** No "your competitions" section inside a single competition. */
const NO_COMPETITIONS: ReadonlySet<string> = new Set()

interface CompetitionScreenProps {
  competition: Pick<CatalogCompetition, 'id' | 'name'>
  logo: string | undefined
  state: MatchListState
  favoriteIds: ReadonlySet<string>
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
  now,
  onRetry,
  onSelect,
  onBack,
}: CompetitionScreenProps) {
  const [view, setView] = useState<ListTab>('upcoming')
  const heading = useRef<HTMLHeadingElement>(null)
  const buttons = useRef(new Map<ListTab, HTMLButtonElement>())

  useEffect(() => {
    heading.current?.focus()
  }, [])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = view === 'upcoming' ? 'results' : 'upcoming'
    const choice = event.key === 'Home' ? 'upcoming' : event.key === 'End' ? 'results' : next
    setView(choice)
    buttons.current.get(choice)?.focus()
  }

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
      </div>
      <div
        role="radiogroup"
        aria-labelledby="competition-title"
        onKeyDown={onKeyDown}
        className="mx-3 mt-3 flex rounded-full border border-border bg-surface p-1"
      >
        {VIEWS.map(({ id, label }) => {
          const checked = id === view
          return (
            <button
              key={id}
              ref={(element) => {
                if (element) buttons.current.set(id, element)
                else buttons.current.delete(id)
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => setView(id)}
              className={`flex-1 rounded-full px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                checked
                  ? 'bg-background font-semibold text-foreground shadow-sm'
                  : 'font-medium text-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
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
