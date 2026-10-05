import { describe, expect, it } from 'vitest'
import { FavoritesStorageError, type StorageArea } from './favorites.ts'
import {
  anyAlertsEnabled,
  DEFAULT_NOTIFICATION_TYPES,
  eventAlertAllowed,
  LIVE_REFRESH_KEY,
  loadLiveRefreshMinutes,
  loadNotificationTypes,
  NOTIFICATION_TYPES_KEY,
  parseLiveRefreshMinutes,
  parseNotificationTypes,
  saveLiveRefreshMinutes,
  saveNotificationTypes,
  statusAlertAllowed,
  type NotificationTypes,
} from './settings.ts'

function memoryArea(initial: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...initial }
  const area: StorageArea = {
    get: async (key) => (key in data ? { [key]: data[key] } : {}),
    set: async (items) => {
      Object.assign(data, items)
    },
  }
  return { area, data }
}

const failingArea: StorageArea = {
  get: () => Promise.reject(new Error('quota')),
  set: () => Promise.reject(new Error('quota')),
}

const allOff: NotificationTypes = { matchUpdates: false, goals: false, redCards: false }

describe('parseNotificationTypes', () => {
  it.each([undefined, null, [], 'off', 0, false])('gives all on for %j', (value) => {
    expect(parseNotificationTypes(value)).toEqual(DEFAULT_NOTIFICATION_TYPES)
  })

  it('turns a type off only for exactly false', () => {
    expect(parseNotificationTypes({ goals: false, redCards: 'false', extra: false })).toEqual({
      matchUpdates: true,
      goals: false,
      redCards: true,
    })
  })
})

describe('parseLiveRefreshMinutes', () => {
  it.each([1, 2, 5])('keeps the option %d', (value) => {
    expect(parseLiveRefreshMinutes(value)).toBe(value)
  })

  it.each([undefined, null, 3, 0, '2', 2.5, [2]])('gives 1 for %j', (value) => {
    expect(parseLiveRefreshMinutes(value)).toBe(1)
  })
})

describe('notification types storage', () => {
  it('gives the defaults when nothing is stored', async () => {
    expect(await loadNotificationTypes(memoryArea().area)).toEqual(DEFAULT_NOTIFICATION_TYPES)
  })

  it('round-trips the exact stored shape', async () => {
    const { area, data } = memoryArea()
    const types = { matchUpdates: true, goals: false, redCards: true }
    await saveNotificationTypes(area, { ...types, extra: 1 } as NotificationTypes)
    expect(data[NOTIFICATION_TYPES_KEY]).toEqual(types)
    expect(await loadNotificationTypes(area)).toEqual(types)
  })

  it('wraps storage failures in FavoritesStorageError', async () => {
    await expect(loadNotificationTypes(failingArea)).rejects.toBeInstanceOf(FavoritesStorageError)
    await expect(saveNotificationTypes(failingArea, allOff)).rejects.toBeInstanceOf(
      FavoritesStorageError,
    )
  })
})

describe('live refresh storage', () => {
  it('gives 1 minute when nothing is stored', async () => {
    expect(await loadLiveRefreshMinutes(memoryArea().area)).toBe(1)
  })

  it('round-trips the stored minutes', async () => {
    const { area, data } = memoryArea()
    await saveLiveRefreshMinutes(area, 5)
    expect(data[LIVE_REFRESH_KEY]).toBe(5)
    expect(await loadLiveRefreshMinutes(area)).toBe(5)
  })

  it('wraps storage failures in FavoritesStorageError', async () => {
    await expect(loadLiveRefreshMinutes(failingArea)).rejects.toBeInstanceOf(FavoritesStorageError)
  })
})

describe('alert filters', () => {
  it('maps kick-off, half-time, and full-time to match updates', () => {
    for (const event of ['kickoff', 'halftime', 'fulltime'] as const) {
      expect(statusAlertAllowed(DEFAULT_NOTIFICATION_TYPES, event)).toBe(true)
      expect(statusAlertAllowed({ ...DEFAULT_NOTIFICATION_TYPES, matchUpdates: false }, event)).toBe(
        false,
      )
    }
  })

  it('maps every goal type to goals', () => {
    for (const type of ['goal', 'penalty-goal', 'own-goal'] as const) {
      expect(eventAlertAllowed(DEFAULT_NOTIFICATION_TYPES, type)).toBe(true)
      expect(eventAlertAllowed({ ...DEFAULT_NOTIFICATION_TYPES, goals: false }, type)).toBe(false)
    }
  })

  it('maps red cards to red cards', () => {
    expect(eventAlertAllowed(DEFAULT_NOTIFICATION_TYPES, 'red-card')).toBe(true)
    expect(eventAlertAllowed({ ...DEFAULT_NOTIFICATION_TYPES, redCards: false }, 'red-card')).toBe(
      false,
    )
  })

  it('never alerts for other timeline events', () => {
    for (const type of ['yellow-card', 'substitution', 'penalty-missed'] as const) {
      expect(eventAlertAllowed(DEFAULT_NOTIFICATION_TYPES, type)).toBe(false)
    }
  })

  it('knows when every type is off', () => {
    expect(anyAlertsEnabled(DEFAULT_NOTIFICATION_TYPES)).toBe(true)
    expect(anyAlertsEnabled({ ...allOff, redCards: true })).toBe(true)
    expect(anyAlertsEnabled(allOff)).toBe(false)
  })
})
