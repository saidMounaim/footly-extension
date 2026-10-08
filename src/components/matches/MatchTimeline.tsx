import { ArrowLeftRight, CircleX } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Match, MatchEvent, MatchEventType, Team } from '../../api/types.ts'
import { Crest } from '../common/Crest.tsx'
import { FootballIcon } from '../common/FootballIcon.tsx'

const iconClass = 'size-4 text-muted'

/** A small card shape; the event label beside it names the card. */
function Card({ color }: { color: 'bg-card-yellow' | 'bg-card-red' }) {
  return <span className={`inline-block h-3.5 w-2.5 rounded-[2px] ${color}`} />
}

const EVENT_DISPLAY: Record<MatchEventType, { icon: ReactNode; label: string }> = {
  goal: { icon: <FootballIcon className={iconClass} />, label: 'Goal' },
  'own-goal': { icon: <FootballIcon className={iconClass} />, label: 'Own goal' },
  'penalty-goal': { icon: <FootballIcon className={iconClass} />, label: 'Penalty goal' },
  'penalty-missed': { icon: <CircleX className={iconClass} />, label: 'Missed penalty' },
  'yellow-card': { icon: <Card color="bg-card-yellow" />, label: 'Yellow card' },
  'red-card': { icon: <Card color="bg-card-red" />, label: 'Red card' },
  substitution: { icon: <ArrowLeftRight className={iconClass} />, label: 'Substitution' },
}

const SUFFIX: Partial<Record<MatchEventType, string>> = {
  'own-goal': ' (OG)',
  'penalty-goal': ' (pen)',
}

function eventTeam(match: Match, teamId: string | undefined): { team: Team; side: 'home' | 'away' } | undefined {
  if (teamId === undefined) return undefined
  if (teamId === match.homeTeam.id) return { team: match.homeTeam, side: 'home' }
  if (teamId === match.awayTeam.id) return { team: match.awayTeam, side: 'away' }
  return undefined
}

/**
 * One event on a split timeline: the minute in the centre, home events to its
 * left and away events to its right, each with its crest on the outer edge.
 * Events without a known team sit centred under the minute.
 */
export function EventRow({ event, match }: { event: MatchEvent; match: Match }) {
  const { icon, label } = EVENT_DISPLAY[event.type]
  const owner = eventTeam(match, event.teamId)
  const placement =
    owner?.side === 'home'
      ? 'col-start-1 row-start-1 flex-row-reverse justify-start text-right'
      : owner?.side === 'away'
        ? 'col-start-3 row-start-1'
        : 'col-span-3 row-start-2 justify-center text-center'
  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-start gap-x-2 gap-y-1 px-3 py-2 text-sm">
      <span className="col-start-2 row-start-1 w-11 rounded-full bg-surface py-0.5 text-center text-xs tabular-nums text-muted">
        {event.minute}
      </span>
      <div className={`flex min-w-0 items-start gap-2 ${placement}`}>
        <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center">
          {icon}
        </span>
        <span className="sr-only">
          {label}
          {owner && `, ${owner.team.name}`}:
        </span>
        <div className="min-w-0">
          <p className="wrap-break-word text-foreground">
            {event.player ?? label}
            {SUFFIX[event.type]}
          </p>
          {event.playerOff && (
            <p className="wrap-break-word text-xs text-muted">Replaces {event.playerOff}</p>
          )}
        </div>
        {owner && (
          <span className="mt-0.5 flex shrink-0">
            <Crest src={owner.team.logo} name={owner.team.name} size="sm" />
          </span>
        )}
      </div>
    </li>
  )
}

export function MatchTimeline({ match }: { match: Match }) {
  if (match.events.length === 0) {
    return <p className="px-6 py-8 text-center text-sm text-muted">No match events yet.</p>
  }
  return (
    <ol aria-label="Match events" className="divide-y divide-border">
      {match.events.map((event) => (
        <EventRow key={event.id} event={event} match={match} />
      ))}
    </ol>
  )
}

export function MatchTimelineSkeleton() {
  return (
    <div aria-busy="true" className="px-4 py-3">
      <span className="sr-only">Loading match events…</span>
      <ul aria-hidden="true" className="space-y-3">
        {[0, 1, 2, 3].map((row) => (
          <li key={row} className="flex animate-pulse items-center gap-3">
            <div className="h-3 w-8 rounded bg-surface" />
            <div className="h-3 w-4 rounded bg-surface" />
            <div className="h-3 flex-1 rounded bg-surface" />
          </li>
        ))}
      </ul>
    </div>
  )
}
