import type { Match, Team } from '../api/types.ts'

/** The value when it is a parseable https: URL, otherwise undefined; guards every crest <img src>. */
export function safeImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  try {
    return new URL(value).protocol === 'https:' ? value : undefined
  } catch {
    return undefined
  }
}

/** Up to two uppercase letters standing in for a missing crest: "Manchester City" → "MC", "Arsenal" → "AR". */
export function initials(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((word) => /\p{L}/u.test(word))
  if (words.length === 0) return ''
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]
  return letters.toLocaleUpperCase()
}

export interface LogoLookup {
  teams: ReadonlyMap<string, string>
  competitions: ReadonlyMap<string, string>
}

/** Safe crest and competition logo URLs by id, from loaded matches and teams; the first seen wins. */
export function collectLogos(matches: Match[], teams: Team[] = []): LogoLookup {
  const teamLogos = new Map<string, string>()
  const competitionLogos = new Map<string, string>()
  const addTeam = (team: Team) => {
    const url = safeImageUrl(team.logo)
    if (url && !teamLogos.has(team.id)) teamLogos.set(team.id, url)
  }
  for (const match of matches) {
    addTeam(match.homeTeam)
    addTeam(match.awayTeam)
    const url = safeImageUrl(match.competition.logo)
    if (url && !competitionLogos.has(match.competition.id)) {
      competitionLogos.set(match.competition.id, url)
    }
  }
  teams.forEach(addTeam)
  return { teams: teamLogos, competitions: competitionLogos }
}
