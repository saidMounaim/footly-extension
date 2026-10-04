import type { Competition, Match, Team } from '../api/types.ts'

/** Lowercases and strips accents so "Atlético" matches "atletico". */
export function foldText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

/** Teams whose name or short name contains the query, ignoring case and accents. */
export function searchTeams(teams: Team[], query: string): Team[] {
  const needle = foldText(query)
  if (!needle) return []
  return teams.filter(
    (team) =>
      foldText(team.name).includes(needle) ||
      (team.shortName !== undefined && foldText(team.shortName).includes(needle)),
  )
}

/** Competitions whose name contains the query, ignoring case and accents. */
export function searchCompetitions<C extends Pick<Competition, 'name'>>(competitions: readonly C[], query: string): C[] {
  const needle = foldText(query)
  if (!needle) return []
  return competitions.filter((competition) => foldText(competition.name).includes(needle))
}

/** Distinct teams playing in `matches`, sorted by name. */
export function teamsInMatches(matches: Match[]): Team[] {
  const byId = new Map<string, Team>()
  for (const match of matches) {
    for (const team of [match.homeTeam, match.awayTeam]) {
      if (!byId.has(team.id)) byId.set(team.id, team)
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function matchText(match: Match): string {
  const { homeTeam, awayTeam, competition } = match
  return foldText(
    [homeTeam.name, homeTeam.shortName, awayTeam.name, awayTeam.shortName, competition.name]
      .filter(Boolean)
      .join(' '),
  )
}

/** Matches where every word of the query appears in a team or competition name, keeping order. */
export function searchMatches(matches: Match[], query: string): Match[] {
  const words = foldText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  return matches.filter((match) => {
    const text = matchText(match)
    return words.every((word) => text.includes(word))
  })
}
