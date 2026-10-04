import { COMPETITIONS } from '../api/football.ts'
import type { Match, MatchStatus, MatchEvent as TimelineEvent } from '../api/types.ts'
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
const ALERT_EVENT_TYPES: ReadonlySet<TimelineEvent['type']> = new Set<TimelineEvent['type']>([
  'goal',
  'own-goal',
  'penalty-goal',
  'red-card',
])

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
  /** Event ids already recorded; missing until the first summary is fetched. */
  seenEventIds?: string[]
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function parseSide(value: unknown): { id: string; name: string } | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const { id, name } = value as Record<string, unknown>
  return nonEmptyString(id) && nonEmptyString(name) ? { id, name } : undefined
}

/** Valid seen event ids, or undefined (not fetched yet) when the value isn't a string array. */
function parseSeenEventIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return [...new Set(value.filter(nonEmptyString))]
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
    const { id, competitionId, competitionName, startTime, home, away, status, seenEventIds } =
      entry as Record<string, unknown>
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
    const seenIds = parseSeenEventIds(seenEventIds)
    watched.push({
      id,
      competitionId,
      competitionName,
      startTime,
      home: homeSide,
      away: awaySide,
      status: status as MatchStatus,
      ...(seenIds && { seenEventIds: seenIds }),
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
 * their stored status and seen events; matches no longer involving a favorite
 * team, or more than 4 hours past kickoff, are dropped.
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
    merged.set(
      fresh.id,
      known
        ? {
            ...fresh,
            status: known.status,
            ...(known.seenEventIds && { seenEventIds: known.seenEventIds }),
          }
        : fresh,
    )
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

/**
 * Goals and red cards in `fresh` not yet seen for this match, in timeline
 * order, plus the updated seen ids. The first fetch and a finished, postponed,
 * or cancelled match record events without alerting.
 */
export function eventAlerts(
  watched: WatchedMatch,
  fresh: Match,
): { alerts: TimelineEvent[]; seenEventIds: string[] } {
  const freshIds = fresh.events.map((event) => event.id)
  if (!watched.seenEventIds) return { alerts: [], seenEventIds: [...new Set(freshIds)] }
  const seen = new Set(watched.seenEventIds)
  const alerts = DONE.has(fresh.status)
    ? []
    : fresh.events.filter((event) => ALERT_EVENT_TYPES.has(event.type) && !seen.has(event.id))
  return { alerts, seenEventIds: [...new Set([...watched.seenEventIds, ...freshIds])] }
}

const GOAL_SUFFIX: Partial<Record<TimelineEvent['type'], string>> = {
  'penalty-goal': ' (pen)',
  'own-goal': ' (OG)',
}

/** Plain-text notification for a goal or red card. */
export function eventNotificationContent(
  match: Match,
  event: TimelineEvent,
): { title: string; message: string } {
  const home = match.homeTeam.name
  const away = match.awayTeam.name
  const who = event.player ? `${event.player}${GOAL_SUFFIX[event.type] ?? ''} ` : ''
  const message = `${who}${event.minute} · ${match.competition.name}`
  if (event.type === 'red-card') {
    const team =
      event.teamId === match.homeTeam.id ? home : event.teamId === match.awayTeam.id ? away : null
    return { title: `Red card: ${team ?? `${home} vs ${away}`}`, message }
  }
  const teams = match.score ? `${home} ${formatScore(match.score)} ${away}` : `${home} vs ${away}`
  return { title: `Goal! ${teams}`, message }
}

/** One id per match event, so an event is never shown twice. */
export function eventNotificationId(matchId: string, eventId: string): string {
  return `footly:${matchId}:event:${eventId}`
}
