import { COMPETITIONS } from '../api/football.ts'
import type { Match, MatchStatus } from '../api/types.ts'
import { formatScore } from '../components/matches/status.ts'
import { readStoredKey, writeStoredKey, type StorageArea } from './favorites.ts'

/** Key in chrome.storage.local for the match notifications switch. */
export const NOTIFICATIONS_ENABLED_KEY = 'notificationsEnabled'

/** Key in chrome.storage.local for the service worker's watched matches. */
export const WATCHED_MATCHES_KEY = 'watchedMatches'

const MINUTE_MS = 60_000
/** Watching starts this long before kickoff so the kick-off alert isn't late. */
const WATCH_LEAD_MS = MINUTE_MS
/** A match is never watched longer than this after kickoff. */
const WATCH_LIMIT_MS = 4 * 60 * MINUTE_MS

const COMPETITION_IDS: ReadonlySet<string> = new Set(COMPETITIONS.map((competition) => competition.id))
const STATUSES: ReadonlySet<string> = new Set<MatchStatus>([
  'upcoming',
  'live',
  'halftime',
  'finished',
  'postponed',
  'cancelled',
])
const DONE: ReadonlySet<MatchStatus> = new Set<MatchStatus>(['finished', 'postponed', 'cancelled'])

export type MatchEvent = 'kickoff' | 'halftime' | 'fulltime'

/** What the service worker remembers about a favorite team's match. */
export interface WatchedMatch {
  id: string
  competitionId: string
  competitionName: string
  /** ISO 8601 UTC kickoff. */
  startTime: string
  home: { id: string; name: string }
  away: { id: string; name: string }
  /** The last status Footly saw and acted on. */
  status: MatchStatus
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function parseSide(value: unknown): { id: string; name: string } | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const { id, name } = value as Record<string, unknown>
  return nonEmptyString(id) && nonEmptyString(name) ? { id, name } : undefined
}

/** The switch is off only when exactly `false` is stored. */
export function parseNotificationsEnabled(value: unknown): boolean {
  return value !== false
}

/** Validates the untrusted stored list: malformed entries dropped, duplicate ids keep the first. */
export function parseWatchedMatches(value: unknown): WatchedMatch[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const watched: WatchedMatch[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue
    const { id, competitionId, competitionName, startTime, home, away, status } = entry as Record<
      string,
      unknown
    >
    const homeSide = parseSide(home)
    const awaySide = parseSide(away)
    if (
      !nonEmptyString(id) ||
      seen.has(id) ||
      typeof competitionId !== 'string' ||
      !COMPETITION_IDS.has(competitionId) ||
      !nonEmptyString(competitionName) ||
      typeof startTime !== 'string' ||
      Number.isNaN(Date.parse(startTime)) ||
      typeof status !== 'string' ||
      !STATUSES.has(status) ||
      !homeSide ||
      !awaySide
    ) {
      continue
    }
    seen.add(id)
    watched.push({
      id,
      competitionId,
      competitionName,
      startTime,
      home: homeSide,
      away: awaySide,
      status: status as MatchStatus,
    })
  }
  return watched
}

export async function loadNotificationsEnabled(area: StorageArea): Promise<boolean> {
  return parseNotificationsEnabled(await readStoredKey(area, NOTIFICATIONS_ENABLED_KEY))
}

export async function saveNotificationsEnabled(area: StorageArea, enabled: boolean): Promise<void> {
  await writeStoredKey(area, NOTIFICATIONS_ENABLED_KEY, enabled)
}

export async function loadWatchedMatches(area: StorageArea): Promise<WatchedMatch[]> {
  return parseWatchedMatches(await readStoredKey(area, WATCHED_MATCHES_KEY))
}

export async function saveWatchedMatches(area: StorageArea, watched: WatchedMatch[]): Promise<void> {
  await writeStoredKey(area, WATCHED_MATCHES_KEY, watched)
}

export function toWatchedMatch(match: Match): WatchedMatch {
  return {
    id: match.id,
    competitionId: match.competition.id,
    competitionName: match.competition.name,
    startTime: match.startTime,
    home: { id: match.homeTeam.id, name: match.homeTeam.name },
    away: { id: match.awayTeam.id, name: match.awayTeam.name },
    status: match.status,
  }
}

/** The `Match` needed to fetch a watched match's summary. */
export function toMatch(watched: WatchedMatch): Match {
  return {
    id: watched.id,
    competition: { id: watched.competitionId, name: watched.competitionName },
    homeTeam: watched.home,
    awayTeam: watched.away,
    startTime: watched.startTime,
    status: watched.status,
    events: [],
  }
}

const kickoffOf = (watched: WatchedMatch) => Date.parse(watched.startTime)
const involves = (watched: WatchedMatch, teamIds: ReadonlySet<string>) =>
  teamIds.has(watched.home.id) || teamIds.has(watched.away.id)

/**
 * The watched list after an hourly plan: favorite teams' matches from `matches`
 * are added with their current status (no alert for a first sighting) or keep
 * their stored status; matches no longer involving a favorite team, or more
 * than 4 hours past kickoff, are dropped.
 */
export function mergePlan(
  watched: WatchedMatch[],
  matches: Match[],
  favoriteTeamIds: ReadonlySet<string>,
  now: Date,
): WatchedMatch[] {
  const merged = new Map<string, WatchedMatch>()
  for (const entry of watched) merged.set(entry.id, entry)
  for (const match of matches) {
    const fresh = toWatchedMatch(match)
    if (!involves(fresh, favoriteTeamIds)) continue
    const known = merged.get(fresh.id)
    merged.set(fresh.id, known ? { ...fresh, status: known.status } : fresh)
  }
  return [...merged.values()].filter(
    (entry) =>
      involves(entry, favoriteTeamIds) && now.getTime() <= kickoffOf(entry) + WATCH_LIMIT_MS,
  )
}

/** Matches to check now, and when the watch alarm should next start if none are due. */
export function watchWindow(
  watched: WatchedMatch[],
  now: Date,
): { due: WatchedMatch[]; nextAt: Date | null } {
  const due: WatchedMatch[] = []
  let nextAt: number | null = null
  for (const entry of watched) {
    if (DONE.has(entry.status)) continue
    const start = kickoffOf(entry) - WATCH_LEAD_MS
    const end = kickoffOf(entry) + WATCH_LIMIT_MS
    if (now.getTime() >= start && now.getTime() <= end) due.push(entry)
    else if (start > now.getTime() && (nextAt === null || start < nextAt)) nextAt = start
  }
  return { due, nextAt: nextAt === null ? null : new Date(nextAt) }
}

/**
 * Whether the watch alarm must be recreated for a match that is already due:
 * it is missing, or scheduled more than a minute away (set for a later kickoff).
 */
export function watchAlarmNeedsReset(scheduledTime: number | undefined, now: Date): boolean {
  return scheduledTime === undefined || scheduledTime > now.getTime() + MINUTE_MS
}

/** The alert a status change calls for, if any. */
export function statusEvent(previous: MatchStatus, next: MatchStatus): MatchEvent | null {
  if (previous === next) return null
  if (next === 'live' && previous === 'upcoming') return 'kickoff'
  if (next === 'halftime' && (previous === 'upcoming' || previous === 'live')) return 'halftime'
  if (
    next === 'finished' &&
    (previous === 'upcoming' || previous === 'live' || previous === 'halftime')
  ) {
    return 'fulltime'
  }
  return null
}

const EVENT_LABEL: Record<MatchEvent, string> = {
  kickoff: 'Kick-off',
  halftime: 'Half-time',
  fulltime: 'Full-time',
}

/** Plain-text notification for a match event. */
export function notificationContent(
  match: Match,
  event: MatchEvent,
): { title: string; message: string } {
  const home = match.homeTeam.name
  const away = match.awayTeam.name
  const teams =
    event !== 'kickoff' && match.score
      ? `${home} ${formatScore(match.score)} ${away}`
      : `${home} vs ${away}`
  return { title: `${EVENT_LABEL[event]}: ${teams}`, message: match.competition.name }
}

/** One id per match and event, so a repeat replaces the earlier notification. */
export function notificationId(matchId: string, event: MatchEvent): string {
  return `footly:${matchId}:${event}`
}
