import type { Team } from '../api/types.ts'

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
