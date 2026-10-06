import { Star } from 'lucide-react'
import { useMemo } from 'react'
import type { CatalogCompetition } from '../../api/football.ts'
import type { MatchListState } from '../../hooks/useMatchList.ts'
import type { LogoLookup } from '../../lib/crest.ts'
import { dayLabel, formatKickoff } from '../../lib/date.ts'
import { competitionSummaries, type CompetitionSummary } from '../../lib/home.ts'
import { Crest } from '../common/Crest.tsx'
import { ListBanner, MatchListError, MatchListSkeleton } from '../matches/MatchList.tsx'
import { sectionHeadingClass } from '../matches/status.ts'

export type OpenCompetition = (id: string, trigger: HTMLButtonElement) => void

interface HomePanelProps {
  state: MatchListState
  /** The loaded competitions (defaults, then followed extras), in display order. */
  competitions: readonly CatalogCompetition[]
  followedIds: ReadonlySet<string>
  logos: LogoLookup
  /** Current time for "Today"/"Tomorrow" labels. */
  now: Date
  onRetry: () => void
  onOpenCompetition: OpenCompetition
}

/** Card status as text: live count, next kickoff, or nothing scheduled. */
function statusText(summary: CompetitionSummary, now: Date): string {
  if (summary.live > 0) return `${summary.live} live`
  if (summary.next) {
    const kickoff = new Date(summary.next.startTime)
    return `${dayLabel(kickoff, now)} ${formatKickoff(kickoff)}`
  }
  return 'No matches this week'
}

function CompetitionCard({
  summary,
  logo,
  followed,
  now,
  onOpen,
}: {
  summary: CompetitionSummary
  logo: string | undefined
  followed: boolean
  now: Date
  onOpen: OpenCompetition
}) {
  const status = statusText(summary, now)
  return (
    <li>
      <button
        type="button"
        onClick={(event) => onOpen(summary.id, event.currentTarget)}
        aria-label={`${summary.name}, ${status}${followed ? ', followed' : ''}`}
        className="flex h-full w-full flex-col gap-3 rounded-2xl border border-border bg-background p-3 text-left shadow-sm transition-colors hover:border-accent hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="flex items-start justify-between gap-2">
          <Crest src={logo} name={summary.name} size="lg" kind="competition" />
          {followed && (
            <Star aria-hidden="true" className="size-4 shrink-0 fill-current text-accent" />
          )}
        </span>
        <span className="line-clamp-2 text-sm font-semibold text-foreground">{summary.name}</span>
        <span className="mt-auto flex items-center gap-1.5 text-xs">
          {summary.live > 0 ? (
            <>
              <span aria-hidden="true" className="relative flex size-1.5">
                <span className="absolute inline-flex size-full rounded-full bg-accent opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
              </span>
              <span className="font-semibold text-accent">{status}</span>
            </>
          ) : (
            <span className="tabular-nums text-muted">{status}</span>
          )}
        </span>
      </button>
    </li>
  )
}

/** Home: one card per loaded competition; opening a card shows its matches. */
export function HomePanel({
  state,
  competitions,
  followedIds,
  logos,
  now,
  onRetry,
  onOpenCompetition,
}: HomePanelProps) {
  const summaries = useMemo(
    () => (state.status === 'success' ? competitionSummaries(state.result, competitions) : null),
    [state, competitions],
  )
  if (state.status === 'loading') return <MatchListSkeleton />
  if (state.status === 'error') return <MatchListError reason={state.reason} onRetry={onRetry} />
  if (!summaries) return <MatchListError reason="unexpected" onRetry={onRetry} />

  return (
    <div>
      <ListBanner state={state} onRetry={onRetry} />
      <section aria-labelledby="home-competitions">
        <h2
          id="home-competitions"
          tabIndex={-1}
          className={`${sectionHeadingClass} focus:outline-none`}
        >
          Competitions
        </h2>
        <ul className="grid grid-cols-2 gap-2.5 px-3 pb-3">
          {summaries.map((summary) => (
            <CompetitionCard
              key={summary.id}
              summary={summary}
              logo={logos.competitions.get(summary.id)}
              followed={followedIds.has(summary.id)}
              now={now}
              onOpen={onOpenCompetition}
            />
          ))}
        </ul>
      </section>
    </div>
  )
}
