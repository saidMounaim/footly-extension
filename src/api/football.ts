import { monthsToRequest, upcomingWindow } from '../lib/date.ts'
import { EspnResponseError, normalizeScoreboard, scoreboardUrl } from './espn.ts'
import type { Match } from './types.ts'

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

export interface UpcomingMatchesResult {
  matches: Match[]
  failedCompetitionIds: string[]
}

interface UpcomingMatchesOptions {
  now?: Date
  fetchImpl?: typeof fetch
}

/** A request that failed for an expected reason: network, timeout, HTTP status, or body. */
class ScoreboardRequestError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ScoreboardRequestError'
  }
}

async function fetchScoreboard(url: string, fetchImpl: typeof fetch): Promise<Match[]> {
  let response: Response
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch (cause) {
    throw new ScoreboardRequestError(`Request failed: ${url}`, { cause })
  }
  if (!response.ok) {
    throw new ScoreboardRequestError(`HTTP ${response.status}: ${url}`)
  }
  let body: unknown
  try {
    body = await response.json()
  } catch (cause) {
    throw new ScoreboardRequestError(`Invalid JSON: ${url}`, { cause })
  }
  return normalizeScoreboard(body)
}

function isExpectedFailure(reason: unknown): boolean {
  return reason instanceof ScoreboardRequestError || reason instanceof EspnResponseError
}

/**
 * Upcoming, live, halftime, postponed, and cancelled matches from today through
 * the next 7 days for the fixed competition set. Per-competition failures are
 * reported in `failedCompetitionIds`; unexpected errors are rethrown.
 */
export async function getUpcomingMatches({
  now = new Date(),
  fetchImpl = (input, init) => fetch(input, init),
}: UpcomingMatchesOptions = {}): Promise<UpcomingMatchesResult> {
  const window = upcomingWindow(now)
  const months = monthsToRequest(window)

  const results = await Promise.allSettled(
    COMPETITIONS.map(async (competition) => {
      const pages = await Promise.all(
        months.map((month) => fetchScoreboard(scoreboardUrl(competition.id, month), fetchImpl)),
      )
      return pages.flat()
    }),
  )

  const failedCompetitionIds: string[] = []
  const order = new Map<string, number>()
  const matches: Match[] = []
  results.forEach((result, index) => {
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

  const start = window.start.getTime()
  const end = window.end.getTime()
  const upcoming = matches
    .filter((match) => {
      const time = Date.parse(match.startTime)
      return match.status !== 'finished' && time >= start && time < end
    })
    .sort(
      (a, b) =>
        Date.parse(a.startTime) - Date.parse(b.startTime) ||
        (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    )

  return { matches: upcoming, failedCompetitionIds }
}
