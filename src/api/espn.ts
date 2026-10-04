import type {
  Competition,
  Match,
  MatchEvent,
  MatchEventType,
  MatchStatus,
  Team,
} from './types.ts'

const ESPN_SOCCER_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer'

/** Thrown when an ESPN response does not have the expected top-level shape. */
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

/** Summary URL for one match in a competition. */
export function summaryUrl(slug: string, matchId: string): string {
  return `${ESPN_SOCCER_BASE}/${slug}/summary?event=${encodeURIComponent(matchId)}`
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

function toCompetition(league: unknown, id: string): Competition | undefined {
  if (!isRecord(league)) return undefined
  const name = text(league.name)
  if (!name) return undefined
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

/** Home and away competitor records from an ESPN competition object. */
function sides(contest: unknown): { home?: UnknownRecord; away?: UnknownRecord } {
  if (!isRecord(contest) || !Array.isArray(contest.competitors)) return {}
  const competitors = contest.competitors.filter(isRecord)
  return {
    home: competitors.find((side) => side.homeAway === 'home'),
    away: competitors.find((side) => side.homeAway === 'away'),
  }
}

/** Score for statuses that have one, when both sides are whole numbers. */
function toScore(
  status: MatchStatus,
  home: UnknownRecord | undefined,
  away: UnknownRecord | undefined,
): Match['score'] {
  if (status !== 'live' && status !== 'halftime' && status !== 'finished') return undefined
  const homeGoals = toGoals(home?.score)
  const awayGoals = toGoals(away?.score)
  if (homeGoals === undefined || awayGoals === undefined) return undefined
  return { home: homeGoals, away: awayGoals }
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
  const { home, away } = sides(contest)
  const homeTeam = toTeam(home?.team)
  const awayTeam = toTeam(away?.team)
  if (!homeTeam || !awayTeam) return undefined

  const score = toScore(status, home, away)
  return {
    id,
    homeTeam,
    awayTeam,
    competition,
    startTime: new Date(time).toISOString(),
    status,
    ...(score && { score }),
    events: [],
  }
}

/**
 * Converts an untrusted ESPN scoreboard response into Footly matches.
 * `competitionId` is the slug the scoreboard was requested with.
 * Malformed events are skipped; a malformed response throws EspnResponseError.
 */
export function normalizeScoreboard(json: unknown, competitionId: string): Match[] {
  if (!isRecord(json) || !Array.isArray(json.events)) {
    throw new EspnResponseError('Scoreboard response has no events list')
  }
  const league = Array.isArray(json.leagues) ? json.leagues[0] : undefined
  const competition = toCompetition(league, competitionId)
  if (!competition) {
    throw new EspnResponseError('Scoreboard response has no valid league')
  }
  return json.events.flatMap((event) => toMatch(event, competition) ?? [])
}

function toEventType(type: string, scoringPlay: boolean): MatchEventType | undefined {
  if (type === 'own-goal') return 'own-goal'
  if (type.startsWith('penalty---')) return scoringPlay ? 'penalty-goal' : 'penalty-missed'
  if (type === 'goal' || type.startsWith('goal---') || scoringPlay) return 'goal'
  if (type === 'yellow-card') return 'yellow-card'
  if (type.includes('red-card') || type.includes('second-yellow')) return 'red-card'
  if (type === 'substitution') return 'substitution'
  return undefined
}

function participantName(participants: unknown[], index: number): string | undefined {
  const participant = participants[index]
  return isRecord(participant) && isRecord(participant.athlete)
    ? text(participant.athlete.displayName)
    : undefined
}

interface TimedEvent {
  event: MatchEvent
  clock: number
}

function toTimedEvent(raw: unknown, teamIds: string[]): TimedEvent | undefined {
  if (!isRecord(raw) || !isRecord(raw.type) || !isRecord(raw.clock)) return undefined
  const id = text(raw.id)
  const providerType = text(raw.type.type)
  const minute = text(raw.clock.displayValue)
  const clock = raw.clock.value
  if (!id || !providerType || !minute || typeof clock !== 'number' || !Number.isFinite(clock)) {
    return undefined
  }
  const type = toEventType(providerType, raw.scoringPlay === true)
  if (!type) return undefined

  const teamId = isRecord(raw.team) ? text(raw.team.id) : undefined
  const participants = Array.isArray(raw.participants) ? raw.participants : []
  const player = participantName(participants, 0)
  const playerOff = type === 'substitution' ? participantName(participants, 1) : undefined
  return {
    clock,
    event: {
      id,
      type,
      minute,
      ...(teamId && teamIds.includes(teamId) && { teamId }),
      ...(player && { player }),
      ...(playerOff && { playerOff }),
    },
  }
}

/**
 * Applies an untrusted ESPN match summary to a match from the list: current
 * status and score (kept from `match` when unusable) and a chronological event
 * timeline. Malformed events are skipped; a non-object response throws.
 */
export function normalizeSummary(json: unknown, match: Match): Match {
  if (!isRecord(json)) {
    throw new EspnResponseError('Summary response is not an object')
  }
  const header = isRecord(json.header) ? json.header : {}
  const contest = Array.isArray(header.competitions) ? header.competitions[0] : undefined
  const status = isRecord(contest) ? toStatus(contest.status) : undefined
  const { home, away } = sides(contest)

  const teamIds = [match.homeTeam.id, match.awayTeam.id]
  const events = (Array.isArray(json.keyEvents) ? json.keyEvents : [])
    .flatMap((raw) => toTimedEvent(raw, teamIds) ?? [])
    .sort((a, b) => a.clock - b.clock)
    .map(({ event }) => event)

  const updated: Match = { ...match, events }
  if (!status) return updated
  updated.status = status
  const score = toScore(status, home, away)
  if (score) updated.score = score
  else delete updated.score
  return updated
}
