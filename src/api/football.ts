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

export interface MatchListResult {
  /** Today through the next 7 days, everything except finished, kickoff ascending. */
  upcoming: Match[]
  /** Finished matches from today and the previous 7 days, newest first. */
  results: Match[]
  failedCompetitionIds: string[]
}

interface MatchListOptions {
  now?: Date
  fetchImpl?: typeof fetch
}

/** A request that failed for an expected reason: network, timeout, HTTP status, or body. */
class ProviderRequestError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ProviderRequestError'
  }
}

/** Thrown by getMatchDetails when the details could not be loaded for an expected reason. */
export class MatchDetailsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'MatchDetailsError'
  }
}

async function fetchJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  let response: Response
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch (cause) {
    throw new ProviderRequestError(`Request failed: ${url}`, { cause })
  }
  if (!response.ok) {
    throw new ProviderRequestError(`HTTP ${response.status}: ${url}`)
  }
  try {
    return await response.json()
  } catch (cause) {
    throw new ProviderRequestError(`Invalid JSON: ${url}`, { cause })
  }
}

function isExpectedFailure(reason: unknown): boolean {
  return reason instanceof ProviderRequestError || reason instanceof EspnResponseError
}

/**
 * Upcoming matches and recent results for the fixed competition set, from one
 * set of scoreboard requests. Per-competition failures are reported in
 * `failedCompetitionIds`; unexpected errors are rethrown.
 */
export async function getMatchList({
  now = new Date(),
  fetchImpl = (input, init) => fetch(input, init),
}: MatchListOptions = {}): Promise<MatchListResult> {
  const window = matchListWindow(now)
  const months = monthsToRequest({ start: window.resultsStart, end: window.upcomingEnd })

  const settled = await Promise.allSettled(
    COMPETITIONS.map(async (competition) => {
      const pages = await Promise.all(
        months.map(async (month) =>
          normalizeScoreboard(
            await fetchJson(scoreboardUrl(competition.id, month), fetchImpl),
            competition.id,
          ),
        ),
      )
      return pages.flat()
    }),
  )

  const failedCompetitionIds: string[] = []
  const order = new Map<string, number>()
  const matches: Match[] = []
  settled.forEach((result, index) => {
    if (result.status === 'rejected') {
      if (!isExpectedFailure(result.reason)) throw result.reason
      failedCompetitionIds.push(COMPETITIONS[index].id)
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

  return { upcoming, results, failedCompetitionIds }
}

/**
 * Loads one match's current score, status, and event timeline. Expected
 * failures throw MatchDetailsError; unexpected errors propagate unchanged.
 */
export async function getMatchDetails(
  match: Match,
  { fetchImpl = (input, init) => fetch(input, init) }: { fetchImpl?: typeof fetch } = {},
): Promise<Match> {
  try {
    const body = await fetchJson(summaryUrl(match.competition.id, match.id), fetchImpl)
    return normalizeSummary(body, match)
  } catch (error) {
    if (isExpectedFailure(error)) {
      throw new MatchDetailsError(`Couldn't load details for match ${match.id}`, { cause: error })
    }
    throw error
  }
}

export interface TeamCatalogResult {
  /** Clubs in the fixed competitions, unique by id, sorted by name. */
  teams: Team[]
  failedCompetitionIds: string[]
}

/**
 * Loads every club in the fixed competition set. Per-competition failures are
 * reported in `failedCompetitionIds`; unexpected errors are rethrown.
 */
export async function getTeamCatalog({
  fetchImpl = (input, init) => fetch(input, init),
}: { fetchImpl?: typeof fetch } = {}): Promise<TeamCatalogResult> {
  const settled = await Promise.allSettled(
    COMPETITIONS.map(async (competition) =>
      normalizeTeams(await fetchJson(standingsUrl(competition.id), fetchImpl)),
    ),
  )

  const failedCompetitionIds: string[] = []
  const byId = new Map<string, Team>()
  settled.forEach((result, index) => {
    if (result.status === 'rejected') {
      if (!isExpectedFailure(result.reason)) throw result.reason
      failedCompetitionIds.push(COMPETITIONS[index].id)
      return
    }
    for (const team of result.value) {
      if (!byId.has(team.id)) byId.set(team.id, team)
    }
  })

  const teams = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
  return { teams, failedCompetitionIds }
}
