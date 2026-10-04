import { COMPETITIONS, type MatchListResult, type TeamCatalogResult } from '../api/football.ts'
import type { Match, MatchStatus, Team } from '../api/types.ts'
import { startOfLocalDay } from './date.ts'
import { readStoredKey, writeStoredKey, type StorageArea } from './favorites.ts'

/** Key in chrome.storage.local for the last match list snapshot. */
export const MATCH_LIST_CACHE_KEY = 'matchListCache'

/** Key in chrome.storage.local for the last complete team catalog. */
export const TEAM_CATALOG_CACHE_KEY = 'teamCatalogCache'

const CACHE_VERSION = 1
const MINUTE_MS = 60_000

/** How often the popup refetches while a shown match is live or at halftime. */
export const LIVE_REFRESH_MS = MINUTE_MS
/** A list snapshot with a live match is fresh for this long. */
const LIVE_LIST_FRESH_MS = MINUTE_MS
/** A list snapshot without live matches is fresh for this long. */
const LIST_FRESH_MS = 10 * MINUTE_MS
/** An older list snapshot isn't shown at all, even while refreshing. */
const LIST_USABLE_MS = 60 * MINUTE_MS
/** A complete team catalog is reused for this long. */
const CATALOG_FRESH_MS = 24 * 60 * MINUTE_MS

const COMPETITION_IDS: ReadonlySet<string> = new Set(COMPETITIONS.map((competition) => competition.id))
const STATUSES: ReadonlySet<string> = new Set<MatchStatus>([
  'upcoming',
  'live',
  'halftime',
  'finished',
  'postponed',
  'cancelled',
])

export interface MatchListSnapshot {
  savedAt: Date
  result: MatchListResult
}

export interface TeamCatalogSnapshot {
  savedAt: Date
  teams: Team[]
}

export type Freshness = 'fresh' | 'stale' | 'unusable'

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNamed(value: unknown): boolean {
  return isRecord(value) && nonEmptyString(value.id) && nonEmptyString(value.name)
}

function isMatch(value: unknown): value is Match {
  if (!isRecord(value)) return false
  const { id, startTime, status, homeTeam, awayTeam, competition, events, score } = value
  return (
    nonEmptyString(id) &&
    typeof startTime === 'string' &&
    !Number.isNaN(Date.parse(startTime)) &&
    typeof status === 'string' &&
    STATUSES.has(status) &&
    isNamed(homeTeam) &&
    isNamed(awayTeam) &&
    isNamed(competition) &&
    Array.isArray(events) &&
    (score === undefined ||
      (isRecord(score) && typeof score.home === 'number' && typeof score.away === 'number'))
  )
}

/** The snapshot's save time, or null when the version or timestamp is wrong. */
function parseHeader(value: unknown): { record: Record<string, unknown>; savedAt: Date } | null {
  if (!isRecord(value) || value.version !== CACHE_VERSION || typeof value.savedAt !== 'string') return null
  const savedAt = new Date(value.savedAt)
  return Number.isNaN(savedAt.getTime()) ? null : { record: value, savedAt }
}

/** Validates the untrusted stored snapshot; any malformed match rejects the whole snapshot. */
export function parseMatchListSnapshot(value: unknown): MatchListSnapshot | null {
  const header = parseHeader(value)
  if (!header) return null
  const { upcoming, results, failedCompetitionIds } = header.record
  if (!Array.isArray(upcoming) || !upcoming.every(isMatch)) return null
  if (!Array.isArray(results) || !results.every(isMatch)) return null
  if (!Array.isArray(failedCompetitionIds)) return null
  return {
    savedAt: header.savedAt,
    result: {
      upcoming,
      results,
      failedCompetitionIds: failedCompetitionIds.filter(
        (id): id is string => typeof id === 'string' && COMPETITION_IDS.has(id),
      ),
    },
  }
}

/** Validates the untrusted stored catalog; any malformed team rejects the whole snapshot. */
export function parseTeamCatalogSnapshot(value: unknown): TeamCatalogSnapshot | null {
  const header = parseHeader(value)
  if (!header) return null
  const { teams } = header.record
  if (!Array.isArray(teams) || !teams.every(isNamed)) return null
  return { savedAt: header.savedAt, teams: teams as Team[] }
}

/** True when any match is live or at halftime. */
export function hasLiveMatch(matches: Match[]): boolean {
  return matches.some((match) => match.status === 'live' || match.status === 'halftime')
}

/**
 * Fresh snapshots are shown without a request, stale ones are shown and then
 * refreshed, unusable ones are ignored.
 */
export function matchListFreshness({ savedAt, result }: MatchListSnapshot, now: Date): Freshness {
  const age = now.getTime() - savedAt.getTime()
  if (age < 0 || age > LIST_USABLE_MS) return 'unusable'
  if (startOfLocalDay(savedAt).getTime() !== startOfLocalDay(now).getTime()) return 'unusable'
  if (result.failedCompetitionIds.length > 0) return 'stale'
  const kickedOff = result.upcoming.some((match) => {
    if (match.status !== 'upcoming') return false
    const kickoff = Date.parse(match.startTime)
    return kickoff > savedAt.getTime() && kickoff <= now.getTime()
  })
  if (kickedOff) return 'stale'
  const limit = hasLiveMatch(result.upcoming) ? LIVE_LIST_FRESH_MS : LIST_FRESH_MS
  return age < limit ? 'fresh' : 'stale'
}

/** A catalog is reused only while it is under a day old. */
export function isTeamCatalogFresh({ savedAt }: TeamCatalogSnapshot, now: Date): boolean {
  const age = now.getTime() - savedAt.getTime()
  return age >= 0 && age < CATALOG_FRESH_MS
}

export async function loadMatchListSnapshot(area: StorageArea): Promise<MatchListSnapshot | null> {
  return parseMatchListSnapshot(await readStoredKey(area, MATCH_LIST_CACHE_KEY))
}

/** Saves the list unless every competition failed. */
export async function saveMatchListSnapshot(
  area: StorageArea,
  result: MatchListResult,
  savedAt: Date,
): Promise<void> {
  if (result.failedCompetitionIds.length === COMPETITIONS.length) return
  await writeStoredKey(area, MATCH_LIST_CACHE_KEY, {
    version: CACHE_VERSION,
    savedAt: savedAt.toISOString(),
    ...result,
  })
}

export async function loadTeamCatalogSnapshot(area: StorageArea): Promise<TeamCatalogSnapshot | null> {
  return parseTeamCatalogSnapshot(await readStoredKey(area, TEAM_CATALOG_CACHE_KEY))
}

/** Saves the catalog only when every competition loaded. */
export async function saveTeamCatalogSnapshot(
  area: StorageArea,
  result: TeamCatalogResult,
  savedAt: Date,
): Promise<void> {
  if (result.failedCompetitionIds.length > 0) return
  await writeStoredKey(area, TEAM_CATALOG_CACHE_KEY, {
    version: CACHE_VERSION,
    savedAt: savedAt.toISOString(),
    teams: result.teams,
  })
}
