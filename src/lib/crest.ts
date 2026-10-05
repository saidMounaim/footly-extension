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

const ESPN_IMAGE_HOST = 'a.espncdn.com'

/**
 * ESPN images through ESPN's resizer at `px` square, so a 20px crest doesn't
 * download a 500px PNG; any other safe URL is returned unchanged.
 */
export function sizedCrestUrl(url: string, px: number): string {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || parsed.host !== ESPN_IMAGE_HOST) return url
  if (!parsed.pathname.startsWith('/i/')) return url
  const query = new URLSearchParams({ img: parsed.pathname, w: String(px), h: String(px) })
  return `https://${ESPN_IMAGE_HOST}/combiner/i?${query}`
}
