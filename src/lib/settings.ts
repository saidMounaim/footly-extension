import type { MatchEvent as TimelineEvent } from '../api/types.ts'
import { readStoredKey, writeStoredKey, type StorageArea } from './favorites.ts'
import type { MatchEvent } from './notifications.ts'

/** Key in chrome.storage.local for the per-type notification switches. */
export const NOTIFICATION_TYPES_KEY = 'notificationTypes'

/** Key in chrome.storage.local for the popup's live refresh interval, in minutes. */
export const LIVE_REFRESH_KEY = 'liveRefreshMinutes'

export interface NotificationTypes {
  /** Kick-off, half-time, and full-time. */
  matchUpdates: boolean
  /** Goals, penalty goals, and own goals. */
  goals: boolean
  redCards: boolean
}

export const DEFAULT_NOTIFICATION_TYPES: NotificationTypes = {
  matchUpdates: true,
  goals: true,
  redCards: true,
}

export type NotificationType = keyof NotificationTypes

export const LIVE_REFRESH_OPTIONS = [1, 2, 5] as const

export type LiveRefreshMinutes = (typeof LIVE_REFRESH_OPTIONS)[number]

export const DEFAULT_LIVE_REFRESH_MINUTES: LiveRefreshMinutes = 1

/** Validates the untrusted stored value: a type is off only when exactly `false` is stored. */
export function parseNotificationTypes(value: unknown): NotificationTypes {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ...DEFAULT_NOTIFICATION_TYPES }
  }
  const { matchUpdates, goals, redCards } = value as Record<string, unknown>
  return {
    matchUpdates: matchUpdates !== false,
    goals: goals !== false,
    redCards: redCards !== false,
  }
}

/** Validates the untrusted stored value: anything but a known option is the default. */
export function parseLiveRefreshMinutes(value: unknown): LiveRefreshMinutes {
  return LIVE_REFRESH_OPTIONS.find((option) => option === value) ?? DEFAULT_LIVE_REFRESH_MINUTES
}

export async function loadNotificationTypes(area: StorageArea): Promise<NotificationTypes> {
  return parseNotificationTypes(await readStoredKey(area, NOTIFICATION_TYPES_KEY))
}

export async function saveNotificationTypes(area: StorageArea, types: NotificationTypes): Promise<void> {
  const { matchUpdates, goals, redCards } = types
  await writeStoredKey(area, NOTIFICATION_TYPES_KEY, { matchUpdates, goals, redCards })
}

export async function loadLiveRefreshMinutes(area: StorageArea): Promise<LiveRefreshMinutes> {
  return parseLiveRefreshMinutes(await readStoredKey(area, LIVE_REFRESH_KEY))
}

export async function saveLiveRefreshMinutes(
  area: StorageArea,
  minutes: LiveRefreshMinutes,
): Promise<void> {
  await writeStoredKey(area, LIVE_REFRESH_KEY, minutes)
}

const STATUS_ALERT_TYPE: Record<MatchEvent, NotificationType> = {
  kickoff: 'matchUpdates',
  halftime: 'matchUpdates',
  fulltime: 'matchUpdates',
}

/** Kick-off, half-time, and full-time alerts all follow the match updates switch. */
export function statusAlertAllowed(types: NotificationTypes, event: MatchEvent): boolean {
  return types[STATUS_ALERT_TYPE[event]]
}

/** Goal alerts follow the goals switch, red cards the red cards switch; nothing else alerts. */
export function eventAlertAllowed(types: NotificationTypes, type: TimelineEvent['type']): boolean {
  switch (type) {
    case 'goal':
    case 'penalty-goal':
    case 'own-goal':
      return types.goals
    case 'red-card':
      return types.redCards
    default:
      return false
  }
}

export function anyAlertsEnabled(types: NotificationTypes): boolean {
  return types.matchUpdates || types.goals || types.redCards
}
