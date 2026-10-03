import type { Competition, Match, MatchStatus, Team } from './types.ts'

const ESPN_SOCCER_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer'

/** Thrown when a scoreboard response does not have the expected top-level shape. */
export class EspnResponseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EspnResponseError'
  }
}

/** Scoreboard URL for one competition slug and one `YYYYMM` month. */
export function scoreboardUrl(slug: string, month: string): string {
  return `${ESPN_SOCCER_BASE}/${slug}/scoreboard?dates=${month}`
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function httpsUrl(value: unknown): string | undefined {
  const raw = text(value)
  if (!raw) return undefined
  try {
    return new URL(raw).protocol === 'https:' ? raw : undefined
  } catch {
    return undefined
  }
}

function toCompetition(league: unknown): Competition | undefined {
  if (!isRecord(league)) return undefined
  const id = text(league.id)
  const name = text(league.name)
  if (!id || !name) return undefined
  const logos = Array.isArray(league.logos) ? league.logos : []
  const logo = logos
    .map((entry) => (isRecord(entry) ? httpsUrl(entry.href) : undefined))
    .find((href) => href !== undefined)
  return { id, name, ...(logo && { logo }) }
}

function toTeam(team: unknown): Team | undefined {
  if (!isRecord(team)) return undefined
  const id = text(team.id)
  const name = text(team.displayName)
  if (!id || !name) return undefined
  const shortName = text(team.shortDisplayName)
  const logo = httpsUrl(team.logo)
  return { id, name, ...(shortName && { shortName }), ...(logo && { logo }) }
}

function toStatus(status: unknown): MatchStatus | undefined {
  if (!isRecord(status) || !isRecord(status.type)) return undefined
  const { name, state } = status.type
  if (name === 'STATUS_HALFTIME') return 'halftime'
  if (name === 'STATUS_POSTPONED') return 'postponed'
  if (name === 'STATUS_CANCELED' || name === 'STATUS_ABANDONED') return 'cancelled'
  if (state === 'pre') return 'upcoming'
  if (state === 'in') return 'live'
  if (state === 'post') return 'finished'
  return undefined
}

function toGoals(value: unknown): number | undefined {
  return typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : undefined
}

function toMatch(event: unknown, competition: Competition): Match | undefined {
  if (!isRecord(event)) return undefined
  const id = text(event.id)
  const date = text(event.date)
  const status = toStatus(event.status)
  if (!id || !date || !status) return undefined
  const time = Date.parse(date)
  if (Number.isNaN(time)) return undefined

  const contest = Array.isArray(event.competitions) ? event.competitions[0] : undefined
  if (!isRecord(contest) || !Array.isArray(contest.competitors)) return undefined
  const sides = contest.competitors.filter(isRecord)
  const home = sides.find((side) => side.homeAway === 'home')
  const away = sides.find((side) => side.homeAway === 'away')
  const homeTeam = toTeam(home?.team)
  const awayTeam = toTeam(away?.team)
  if (!homeTeam || !awayTeam) return undefined

  const match: Match = {
    id,
    homeTeam,
    awayTeam,
    competition,
    startTime: new Date(time).toISOString(),
    status,
    events: [],
  }
  if (status === 'live' || status === 'halftime' || status === 'finished') {
    const homeGoals = toGoals(home?.score)
    const awayGoals = toGoals(away?.score)
    if (homeGoals !== undefined && awayGoals !== undefined) {
      match.score = { home: homeGoals, away: awayGoals }
    }
  }
  return match
}

/**
 * Converts an untrusted ESPN scoreboard response into Footly matches.
 * Malformed events are skipped; a malformed response throws EspnResponseError.
 */
export function normalizeScoreboard(json: unknown): Match[] {
  if (!isRecord(json) || !Array.isArray(json.events)) {
    throw new EspnResponseError('Scoreboard response has no events list')
  }
  const competition = toCompetition(Array.isArray(json.leagues) ? json.leagues[0] : undefined)
  if (!competition) {
    throw new EspnResponseError('Scoreboard response has no valid league')
  }
  return json.events.flatMap((event) => toMatch(event, competition) ?? [])
}
