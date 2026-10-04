import { describe, expect, it } from 'vitest'
import type { Match, MatchStatus } from '../api/types.ts'
import type { StorageArea } from './favorites.ts'
import { FavoritesStorageError } from './favorites.ts'
import {
  NOTIFICATIONS_ENABLED_KEY,
  WATCHED_MATCHES_KEY,
  loadNotificationsEnabled,
  loadWatchedMatches,
  mergePlan,
  notificationContent,
  notificationId,
  parseNotificationsEnabled,
  parseWatchedMatches,
  saveNotificationsEnabled,
  statusEvent,
  toMatch,
  watchAlarmNeedsReset,
  watchWindow,
  type WatchedMatch,
} from './notifications.ts'

const MIN = 60_000
const KICKOFF = '2026-10-04T15:00:00.000Z'
const at = (offsetMs: number) => new Date(Date.parse(KICKOFF) + offsetMs)

function watched(overrides: Partial<WatchedMatch> = {}): WatchedMatch {
  return {
    id: 'm1',
    competitionId: 'eng.1',
    competitionName: 'Premier League',
    startTime: KICKOFF,
    home: { id: '359', name: 'Arsenal' },
    away: { id: '363', name: 'Chelsea' },
    status: 'upcoming',
    ...overrides,
  }
}

function match(overrides: Partial<Match> = {}): Match {
  return { ...toMatch(watched()), ...overrides }
}

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

describe('notifications switch', () => {
  it('is on unless exactly false is stored', () => {
    expect(parseNotificationsEnabled(undefined)).toBe(true)
    expect(parseNotificationsEnabled(true)).toBe(true)
    expect(parseNotificationsEnabled('false')).toBe(true)
    expect(parseNotificationsEnabled(0)).toBe(true)
    expect(parseNotificationsEnabled(false)).toBe(false)
  })

  it('round-trips through storage as a boolean', async () => {
    const { area, data } = memoryArea()
    expect(await loadNotificationsEnabled(area)).toBe(true)
    await saveNotificationsEnabled(area, false)
    expect(data).toEqual({ [NOTIFICATIONS_ENABLED_KEY]: false })
    expect(await loadNotificationsEnabled(area)).toBe(false)
  })

  it('throws FavoritesStorageError when reading fails', async () => {
    const area: StorageArea = { get: () => Promise.reject(new Error('x')), set: async () => {} }
    await expect(loadNotificationsEnabled(area)).rejects.toBeInstanceOf(FavoritesStorageError)
  })
})

describe('parseWatchedMatches', () => {
  it('gives an empty list for a missing or non-array value', async () => {
    expect(await loadWatchedMatches(memoryArea().area)).toEqual([])
    expect(parseWatchedMatches({ id: 'm1' })).toEqual([])
  })

  it('keeps valid entries and drops malformed ones and duplicates', () => {
    const good = watched()
    const stored = [
      good,
      null,
      'm2',
      { ...good, id: '' },
      { ...good, id: 'm3', competitionId: 'ned.1' },
      { ...good, id: 'm4', competitionName: 42 },
      { ...good, id: 'm5', startTime: 'not a date' },
      { ...good, id: 'm6', status: 'abandoned' },
      { ...good, id: 'm7', home: { id: '1' } },
      { ...good, id: 'm8', away: null },
      { ...good, status: 'live' },
    ]
    expect(parseWatchedMatches(stored)).toEqual([good])
  })

  it('reads what the worker stores', async () => {
    const { area } = memoryArea({ [WATCHED_MATCHES_KEY]: [watched({ status: 'live' })] })
    expect(await loadWatchedMatches(area)).toEqual([watched({ status: 'live' })])
  })
})

describe('mergePlan', () => {
  const favorites = new Set(['359'])

  it('adds a favorite team match with its current status, silently', () => {
    const plan = mergePlan([], [match({ status: 'live' })], favorites, at(10 * MIN))
    expect(plan).toEqual([watched({ status: 'live' })])
  })

  it('ignores matches without a favorite team', () => {
    const other = match({ id: 'm2', homeTeam: { id: '1', name: 'A' }, awayTeam: { id: '2', name: 'B' } })
    expect(mergePlan([], [other], favorites, at(-60 * MIN))).toEqual([])
  })

  it('keeps the stored status and refreshes the other fields', () => {
    const moved = '2026-10-04T15:30:00.000Z'
    const plan = mergePlan(
      [watched({ status: 'upcoming' })],
      [match({ status: 'live', startTime: moved })],
      favorites,
      at(0),
    )
    expect(plan).toEqual([watched({ status: 'upcoming', startTime: moved })])
  })

  it('keeps a known match that left the upcoming list until its cutoff', () => {
    const plan = mergePlan([watched({ status: 'halftime' })], [], favorites, at(4 * 60 * MIN))
    expect(plan).toEqual([watched({ status: 'halftime' })])
  })

  it('drops matches more than 4 hours past kickoff or no longer involving a favorite', () => {
    expect(mergePlan([watched()], [], favorites, at(4 * 60 * MIN + 1))).toEqual([])
    expect(mergePlan([watched()], [], new Set(['1']), at(0))).toEqual([])
  })
})

describe('watchWindow', () => {
  it('starts watching 1 minute before kickoff', () => {
    expect(watchWindow([watched()], at(-MIN - 1)).due).toEqual([])
    expect(watchWindow([watched()], at(-MIN)).due).toEqual([watched()])
  })

  it('stops at a final status or 4 hours after kickoff', () => {
    for (const status of ['finished', 'postponed', 'cancelled'] as MatchStatus[]) {
      expect(watchWindow([watched({ status })], at(10 * MIN))).toEqual({ due: [], nextAt: null })
    }
    expect(watchWindow([watched({ status: 'live' })], at(4 * 60 * MIN)).due).toHaveLength(1)
    expect(watchWindow([watched({ status: 'live' })], at(4 * 60 * MIN + 1))).toEqual({
      due: [],
      nextAt: null,
    })
  })

  it('gives the earliest future watch start when nothing is due', () => {
    const later = watched({ id: 'm2', startTime: '2026-10-04T18:00:00.000Z' })
    expect(watchWindow([later, watched()], at(-2 * 60 * MIN)).nextAt?.toISOString()).toBe(
      '2026-10-04T14:59:00.000Z',
    )
  })
})

describe('watchAlarmNeedsReset', () => {
  it('resets a missing alarm or one set for later than the next minute', () => {
    expect(watchAlarmNeedsReset(undefined, at(0))).toBe(true)
    expect(watchAlarmNeedsReset(at(MIN + 1).getTime(), at(0))).toBe(true)
    expect(watchAlarmNeedsReset(at(3 * 60 * MIN).getTime(), at(0))).toBe(true)
  })

  it('keeps an alarm due within the next minute', () => {
    expect(watchAlarmNeedsReset(at(MIN).getTime(), at(0))).toBe(false)
    expect(watchAlarmNeedsReset(at(1000).getTime(), at(0))).toBe(false)
    expect(watchAlarmNeedsReset(at(-1000).getTime(), at(0))).toBe(false)
  })
})

describe('statusEvent', () => {
  const cases: [MatchStatus, MatchStatus, ReturnType<typeof statusEvent>][] = [
    ['upcoming', 'live', 'kickoff'],
    ['upcoming', 'halftime', 'halftime'],
    ['live', 'halftime', 'halftime'],
    ['upcoming', 'finished', 'fulltime'],
    ['live', 'finished', 'fulltime'],
    ['halftime', 'finished', 'fulltime'],
    ['halftime', 'live', null],
    ['upcoming', 'postponed', null],
    ['upcoming', 'cancelled', null],
    ['live', 'live', null],
    ['finished', 'live', null],
    ['postponed', 'live', null],
  ]

  it.each(cases)('%s to %s gives %s', (previous, next, expected) => {
    expect(statusEvent(previous, next)).toBe(expected)
  })
})

describe('notificationContent', () => {
  it('names the teams at kick-off', () => {
    expect(notificationContent(match({ status: 'live', score: { home: 0, away: 0 } }), 'kickoff')).toEqual({
      title: 'Kick-off: Arsenal vs Chelsea',
      message: 'Premier League',
    })
  })

  it('shows the score at half-time and full-time', () => {
    const scored = match({ score: { home: 2, away: 1 } })
    expect(notificationContent(scored, 'halftime').title).toBe('Half-time: Arsenal 2–1 Chelsea')
    expect(notificationContent(scored, 'fulltime').title).toBe('Full-time: Arsenal 2–1 Chelsea')
  })

  it('falls back to the team names without a score', () => {
    expect(notificationContent(match(), 'fulltime').title).toBe('Full-time: Arsenal vs Chelsea')
  })

  it('uses one id per match and event', () => {
    expect(notificationId('m1', 'halftime')).toBe('footly:m1:halftime')
  })
})
