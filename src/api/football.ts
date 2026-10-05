import { matchListWindow, monthsToRequest } from '../lib/date.ts'
import {
  EspnResponseError,
  normalizeScoreboard,
  normalizeSummary,
  normalizeTeams,
  scoreboardUrl,
  standingsUrl,
  summaryUrl,
} from './espn.ts'
import type { Match, Team } from './types.ts'

/** Competitions shown before favorites exist, in display tie-break order. */
export const COMPETITIONS = [
  { id: 'eng.1', name: 'Premier League' },
  { id: 'esp.1', name: 'La Liga' },
  { id: 'ita.1', name: 'Serie A' },
  { id: 'ger.1', name: 'Bundesliga' },
  { id: 'fra.1', name: 'Ligue 1' },
  { id: 'uefa.champions', name: 'Champions League' },
] as const

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
    response = await fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
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
 * Upcoming matches and recent results for the fixed competition set, from one
 * set of scoreboard requests. Per-competition failures are reported in
 * `failedCompetitionIds`; unexpected errors are rethrown.
 */
export async function getMatchList({
  now = new Date(),
  fetchImpl = defaultFetch,
  isOnline = browserOnline,
}: MatchListOptions = {}): Promise<MatchListResult> {
  const window = matchListWindow(now)
  const months = monthsToRequest({ start: window.resultsStart, end: window.upcomingEnd })

  const settled = await Promise.allSettled(
    COMPETITIONS.map(async (competition) => {
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
      failedCompetitionIds.push(COMPETITIONS[index].id)
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
  return { upcoming, results, failedCompetitionIds, ...(failureReason && { failureReason }) }
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
  /** The most relevant reason a competition failed; set only when one did. */
  failureReason?: FailureReason
}

/**
 * Loads every club in the fixed competition set. Per-competition failures are
 * reported in `failedCompetitionIds`; unexpected errors are rethrown.
 */
export async function getTeamCatalog({
  fetchImpl = defaultFetch,
  isOnline = browserOnline,
}: RequestOptions = {}): Promise<TeamCatalogResult> {
  const settled = await Promise.allSettled(
    COMPETITIONS.map(async (competition) =>
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
      failedCompetitionIds.push(COMPETITIONS[index].id)
      reasons.push(reason)
      return
    }
    for (const team of result.value) {
      if (!byId.has(team.id)) byId.set(team.id, team)
    }
  })

  const teams = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
  const failureReason = mostRelevant(reasons)
  return { teams, failedCompetitionIds, ...(failureReason && { failureReason }) }
}
