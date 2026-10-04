import type { Match, TeamMatchStats } from '../../api/types.ts'
import { sectionHeadingClass } from './status.ts'

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

/** Team statistics table, or nothing when the match has none. */
export function MatchStats({ match }: { match: Match }) {
  if (!match.stats) return null
  const { home, away } = match.stats
  const homeName = match.homeTeam.shortName ?? match.homeTeam.name
  const awayName = match.awayTeam.shortName ?? match.awayTeam.name
  return (
    <section aria-labelledby="match-stats-heading">
      <h3 id="match-stats-heading" className={sectionHeadingClass}>
        Statistics
      </h3>
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
        <tbody className="divide-y divide-border">
          {ROWS.map(({ key, label }) => {
            const homeValue = home[key]
            const awayValue = away[key]
            if (homeValue === undefined || awayValue === undefined) return null
            return (
              <tr key={key}>
                <td className="w-16 px-4 py-2 text-left font-semibold tabular-nums text-foreground">
                  {formatStat(key, homeValue)}
                </td>
                <th scope="row" className="py-2 text-center font-normal text-muted">
                  {label}
                </th>
                <td className="w-16 px-4 py-2 text-right font-semibold tabular-nums text-foreground">
                  {formatStat(key, awayValue)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
