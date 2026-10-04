import type { Lineup, LineupPlayer, Match, Team } from '../../api/types.ts'
import { sectionHeadingClass } from './status.ts'

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

function TeamLineup({ team, lineup }: { team: Team; lineup: Lineup }) {
  return (
    <div className="py-2">
      <h4 className="flex items-baseline justify-between gap-2 px-4 py-1 text-sm font-semibold text-foreground">
        <span className="min-w-0 truncate">{team.name}</span>
        {lineup.formation && (
          <span className="shrink-0 text-xs font-normal tabular-nums text-muted">
            <span className="sr-only">Formation </span>
            {lineup.formation}
          </span>
        )}
      </h4>
      <ol aria-label={`${team.name} starters`}>
        {lineup.starters.map((player) => (
          <PlayerRow key={player.id} player={player} />
        ))}
      </ol>
      {lineup.substitutes.length > 0 && (
        <>
          <p className="px-4 pt-2 pb-1 text-xs font-medium text-muted">Substitutes</p>
          <ul aria-label={`${team.name} substitutes`}>
            {lineup.substitutes.map((player) => (
              <PlayerRow key={player.id} player={player} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/** Both teams' starters and substitutes stacked to fit the popup, or nothing without lineups. */
export function MatchLineups({ match }: { match: Match }) {
  if (!match.lineups) return null
  return (
    <section aria-labelledby="match-lineups-heading">
      <h3 id="match-lineups-heading" className={sectionHeadingClass}>
        Lineups
      </h3>
      <div className="divide-y divide-border">
        <TeamLineup team={match.homeTeam} lineup={match.lineups.home} />
        <TeamLineup team={match.awayTeam} lineup={match.lineups.away} />
      </div>
    </section>
  )
}
