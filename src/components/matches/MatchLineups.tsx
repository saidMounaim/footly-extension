import type { Lineup, LineupPlayer, Match, MatchEvent, Team } from '../../api/types.ts'
import { ArrowUp, ChevronDown } from 'lucide-react'
import { substituteEntries, type SubstituteEntry } from '../../lib/match.ts'
import { pitchLines } from '../../lib/pitch.ts'
import { Crest } from '../common/Crest.tsx'

function PlayerRow({ player }: { player: LineupPlayer }) {
  return (
    <li className="flex items-center gap-3 px-4 py-1.5 text-sm">
      <span className="w-6 shrink-0 text-right tabular-nums text-muted">
        {player.jersey && (
          <>
            <span className="sr-only">Number </span>
            {player.jersey}
          </>
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-foreground">{player.name}</span>
      {player.position && (
        <span className="shrink-0 text-xs text-muted">
          <span className="sr-only">Position </span>
          {player.position}
        </span>
      )}
    </li>
  )
}

function NumberDisc({ jersey }: { jersey: string | undefined }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xs font-bold tabular-nums text-foreground">
      {jersey && (
        <>
          <span className="sr-only">Number </span>
          {jersey}
        </>
      )}
    </span>
  )
}

function UsedSubRow({ entry }: { entry: SubstituteEntry }) {
  return (
    <li className="flex items-start gap-3 px-4 py-1.5 text-sm">
      <NumberDisc jersey={entry.player.jersey} />
      <span className="min-w-0 flex-1">
        <span className="block wrap-break-word text-foreground">{entry.player.name}</span>
        {entry.playerOff && (
          <span className="block wrap-break-word text-xs text-muted">for {entry.playerOff}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-0.5 pt-0.5 text-xs font-semibold tabular-nums text-accent">
        <ArrowUp aria-hidden="true" className="size-3.5" />
        <span className="sr-only">Came on </span>
        {entry.minute}
      </span>
    </li>
  )
}

function UnusedSubRow({ player }: { player: LineupPlayer }) {
  return (
    <li className="flex items-center gap-3 px-4 py-1.5 text-sm text-muted">
      <NumberDisc jersey={player.jersey} />
      <span className="min-w-0 flex-1 wrap-break-word">{player.name}</span>
      {player.position && (
        <span className="shrink-0 text-xs">
          <span className="sr-only">Position </span>
          {player.position}
        </span>
      )}
    </li>
  )
}

/**
 * Closed by default: subs who came on first, then the unused ones. `named` titles
 * it with the team, for when no team heading sits above it.
 */
function Substitutes({
  team,
  lineup,
  events,
  named = false,
}: {
  team: Team
  lineup: Lineup
  events: MatchEvent[]
  named?: boolean
}) {
  if (lineup.substitutes.length === 0) return null
  const { used, unused } = substituteEntries(lineup, events, team.id)
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        {named && <Crest src={team.logo} name={team.name} size="md" />}
        <span className="min-w-0 flex-1 truncate font-medium">
          {named ? `${team.name} substitutes` : 'Substitutes'}{' '}
          <span className="font-normal tabular-nums text-muted">({lineup.substitutes.length})</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="pb-1">
        {used.length > 0 && (
          <ul aria-label={`${team.name} substitutes who came on`}>
            {used.map((entry) => (
              <UsedSubRow key={entry.player.id} entry={entry} />
            ))}
          </ul>
        )}
        {used.length > 0 && unused.length > 0 && (
          <p className="px-4 pt-2 pb-1 text-xs font-medium text-muted">Unused</p>
        )}
        {unused.length > 0 && (
          <ul aria-label={used.length > 0 ? `${team.name} unused substitutes` : `${team.name} substitutes`}>
            {unused.map((player) => (
              <UnusedSubRow key={player.id} player={player} />
            ))}
          </ul>
        )}
      </div>
    </details>
  )
}

function TeamHeading({ team, lineup }: { team: Team; lineup: Lineup }) {
  return (
    <h4 className="flex items-center gap-2 px-4 py-1 text-sm font-semibold text-foreground">
      <Crest src={team.logo} name={team.name} size="md" />
      <span className="min-w-0 flex-1 truncate">{team.name}</span>
      {lineup.formation && (
        <span className="shrink-0 text-xs font-normal tabular-nums text-muted">
          <span className="sr-only">Formation </span>
          {lineup.formation}
        </span>
      )}
    </h4>
  )
}

/** Today's list layout: starters then substitutes, used when the pitch can't be drawn. */
function TeamLineup({ team, lineup, events }: { team: Team; lineup: Lineup; events: MatchEvent[] }) {
  return (
    <div className="py-2">
      <TeamHeading team={team} lineup={lineup} />
      <ol aria-label={`${team.name} starters`}>
        {lineup.starters.map((player) => (
          <PlayerRow key={player.id} player={player} />
        ))}
      </ol>
      <Substitutes team={team} lineup={lineup} events={events} />
    </div>
  )
}

/** Columns per pitch row: divisible by every line size from 1 to 5, so each line spreads evenly. */
const PITCH_COLUMNS = 60

function PitchPlayer({ player, row, column, span }: { player: LineupPlayer; row: number; column: number; span: number }) {
  return (
    <li
      style={{ gridRow: row, gridColumn: `${column} / span ${span}` }}
      className="flex min-w-0 flex-col items-center gap-0.5 px-0.5"
    >
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-full bg-pitch-line text-xs font-bold tabular-nums text-pitch shadow-sm"
      >
        {player.jersey}
      </span>
      <span
        aria-hidden="true"
        title={player.name}
        className="line-clamp-2 max-w-full text-center text-[10px] font-medium leading-tight wrap-break-word text-pitch-line"
      >
        {player.name}
      </span>
      <span className="sr-only">
        {player.jersey && `Number ${player.jersey}, `}
        {player.name}
        {player.position && `, ${player.position}`}
      </span>
    </li>
  )
}

/**
 * One team's half: its label, then its lines as grid rows. The home half is
 * drawn goalkeeper at the bottom; the away half goalkeeper at the top and
 * mirrored, as both teams face each other.
 */
function PitchHalf({
  team,
  lineup,
  lines,
  side,
}: {
  team: Team
  lineup: Lineup
  lines: LineupPlayer[][]
  side: 'home' | 'away'
}) {
  const label = (
    <p className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-pitch-line">
      <Crest src={team.logo} name={team.name} size="md" />
      <span className="min-w-0 flex-1 truncate">{team.name}</span>
      {lineup.formation && (
        <span className="shrink-0 font-normal tabular-nums">
          <span className="sr-only">Formation </span>
          {lineup.formation}
        </span>
      )}
    </p>
  )
  return (
    <div className="relative">
      {side === 'away' && label}
      <ol
        aria-label={`${team.name} starters`}
        className="grid gap-y-2 px-1 py-2"
        style={{ gridTemplateColumns: `repeat(${PITCH_COLUMNS}, minmax(0, 1fr))` }}
      >
        {lines.flatMap((line, index) => {
          // Rows read from this team's own goal towards the halfway line.
          const row = side === 'away' ? index + 1 : lines.length - index
          const ordered = side === 'away' ? [...line].reverse() : line
          const span = PITCH_COLUMNS / ordered.length
          return ordered.map((player, slot) => (
            <PitchPlayer key={player.id} player={player} row={row} column={slot * span + 1} span={span} />
          ))
        })}
      </ol>
      {side === 'home' && label}
    </div>
  )
}

/** Field markings only; the players carry all the meaning. */
function PitchMarkings() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-lg border border-pitch-line/50">
      <div className="absolute inset-x-0 top-1/2 border-t border-pitch-line/50" />
      <div className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-pitch-line/50" />
      <div className="absolute top-0 left-1/2 h-10 w-1/2 -translate-x-1/2 border border-t-0 border-pitch-line/50" />
      <div className="absolute bottom-0 left-1/2 h-10 w-1/2 -translate-x-1/2 border border-b-0 border-pitch-line/50" />
    </div>
  )
}

function Pitch({
  match,
  lineups,
  home,
  away,
}: {
  match: Match
  lineups: NonNullable<Match['lineups']>
  home: LineupPlayer[][]
  away: LineupPlayer[][]
}) {
  return (
    <>
      <div
        className="relative mx-3 overflow-hidden rounded-2xl shadow-sm"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, var(--pitch) 0 32px, var(--pitch-stripe) 32px 64px)',
        }}
      >
        <PitchMarkings />
        <div className="relative flex flex-col gap-4">
          <PitchHalf team={match.awayTeam} lineup={lineups.away} lines={away} side="away" />
          <PitchHalf team={match.homeTeam} lineup={lineups.home} lines={home} side="home" />
        </div>
      </div>
      <div className="mt-2 divide-y divide-border">
        <Substitutes team={match.homeTeam} lineup={lineups.home} events={match.events} named />
        <Substitutes team={match.awayTeam} lineup={lineups.away} events={match.events} named />
      </div>
    </>
  )
}

/**
 * Both teams' starters on one pitch with substitutes listed below, or today's
 * stacked lists when a position can't be placed; nothing without lineups.
 */
export function MatchLineups({ match }: { match: Match }) {
  if (!match.lineups) return null
  const { lineups } = match
  const home = pitchLines(lineups.home.starters, lineups.home.formation)
  const away = pitchLines(lineups.away.starters, lineups.away.formation)
  return (
    <div className="pt-2 pb-3">
      {home && away ? (
        <Pitch match={match} lineups={lineups} home={home} away={away} />
      ) : (
        <div className="divide-y divide-border">
          <TeamLineup team={match.homeTeam} lineup={lineups.home} events={match.events} />
          <TeamLineup team={match.awayTeam} lineup={lineups.away} events={match.events} />
        </div>
      )}
    </div>
  )
}
