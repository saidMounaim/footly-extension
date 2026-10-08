import { matchListWindow, monthsToRequest } from '../lib/date.ts'
import {
  EspnResponseError,
  normalizeScoreboard,
  normalizeSummary,
  normalizeTeams,
  normalizeTeamSchedule,
  scoreboardUrl,
  standingsUrl,
  summaryUrl,
  teamScheduleUrl,
} from './espn.ts'
import type { Match, Team } from './types.ts'

export interface CatalogCompetition {
  id: string
  name: string
  /** Whether ESPN publishes league tables, which the team catalog is built from. */
  hasStandings: boolean
}

/** Always loaded, in display tie-break order. */
export const DEFAULT_COMPETITIONS: readonly CatalogCompetition[] = [
  { id: 'eng.1', name: 'Premier League', hasStandings: true },
  { id: 'esp.1', name: 'La Liga', hasStandings: true },
  { id: 'ita.1', name: 'Serie A', hasStandings: true },
  { id: 'ger.1', name: 'Bundesliga', hasStandings: true },
  { id: 'fra.1', name: 'Ligue 1', hasStandings: true },
  { id: 'uefa.champions', name: 'Champions League', hasStandings: true },
]

/**
 * Loaded only while followed, national teams first so earlier extras keep their
 * order. Ids confirmed against ESPN; Botola Pro (mar.1) and the Egyptian Premier
 * League (egy.1) aren't served. `hasStandings` is set only where ESPN returns tables.
 */
export const NATIONAL_TEAM_EXTRAS: readonly CatalogCompetition[] = [
  { id: 'fifa.friendly', name: 'International Friendlies', hasStandings: false },
  { id: 'fifa.worldq.caf', name: 'World Cup Qualifying (Africa)', hasStandings: true },
  { id: 'caf.nations', name: 'Africa Cup of Nations', hasStandings: true },
  { id: 'fifa.world', name: 'World Cup', hasStandings: true },
  { id: 'conmebol.america', name: 'Copa América', hasStandings: true },
  { id: 'uefa.euro', name: 'Euro', hasStandings: true },
  { id: 'uefa.nations', name: 'Nations League', hasStandings: true },
  { id: 'concacaf.gold', name: 'Gold Cup', hasStandings: true },
  { id: 'fifa.worldq.conmebol', name: 'World Cup Qualifying (South America)', hasStandings: true },
  { id: 'fifa.worldq.uefa', name: 'World Cup Qualifying (Europe)', hasStandings: true },
  { id: 'fifa.worldq.concacaf', name: 'World Cup Qualifying (CONCACAF)', hasStandings: true },
  { id: 'fifa.worldq.afc', name: 'World Cup Qualifying (Asia)', hasStandings: true },
]

export const CLUB_EXTRAS: readonly CatalogCompetition[] = [
  { id: 'ned.1', name: 'Eredivisie', hasStandings: true },
  { id: 'por.1', name: 'Primeira Liga', hasStandings: true },
  { id: 'tur.1', name: 'Süper Lig', hasStandings: true },
  { id: 'sco.1', name: 'Scottish Premiership', hasStandings: true },
  { id: 'bel.1', name: 'Belgian Pro League', hasStandings: true },
  { id: 'usa.1', name: 'MLS', hasStandings: true },
  { id: 'mex.1', name: 'Liga MX', hasStandings: true },
  { id: 'bra.1', name: 'Brasileirão', hasStandings: true },
  { id: 'arg.1', name: 'Liga Profesional', hasStandings: true },
  { id: 'ksa.1', name: 'Saudi Pro League', hasStandings: true },
  { id: 'uefa.europa', name: 'Europa League', hasStandings: true },
  { id: 'uefa.europa.conf', name: 'Conference League', hasStandings: true },
  { id: 'conmebol.libertadores', name: 'Copa Libertadores', hasStandings: true },
  { id: 'eng.2', name: 'Championship', hasStandings: true },
  { id: 'eng.fa', name: 'FA Cup', hasStandings: false },
  { id: 'esp.copa_del_rey', name: 'Copa del Rey', hasStandings: false },
]

export const EXTRA_COMPETITIONS: readonly CatalogCompetition[] = [
  ...NATIONAL_TEAM_EXTRAS,
  ...CLUB_EXTRAS,
]

/** Every competition Footly knows, defaults first; used to validate stored ids. */
export const COMPETITIONS: readonly CatalogCompetition[] = [
  ...DEFAULT_COMPETITIONS,
  ...EXTRA_COMPETITIONS,
]

/** The defaults plus the followed extras, in catalog order; unknown ids are ignored. */
export function competitionsToLoad(followedIds: Iterable<string>): CatalogCompetition[] {
  const followed = new Set(followedIds)
  return [...DEFAULT_COMPETITIONS, ...EXTRA_COMPETITIONS.filter((c) => followed.has(c.id))]
}

const REQUEST_TIMEOUT_MS = 10_000

/** Why an expected provider request failed. */
export type FailureReason = 'offline' | 'rate-limited' | 'unavailable' | 'invalid'

/** Most useful first: what the user can act on comes before what they can only wait out. */
const REASON_PRIORITY: FailureReason[] = ['offline', 'rate-limited', 'unavailable', 'invalid']

export interface MatchListResult {
  /** Today through the next 7 days, everything except finished, kickoff ascending. */
  upcoming: Match[]
  /** Finished matches from today and the previous 7 days, newest first. */
  results: Match[]
  failedCompetitionIds: string[]
  /** The competitions requested for this result, in load order. */
  competitionIds: string[]
  /** The most relevant reason a competition failed; set only when one did. Never saved. */
  failureReason?: FailureReason
}

interface RequestOptions {
  fetchImpl?: typeof fetch
  /** Whether the browser reports a connection; injectable for tests. */
  isOnline?: () => boolean
}

interface MatchListOptions extends RequestOptions {
  now?: Date
  /** What to load; the defaults when omitted. */
  competitions?: readonly CatalogCompetition[]
}

/** True when every requested competition failed, so the result holds nothing usable. */
export function allCompetitionsFailed(result: {
  failedCompetitionIds: string[]
  competitionIds: string[]
}): boolean {
  return result.failedCompetitionIds.length >= result.competitionIds.length
}

const defaultFetch: typeof fetch = (input, init) => fetch(input, init)

/** A missing navigator counts as online; only an explicit `false` means offline. */
const browserOnline = () => globalThis.navigator?.onLine !== false

/** A request that failed for an expected reason: network, timeout, HTTP status, or body. */
class ProviderRequestError extends Error {
  readonly reason: FailureReason

  constructor(reason: FailureReason, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ProviderRequestError'
    this.reason = reason
  }
}

/** Thrown by getMatchDetails when the details could not be loaded for an expected reason. */
export class MatchDetailsError extends Error {
  readonly reason: FailureReason

  constructor(reason: FailureReason, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'MatchDetailsError'
    this.reason = reason
  }
}

async function fetchJson(
  url: string,
  fetchImpl: typeof fetch,
  isOnline: () => boolean,
): Promise<unknown> {
  let response: Response
  try {
    response = await fetchImpl(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // The provider gets nothing beyond the request itself.
      referrerPolicy: 'no-referrer',
    })
  } catch (cause) {
    // Being "online" doesn't prove connectivity, so only an explicit offline report counts.
    const reason = isOnline() ? 'unavailable' : 'offline'
    throw new ProviderRequestError(reason, `Request failed: ${url}`, { cause })
  }
  if (!response.ok) {
    const reason = response.status === 429 ? 'rate-limited' : 'unavailable'
    throw new ProviderRequestError(reason, `HTTP ${response.status}: ${url}`)
  }
  try {
    return await response.json()
  } catch (cause) {
    throw new ProviderRequestError('invalid', `Invalid JSON: ${url}`, { cause })
  }
}

/** The reason for an expected failure, or null for an unexpected error. */
function expectedReason(error: unknown): FailureReason | null {
  if (error instanceof ProviderRequestError) return error.reason
  if (error instanceof EspnResponseError) return 'invalid'
  return null
}

/** The highest-priority reason among `reasons`, or undefined when there are none. */
function mostRelevant(reasons: FailureReason[]): FailureReason | undefined {
  return REASON_PRIORITY.find((reason) => reasons.includes(reason))
}

/**
 * Upcoming matches and recent results for the requested competitions, from one
 * set of scoreboard requests. Per-competition failures are reported in
 * `failedCompetitionIds`; unexpected errors are rethrown.
 */
export async function getMatchList({
  now = new Date(),
  fetchImpl = defaultFetch,
  isOnline = browserOnline,
  competitions = DEFAULT_COMPETITIONS,
}: MatchListOptions = {}): Promise<MatchListResult> {
  const window = matchListWindow(now)
  const months = monthsToRequest({ start: window.resultsStart, end: window.upcomingEnd })

  const settled = await Promise.allSettled(
    competitions.map(async (competition) => {
      const pages = await Promise.all(
        months.map(async (month) =>
          normalizeScoreboard(
            await fetchJson(scoreboardUrl(competition.id, month), fetchImpl, isOnline),
            competition.id,
          ),
        ),
      )
      return pages.flat()
    }),
  )

  const failedCompetitionIds: string[] = []
  const reasons: FailureReason[] = []
  const order = new Map<string, number>()
  const matches: Match[] = []
  settled.forEach((result, index) => {
    if (result.status === 'rejected') {
      const reason = expectedReason(result.reason)
      if (!reason) throw result.reason
      failedCompetitionIds.push(competitions[index].id)
      reasons.push(reason)
      return
    }
    for (const match of result.value) {
      if (order.has(match.id)) continue
      order.set(match.id, index)
      matches.push(match)
    }
  })

  const competitionOrder = (a: Match, b: Match) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  const kickoff = (match: Match) => Date.parse(match.startTime)
  const within = (match: Match, start: Date, end: Date) =>
    kickoff(match) >= start.getTime() && kickoff(match) < end.getTime()

  const upcoming = matches
    .filter((m) => m.status !== 'finished' && within(m, window.todayStart, window.upcomingEnd))
    .sort((a, b) => kickoff(a) - kickoff(b) || competitionOrder(a, b))
  const results = matches
    .filter((m) => m.status === 'finished' && within(m, window.resultsStart, window.tomorrowStart))
    .sort((a, b) => kickoff(b) - kickoff(a) || competitionOrder(a, b))

  const failureReason = mostRelevant(reasons)
  return {
    upcoming,
    results,
    failedCompetitionIds,
    competitionIds: competitions.map((competition) => competition.id),
    ...(failureReason && { failureReason }),
  }
}

/** How far ahead and back the favorite teams' matches reach. */
export const TEAM_MATCH_WINDOW_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

export interface TeamMatchesResult {
  /** Not finished, kicking off within the window (live ones included), kickoff ascending. */
  upcoming: Match[]
  /** Finished within the window, newest first. */
  results: Match[]
  failedTeamIds: string[]
  /** The teams requested for this result. */
  teamIds: string[]
  /** The most relevant reason a team failed; set only when one did. Never saved. */
  failureReason?: FailureReason
}

/**
 * Favorite teams' matches in every competition, from two schedule requests per
 * team (past and upcoming). A match between two favorites appears once. A team
 * counts as failed when either request fails; unexpected errors are rethrown.
 */
export async function getTeamMatches(
  teams: readonly Pick<Team, 'id'>[],
  {
    now = new Date(),
    fetchImpl = defaultFetch,
    isOnline = browserOnline,
  }: RequestOptions & { now?: Date } = {},
): Promise<TeamMatchesResult> {
  const settled = await Promise.all(
    teams.map((team) =>
      Promise.allSettled(
        [false, true].map(async (fixtures) =>
          normalizeTeamSchedule(
            await fetchJson(teamScheduleUrl(team.id, fixtures), fetchImpl, isOnline),
          ),
        ),
      ),
    ),
  )

  const failedTeamIds: string[] = []
  const reasons: FailureReason[] = []
  const byId = new Map<string, Match>()
  settled.forEach((pages, index) => {
    let failed = false
    for (const page of pages) {
      if (page.status === 'rejected') {
        const reason = expectedReason(page.reason)
        if (!reason) throw page.reason
        reasons.push(reason)
        failed = true
        continue
      }
      for (const match of page.value) {
        if (!byId.has(match.id)) byId.set(match.id, match)
      }
    }
    if (failed) failedTeamIds.push(teams[index].id)
  })

  const kickoff = (match: Match) => Date.parse(match.startTime)
  const nowMs = now.getTime()
  const windowMs = TEAM_MATCH_WINDOW_DAYS * DAY_MS
  const within = (match: Match, start: number, end: number) =>
    kickoff(match) >= start && kickoff(match) <= end
  const matches = [...byId.values()]
  // Unfinished matches from up to a day ago stay listed, so live ones show.
  const upcoming = matches
    .filter((m) => m.status !== 'finished' && within(m, nowMs - DAY_MS, nowMs + windowMs))
    .sort((a, b) => kickoff(a) - kickoff(b))
  const results = matches
    .filter((m) => m.status === 'finished' && within(m, nowMs - windowMs, nowMs))
    .sort((a, b) => kickoff(b) - kickoff(a))

  const failureReason = mostRelevant(reasons)
  return {
    upcoming,
    results,
    failedTeamIds,
    teamIds: teams.map((team) => team.id),
    ...(failureReason && { failureReason }),
  }
}

/**
 * Loads one match's current score, status, and event timeline. Expected
 * failures throw MatchDetailsError; unexpected errors propagate unchanged.
 */
export async function getMatchDetails(
  match: Match,
  { fetchImpl = defaultFetch, isOnline = browserOnline }: RequestOptions = {},
): Promise<Match> {
  try {
    const body = await fetchJson(summaryUrl(match.competition.id, match.id), fetchImpl, isOnline)
    return normalizeSummary(body, match)
  } catch (error) {
    const reason = expectedReason(error)
    if (reason) {
      throw new MatchDetailsError(reason, `Couldn't load details for match ${match.id}`, {
        cause: error,
      })
    }
    throw error
  }
}

export interface TeamCatalogResult {
  /** Clubs in the fixed competitions, unique by id, sorted by name. */
  teams: Team[]
  failedCompetitionIds: string[]
  /** The competitions whose tables were requested, in load order. */
  competitionIds: string[]
  /** The most relevant reason a competition failed; set only when one did. */
  failureReason?: FailureReason
}

/**
 * Loads every club in the requested competitions that publish tables.
 * Per-competition failures are reported in `failedCompetitionIds`; unexpected
 * errors are rethrown.
 */
export async function getTeamCatalog({
  fetchImpl = defaultFetch,
  isOnline = browserOnline,
  competitions = DEFAULT_COMPETITIONS,
}: RequestOptions & { competitions?: readonly CatalogCompetition[] } = {}): Promise<TeamCatalogResult> {
  // Friendlies and similar have no tables; asking would only add a failure.
  const withTables = competitions.filter((competition) => competition.hasStandings)
  const settled = await Promise.allSettled(
    withTables.map(async (competition) =>
      normalizeTeams(await fetchJson(standingsUrl(competition.id), fetchImpl, isOnline)),
    ),
  )

  const failedCompetitionIds: string[] = []
  const reasons: FailureReason[] = []
  const byId = new Map<string, Team>()
  settled.forEach((result, index) => {
    if (result.status === 'rejected') {
      const reason = expectedReason(result.reason)
      if (!reason) throw result.reason
      failedCompetitionIds.push(withTables[index].id)
      reasons.push(reason)
      return
    }
    for (const team of result.value) {
      if (!byId.has(team.id)) byId.set(team.id, team)
    }
  })

  const teams = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
  const failureReason = mostRelevant(reasons)
  return {
    teams,
    failedCompetitionIds,
    competitionIds: withTables.map((competition) => competition.id),
    ...(failureReason && { failureReason }),
  }
}
