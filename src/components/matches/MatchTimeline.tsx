import type { Match, MatchEvent, MatchEventType } from '../../api/types.ts'

const EVENT_DISPLAY: Record<MatchEventType, { icon: string; label: string }> = {
  goal: { icon: '⚽', label: 'Goal' },
  'own-goal': { icon: '⚽', label: 'Own goal' },
  'penalty-goal': { icon: '⚽', label: 'Penalty goal' },
  'penalty-missed': { icon: '❌', label: 'Missed penalty' },
  'yellow-card': { icon: '🟨', label: 'Yellow card' },
  'red-card': { icon: '🟥', label: 'Red card' },
  substitution: { icon: '🔄', label: 'Substitution' },
}

const SUFFIX: Partial<Record<MatchEventType, string>> = {
  'own-goal': ' (OG)',
  'penalty-goal': ' (pen)',
}

function teamName(match: Match, teamId: string | undefined): string | undefined {
  const team = [match.homeTeam, match.awayTeam].find((candidate) => candidate.id === teamId)
  return team ? (team.shortName ?? team.name) : undefined
}

function EventRow({ event, match }: { event: MatchEvent; match: Match }) {
  const { icon, label } = EVENT_DISPLAY[event.type]
  const team = teamName(match, event.teamId)
  return (
    <li className="flex items-start gap-3 px-4 py-2 text-sm">
      <span className="w-12 shrink-0 tabular-nums text-muted">{event.minute}</span>
      <span aria-hidden="true" className="shrink-0">
        {icon}
      </span>
      <span className="sr-only">{label}:</span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground">
          {event.player ?? label}
          {SUFFIX[event.type]}
        </p>
        {event.playerOff && <p className="text-xs text-muted">Replaces {event.playerOff}</p>}
      </div>
      {team && <span className="shrink-0 text-xs text-muted">{team}</span>}
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
