import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Match } from '../../api/types.ts'
import type { FavoriteTeamsApi } from '../../hooks/useFavoriteTeams.ts'
import { FavoriteToggle } from '../favorites/FavoriteToggle.tsx'
import { useKickoffChecks } from '../../hooks/useKickoffChecks.ts'
import { useLiveRefresh } from '../../hooks/useLiveRefresh.ts'
import { useMatchDetails } from '../../hooks/useMatchDetails.ts'
import { useNow } from '../../hooks/useNow.ts'
import { detailCountdown } from '../../lib/countdown.ts'
import { dayLabel, formatKickoff } from '../../lib/date.ts'
import { failureMessage } from '../../lib/errors.ts'
import { goalScorers, type GoalLine } from '../../lib/match.ts'
import { Crest } from '../common/Crest.tsx'
import { FootballIcon } from '../common/FootballIcon.tsx'
import { MatchLineups } from './MatchLineups.tsx'
import { MatchSectionTabs } from './MatchSectionTabs.tsx'
import { StatusText } from './MatchRow.tsx'
import { MatchStats } from './MatchStats.tsx'
import { MatchTimeline, MatchTimelineSkeleton } from './MatchTimeline.tsx'
import { formatScore, secondaryButtonClass } from './status.ts'
import { sectionPanelId, sectionTabId, type MatchSection } from './tabs.ts'

interface MatchDetailProps {
  match: Match
  favorites: FavoriteTeamsApi
  /** How often the open match refreshes while live. */
  liveRefreshMs: number
  onBack: () => void
}

function TeamSide({
  team,
  favorites,
}: {
  team: Match['homeTeam']
  favorites: FavoriteTeamsApi
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <Crest src={team.logo} name={team.name} size="xl" />
      <p className="flex max-w-full items-start justify-center gap-0.5 text-sm font-semibold leading-tight text-foreground">
        <span className="line-clamp-2 min-w-0 break-words">{team.name}</span>
        <FavoriteToggle
          name={team.name}
          pressed={favorites.isFavorite(team.id)}
          disabled={!favorites.ready}
          onToggle={() => favorites.toggle(team)}
        />
      </p>
    </div>
  )
}

function Scorers({ goals, label }: { goals: GoalLine[]; label: string }) {
  if (goals.length === 0) return <div />
  return (
    <ul aria-label={label} className="min-w-0 space-y-0.5 text-center text-xs text-muted">
      {goals.map((goal) => (
        <li key={goal.id} className="flex items-start justify-center gap-1">
          <FootballIcon className="mt-0.5 size-3 shrink-0" />
          <span className="min-w-0 wrap-break-word">
            {goal.player && <span className="text-foreground">{goal.player} </span>}
            <span className="tabular-nums">{goal.minute}</span>
            {goal.suffix && ` ${goal.suffix}`}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ScoreBlock({ match, favorites }: { match: Match; favorites: FavoriteTeamsApi }) {
  const upcoming = match.status === 'upcoming'
  const now = useNow(upcoming ? 1000 : null)
  const scorers = useMemo(() => goalScorers(match), [match])
  const hasScorers = scorers.home.length > 0 || scorers.away.length > 0
  return (
    <div className="mx-3 my-3 rounded-3xl border border-border bg-gradient-to-b from-surface to-background px-3 pt-5 pb-4 shadow-sm">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <TeamSide team={match.homeTeam} favorites={favorites} />
        <div className={`flex flex-col items-center gap-2 ${upcoming ? 'pt-4' : 'pt-2'}`}>
          <p
            className={`leading-none tracking-tight tabular-nums text-foreground ${
              match.score ? 'text-5xl font-extrabold' : 'text-xl font-bold'
            }`}
          >
            {match.score ? formatScore(match.score) : formatKickoff(new Date(match.startTime))}
          </p>
          {!upcoming && (
            <div className="text-sm">
              <StatusText match={match} showScore={false} />
            </div>
          )}
        </div>
        <TeamSide team={match.awayTeam} favorites={favorites} />
      </div>
      {upcoming && (
        <p className="mt-3 flex flex-col items-center border-t border-border pt-3 text-sm">
          <span className="text-muted">{dayLabel(new Date(match.startTime), now)}</span>
          <span className="tabular-nums text-foreground">
            {detailCountdown(new Date(match.startTime), now)}
          </span>
        </p>
      )}
      {hasScorers && (
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] gap-2 border-t border-border pt-3">
          <Scorers goals={scorers.home} label={`${match.homeTeam.name} goals`} />
          <span aria-hidden="true" className="w-12" />
          <Scorers goals={scorers.away} label={`${match.awayTeam.name} goals`} />
        </div>
      )}
    </div>
  )
}

export function MatchDetail({ match, favorites, liveRefreshMs, onBack }: MatchDetailProps) {
  const { state, retry, refresh } = useMatchDetails(match)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shown = state.status === 'success' ? state.match : match
  const checked = useMemo(() => [shown], [shown])
  useKickoffChecks(checked, refresh)
  useLiveRefresh(checked, refresh, liveRefreshMs)
  // Tied to the match it was picked on, so a newly opened match starts on Summary
  // while live refreshes (which replace `state.match`, not `match`) keep it.
  const [selected, setSelected] = useState<{ matchId: string; tab: MatchSection } | null>(null)
  const loaded = state.status === 'success' ? state.match : undefined
  const sections: MatchSection[] = [
    'summary',
    ...(loaded?.stats ? (['stats'] as const) : []),
    ...(loaded?.lineups ? (['lineups'] as const) : []),
  ]
  const picked = selected?.matchId === match.id ? selected.tab : 'summary'
  const active = sections.includes(picked) ? picked : 'summary'

  useEffect(() => {
    headingRef.current?.focus()
  }, [match])

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to matches"
          className="rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ArrowLeft aria-hidden="true" className="inline size-4 align-[-3px]" /> Back
        </button>
        <p className="truncate text-xs text-muted">{match.competition.name}</p>
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        {match.homeTeam.name} vs {match.awayTeam.name}
      </h2>
      <ScoreBlock match={shown} favorites={favorites} />
      {sections.length > 1 && (
        <MatchSectionTabs
          sections={sections}
          active={active}
          onChange={(tab) => setSelected({ matchId: match.id, tab })}
        />
      )}
      <SectionPanel section="summary" tabbed={sections.length > 1} active={active}>
        {state.status === 'loading' && <MatchTimelineSkeleton />}
        {state.status === 'error' && (
          <div role="alert" className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <p className="text-sm text-foreground">{failureMessage(state.reason).title}</p>
            <button type="button" onClick={retry} className={secondaryButtonClass}>
              Retry
            </button>
          </div>
        )}
        {state.status === 'success' && <MatchTimeline match={state.match} />}
      </SectionPanel>
      {loaded?.stats && (
        <SectionPanel section="stats" tabbed active={active}>
          <MatchStats match={loaded} />
        </SectionPanel>
      )}
      {loaded?.lineups && (
        <SectionPanel section="lineups" tabbed active={active}>
          <MatchLineups match={loaded} />
        </SectionPanel>
      )}
    </div>
  )
}

/** A tab panel, or the plain timeline section when the match has no other sections. */
function SectionPanel({
  section,
  tabbed,
  active,
  children,
}: {
  section: MatchSection
  tabbed: boolean
  active: MatchSection
  children: ReactNode
}) {
  if (!tabbed) return <section aria-label="Timeline">{children}</section>
  return (
    <div
      role="tabpanel"
      id={sectionPanelId(section)}
      aria-labelledby={sectionTabId(section)}
      hidden={section !== active}
    >
      {children}
    </div>
  )
}
