import type {
  Competition,
  Lineup,
  LineupPlayer,
  Match,
  MatchEvent,
  MatchEventType,
  MatchStatus,
  Team,
  TeamMatchStats,
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

/** Standings URL for one competition slug; used for the club list because it allows CORS. */
export function standingsUrl(slug: string): string {
  return `https://site.api.espn.com/apis/v2/sports/soccer/${slug}/standings`
}

/**
 * One team's schedule across every competition it plays in. ESPN returns past
 * matches by default and upcoming ones only with `fixture=true`.
 */
export function teamScheduleUrl(teamId: string, fixtures: boolean): string {
  const url = `${ESPN_SOCCER_BASE}/all/teams/${encodeURIComponent(teamId)}/schedule`
  return fixtures ? `${url}?fixture=true` : url
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
  // Scoreboards give `logo`; team schedules give a `logos` list instead.
  const logos = Array.isArray(team.logos) ? team.logos : []
  const logo =
    httpsUrl(team.logo) ??
    logos
      .map((entry) => (isRecord(entry) ? httpsUrl(entry.href) : undefined))
      .find((href) => href !== undefined)
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

/** Scoreboards give the score as a string; team schedules as `{ displayValue }`. */
function toGoals(value: unknown): number | undefined {
  const raw = isRecord(value) ? value.displayValue : value
  return typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : undefined
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
  const contest = Array.isArray(event.competitions) ? event.competitions[0] : undefined
  // Team schedules put the status on the competition rather than the event.
  const status = toStatus(event.status) ?? toStatus(isRecord(contest) ? contest.status : undefined)
  if (!id || !date || !status) return undefined
  const time = Date.parse(date)
  if (Number.isNaN(time)) return undefined

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

/**
 * Converts an untrusted ESPN team schedule into Footly matches, each with its
 * own competition from the event's league. Malformed events and events without
 * a league slug are skipped; a malformed response throws EspnResponseError.
 */
export function normalizeTeamSchedule(json: unknown): Match[] {
  if (!isRecord(json) || !Array.isArray(json.events)) {
    throw new EspnResponseError('Team schedule response has no events list')
  }
  return json.events.flatMap((event) => {
    if (!isRecord(event) || !isRecord(event.league)) return []
    const slug = text(event.league.slug)
    const competition = slug ? toCompetition(event.league, slug) : undefined
    return (competition && toMatch(event, competition)) ?? []
  })
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

/** Home and away entries of an ESPN list keyed by `team.id`; the first entry per team wins. */
function byTeam(list: unknown, match: Match): { home?: UnknownRecord; away?: UnknownRecord } {
  const entries = (Array.isArray(list) ? list : []).filter(isRecord)
  const find = (teamId: string) =>
    entries.find((entry) => isRecord(entry.team) && text(entry.team.id) === teamId)
  return { home: find(match.homeTeam.id), away: find(match.awayTeam.id) }
}

const STAT_NAMES: Record<keyof TeamMatchStats, string> = {
  possession: 'possessionPct',
  shots: 'totalShots',
  shotsOnTarget: 'shotsOnTarget',
  corners: 'wonCorners',
  fouls: 'foulsCommitted',
}

function statValue(key: keyof TeamMatchStats, raw: string): number | undefined {
  if (key === 'possession') {
    const value = Number(raw.trim().replace(/%$/, ''))
    return raw.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : undefined
  }
  return /^\d+$/.test(raw.trim()) ? Number(raw) : undefined
}

function toTeamStats(entry: UnknownRecord | undefined): TeamMatchStats {
  const statistics = entry && Array.isArray(entry.statistics) ? entry.statistics.filter(isRecord) : []
  const stats: TeamMatchStats = {}
  for (const [key, name] of Object.entries(STAT_NAMES) as [keyof TeamMatchStats, string][]) {
    const raw = text(statistics.find((stat) => stat.name === name)?.displayValue)
    const value = raw === undefined ? undefined : statValue(key, raw)
    if (value !== undefined) stats[key] = value
  }
  return stats
}

/** Team stats from a summary boxscore, keeping only stats both sides have. */
function toStats(boxscore: unknown, match: Match): Match['stats'] {
  const { home, away } = byTeam(isRecord(boxscore) ? boxscore.teams : undefined, match)
  const homeStats = toTeamStats(home)
  const awayStats = toTeamStats(away)
  const stats: NonNullable<Match['stats']> = { home: {}, away: {} }
  for (const key of Object.keys(STAT_NAMES) as (keyof TeamMatchStats)[]) {
    if (homeStats[key] === undefined || awayStats[key] === undefined) continue
    stats.home[key] = homeStats[key]
    stats.away[key] = awayStats[key]
  }
  return Object.keys(stats.home).length > 0 ? stats : undefined
}

function toLineupPlayer(raw: UnknownRecord): LineupPlayer | undefined {
  const athlete = isRecord(raw.athlete) ? raw.athlete : {}
  const id = text(athlete.id)
  const name = text(athlete.displayName)
  if (!id || !name) return undefined
  const jersey = text(raw.jersey)
  const abbreviation = isRecord(raw.position) ? text(raw.position.abbreviation) : undefined
  // ESPN labels every substitute "SUB", which is not a position.
  const position = abbreviation === 'SUB' ? undefined : abbreviation
  return { id, name, ...(jersey && { jersey }), ...(position && { position }) }
}

function toLineup(entry: UnknownRecord | undefined): Lineup | undefined {
  if (!entry || !Array.isArray(entry.roster)) return undefined
  const lineup: Lineup = { starters: [], substitutes: [] }
  const seen = new Set<string>()
  for (const raw of entry.roster.filter(isRecord)) {
    const player = toLineupPlayer(raw)
    if (!player || seen.has(player.id)) continue
    seen.add(player.id)
    ;(raw.starter === true ? lineup.starters : lineup.substitutes).push(player)
  }
  if (lineup.starters.length === 0) return undefined
  const formation = text(entry.formation)
  return formation ? { formation, ...lineup } : lineup
}

/** Both lineups from summary rosters, or undefined unless both sides have starters. */
function toLineups(rosters: unknown, match: Match): Match['lineups'] {
  const { home, away } = byTeam(rosters, match)
  const homeLineup = toLineup(home)
  const awayLineup = toLineup(away)
  return homeLineup && awayLineup ? { home: homeLineup, away: awayLineup } : undefined
}

/**
 * Applies an untrusted ESPN match summary to a match from the list: current
 * status and score (kept from `match` when unusable), a chronological event
 * timeline, and team stats and lineups when available. Malformed events,
 * stats, and players are skipped; a non-object response throws.
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
  const stats = toStats(json.boxscore, match)
  const lineups = toLineups(json.rosters, match)
  if (stats) updated.stats = stats
  else delete updated.stats
  if (lineups) updated.lineups = lineups
  else delete updated.lineups
  if (!status) return updated
  updated.status = status
  const score = toScore(status, home, away)
  if (score) updated.score = score
  else if (status !== 'live' && status !== 'halftime' && status !== 'finished') {
    delete updated.score
  }
  return updated
}

function toCatalogTeam(entry: unknown): Team | undefined {
  if (!isRecord(entry) || !isRecord(entry.team)) return undefined
  const { team } = entry
  const id = text(team.id)
  const name = text(team.displayName)
  if (!id || !name) return undefined
  const shortName = text(team.shortDisplayName)
  const logos = Array.isArray(team.logos) ? team.logos : []
  const logo = logos
    .map((logoEntry) => (isRecord(logoEntry) ? httpsUrl(logoEntry.href) : undefined))
    .find((href) => href !== undefined)
  return { id, name, ...(shortName && { shortName }), ...(logo && { logo }) }
}

/**
 * Converts an untrusted ESPN standings response into the clubs it lists, across
 * every group. Malformed teams are skipped; a malformed response throws EspnResponseError.
 */
export function normalizeTeams(json: unknown): Team[] {
  if (!isRecord(json) || !Array.isArray(json.children)) {
    throw new EspnResponseError('Standings response has no groups')
  }
  return json.children.flatMap((group) => {
    const entries =
      isRecord(group) && isRecord(group.standings) && Array.isArray(group.standings.entries)
        ? group.standings.entries
        : []
    return entries.flatMap((entry) => toCatalogTeam(entry) ?? [])
  })
}
