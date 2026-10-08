import type { Match, Team, TeamMatchStats } from '../../api/types.ts'
import { statShares } from '../../lib/stats.ts'
import { Crest } from '../common/Crest.tsx'

const ROWS: { key: keyof TeamMatchStats; label: string }[] = [
  { key: 'possession', label: 'Possession' },
  { key: 'shots', label: 'Shots' },
  { key: 'shotsOnTarget', label: 'Shots on target' },
  { key: 'corners', label: 'Corners' },
  { key: 'fouls', label: 'Fouls' },
]

function formatStat(key: keyof TeamMatchStats, value: number): string {
  return key === 'possession' ? `${Math.round(value)}%` : String(value)
}

const shortName = (team: Team) => team.shortName ?? team.name

function TeamLabel({ team, align }: { team: Team; align: 'start' | 'end' }) {
  return (
    <span
      className={`flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground ${
        align === 'end' ? 'flex-row-reverse' : ''
      }`}
    >
      <Crest src={team.logo} name={team.name} size="md" />
      <span className="min-w-0 truncate">{shortName(team)}</span>
    </span>
  )
}

/** Each side's share of the total, home from the left and away from the right; the leader in accent. */
function ComparisonBar({ home, away }: { home: number; away: number }) {
  const shares = statShares(home, away)
  const color = (mine: number, theirs: number) => (mine > theirs ? 'bg-accent' : 'bg-muted/40')
  return (
    <span aria-hidden="true" className="flex h-1.5 gap-1">
      <span className="flex flex-1 justify-end overflow-hidden rounded-full bg-surface">
        <span className={`h-full rounded-full ${color(home, away)}`} style={{ width: `${shares.home}%` }} />
      </span>
      <span className="flex flex-1 overflow-hidden rounded-full bg-surface">
        <span className={`h-full rounded-full ${color(away, home)}`} style={{ width: `${shares.away}%` }} />
      </span>
    </span>
  )
}

/** Team statistics with comparison bars, or nothing when the match has none. */
export function MatchStats({ match }: { match: Match }) {
  if (!match.stats) return null
  const { home, away } = match.stats
  const homeName = shortName(match.homeTeam)
  const awayName = shortName(match.awayTeam)
  return (
    <div className="pt-2 pb-3">
      <div aria-hidden="true" className="grid grid-cols-2 gap-4 px-4 py-2">
        <TeamLabel team={match.homeTeam} align="start" />
        <TeamLabel team={match.awayTeam} align="end" />
      </div>
      <table className="w-full text-sm">
        <caption className="sr-only">
          Team statistics, {homeName} and {awayName}
        </caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">{homeName}</th>
            <th scope="col">Statistic</th>
            <th scope="col">{awayName}</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(({ key, label }) => {
            const homeValue = home[key]
            const awayValue = away[key]
            if (homeValue === undefined || awayValue === undefined) return null
            return (
              <tr key={key}>
                <td className="w-16 px-4 pt-3 text-left align-top font-semibold tabular-nums text-foreground">
                  {formatStat(key, homeValue)}
                </td>
                <th scope="row" className="pt-3 text-center align-top font-normal text-muted">
                  {label}
                  <span className="mt-1.5 block">
                    <ComparisonBar home={homeValue} away={awayValue} />
                  </span>
                </th>
                <td className="w-16 px-4 pt-3 text-right align-top font-semibold tabular-nums text-foreground">
                  {formatStat(key, awayValue)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
