import type { Lineup, LineupPlayer, Match, Team } from '../../api/types.ts'
import { ChevronDown } from 'lucide-react'
import { pitchLines, surname } from '../../lib/pitch.ts'
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

/** Closed by default; `named` titles it with the team, for when no team heading sits above it. */
function Substitutes({ team, lineup, named = false }: { team: Team; lineup: Lineup; named?: boolean }) {
  if (lineup.substitutes.length === 0) return null
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
      <ul aria-label={`${team.name} substitutes`} className="pb-1">
        {lineup.substitutes.map((player) => (
          <PlayerRow key={player.id} player={player} />
        ))}
      </ul>
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
function TeamLineup({ team, lineup }: { team: Team; lineup: Lineup }) {
  return (
    <div className="py-2">
      <TeamHeading team={team} lineup={lineup} />
      <ol aria-label={`${team.name} starters`}>
        {lineup.starters.map((player) => (
          <PlayerRow key={player.id} player={player} />
        ))}
      </ol>
      <Substitutes team={team} lineup={lineup} />
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
      <span aria-hidden="true" className="max-w-full truncate text-[11px] font-medium leading-tight text-pitch-line">
        {surname(player.name)}
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
        <Substitutes team={match.homeTeam} lineup={lineups.home} named />
        <Substitutes team={match.awayTeam} lineup={lineups.away} named />
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
          <TeamLineup team={match.homeTeam} lineup={lineups.home} />
          <TeamLineup team={match.awayTeam} lineup={lineups.away} />
        </div>
      )}
    </div>
  )
}
