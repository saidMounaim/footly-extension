import { describe, expect, it } from 'vitest'
import { COMPETITIONS, type MatchListResult } from '../api/football.ts'
import type { Match, MatchStatus } from '../api/types.ts'
import {
  hasLiveMatch,
  isSnapshotFromToday,
  isTeamCatalogFresh,
  loadMatchListSnapshot,
  loadTeamCatalogSnapshot,
  MATCH_LIST_CACHE_KEY,
  matchListFreshness,
  parseMatchListSnapshot,
  parseTeamCatalogSnapshot,
  saveMatchListSnapshot,
  saveTeamCatalogSnapshot,
  TEAM_CATALOG_CACHE_KEY,
  type MatchListSnapshot,
} from './cache.ts'
import { FavoritesStorageError, type StorageArea } from './favorites.ts'

const MINUTE_MS = 60_000

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

function match(id: string, status: MatchStatus, startTime: Date, extra: Partial<Match> = {}): Match {
  return {
    id,
    homeTeam: { id: '359', name: 'Arsenal' },
    awayTeam: { id: '363', name: 'Chelsea' },
    competition: { id: 'eng.1', name: 'Premier League' },
    startTime: startTime.toISOString(),
    status,
    events: [],
    ...extra,
  }
}

// Local noon, so day-boundary cases don't depend on the test machine's timezone.
const noon = new Date(2026, 9, 4, 12, 0)
const at = (minutes: number) => new Date(noon.getTime() + minutes * MINUTE_MS)

function snapshot(result: Partial<MatchListResult>, savedAt = noon): MatchListSnapshot {
  return { savedAt, result: { upcoming: [], results: [], failedCompetitionIds: [], ...result } }
}

function stored(result: Partial<MatchListResult>, overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    savedAt: noon.toISOString(),
    upcoming: [],
    results: [],
    failedCompetitionIds: [],
    ...result,
    ...overrides,
  }
}

describe('parseMatchListSnapshot', () => {
  it('reads a valid snapshot and drops unknown failed competition ids', () => {
    const upcoming = [match('1', 'live', at(-30), { score: { home: 1, away: 0 } })]
    const results = [match('2', 'finished', at(-24 * 60), { score: { home: 2, away: 2 } })]
    expect(
      parseMatchListSnapshot(
        stored({ upcoming, results, failedCompetitionIds: ['esp.1', 'xxx.9', 3] as string[] }),
      ),
    ).toEqual({ savedAt: noon, result: { upcoming, results, failedCompetitionIds: ['esp.1'] } })
  })

  it.each([
    ['nothing stored', undefined],
    ['a non-object', 'cache'],
    ['a wrong version', stored({}, { version: 2 })],
    ['a missing savedAt', stored({}, { savedAt: undefined })],
    ['an unparseable savedAt', stored({}, { savedAt: 'yesterday' })],
    ['a non-array list', stored({}, { upcoming: {} })],
    ['a non-array failed list', stored({}, { failedCompetitionIds: 'esp.1' })],
    ['a match without an id', stored({ upcoming: [match('', 'upcoming', noon)] })],
    ['an unknown status', stored({ results: [match('1', 'abandoned' as MatchStatus, noon)] })],
    ['an invalid kickoff', stored({ upcoming: [{ ...match('1', 'upcoming', noon), startTime: 'soon' }] })],
    ['a team without a name', stored({ upcoming: [match('1', 'upcoming', noon, { homeTeam: { id: '1', name: '' } })] })],
    ['missing events', stored({ upcoming: [{ ...match('1', 'upcoming', noon), events: undefined } as unknown as Match] })],
    ['a malformed score', stored({ results: [{ ...match('1', 'finished', noon), score: { home: '1', away: 0 } } as unknown as Match] })],
  ])('rejects %s', (_label, value) => {
    expect(parseMatchListSnapshot(value)).toBeNull()
  })
})

describe('matchListFreshness', () => {
  const later = match('1', 'upcoming', at(120))

  it('is fresh under 10 minutes without live matches', () => {
    expect(matchListFreshness(snapshot({ upcoming: [later] }), at(9))).toBe('fresh')
  })

  it('is stale from 10 minutes without live matches', () => {
    expect(matchListFreshness(snapshot({ upcoming: [later] }), at(10))).toBe('stale')
  })

  it('is fresh only under a minute with a live or halftime match', () => {
    for (const status of ['live', 'halftime'] as const) {
      const value = snapshot({ upcoming: [match('1', status, at(-30))] })
      expect(matchListFreshness(value, new Date(noon.getTime() + 59_000))).toBe('fresh')
      expect(matchListFreshness(value, at(1))).toBe('stale')
    }
  })

  it('is stale once an upcoming match has kicked off since it was saved', () => {
    const soon = snapshot({ upcoming: [match('1', 'upcoming', at(3))] })
    expect(matchListFreshness(soon, at(2))).toBe('fresh')
    expect(matchListFreshness(soon, at(3))).toBe('stale')
  })

  it('ignores kickoffs from before it was saved', () => {
    const started = snapshot({ upcoming: [match('1', 'upcoming', at(-2))] })
    expect(matchListFreshness(started, at(5))).toBe('fresh')
  })

  it('is stale when some competitions failed', () => {
    expect(matchListFreshness(snapshot({ failedCompetitionIds: ['eng.1'] }), at(1))).toBe('stale')
  })

  it('is usable up to 60 minutes and unusable after', () => {
    expect(matchListFreshness(snapshot({}), at(60))).toBe('stale')
    expect(matchListFreshness(snapshot({}), at(61))).toBe('unusable')
  })

  it('is unusable when saved on a different local day', () => {
    const lateNight = new Date(2026, 9, 3, 23, 50)
    expect(matchListFreshness(snapshot({}, lateNight), new Date(2026, 9, 4, 0, 5))).toBe('unusable')
  })

  it('is unusable when saved in the future', () => {
    expect(matchListFreshness(snapshot({}, at(5)), noon)).toBe('unusable')
  })
})

describe('hasLiveMatch', () => {
  it('is true only for live or halftime matches', () => {
    expect(hasLiveMatch([])).toBe(false)
    expect(
      hasLiveMatch(
        (['upcoming', 'finished', 'postponed', 'cancelled'] as const).map((s) => match(s, s, noon)),
      ),
    ).toBe(false)
    expect(hasLiveMatch([match('1', 'finished', noon), match('2', 'halftime', noon)])).toBe(true)
    expect(hasLiveMatch([match('1', 'live', noon)])).toBe(true)
  })
})

describe('match list storage', () => {
  const result: MatchListResult = {
    upcoming: [match('1', 'upcoming', at(60))],
    results: [],
    failedCompetitionIds: ['ita.1'],
  }

  it('round-trips a saved snapshot', async () => {
    const { area, data } = memoryArea()
    await saveMatchListSnapshot(area, result, noon)
    expect(data[MATCH_LIST_CACHE_KEY]).toMatchObject({ version: 1, savedAt: noon.toISOString() })
    expect(await loadMatchListSnapshot(area)).toEqual({ savedAt: noon, result })
  })

  it('does not save when every competition failed', async () => {
    const { area, data } = memoryArea()
    const failed = { upcoming: [], results: [], failedCompetitionIds: COMPETITIONS.map((c) => c.id) }
    await saveMatchListSnapshot(area, failed, noon)
    expect(data).toEqual({})
  })

  it('gives null when nothing valid is stored', async () => {
    expect(await loadMatchListSnapshot(memoryArea().area)).toBeNull()
  })

  it('wraps read and write failures in FavoritesStorageError', async () => {
    await expect(loadMatchListSnapshot(failingArea)).rejects.toBeInstanceOf(FavoritesStorageError)
    await expect(saveMatchListSnapshot(failingArea, result, noon)).rejects.toBeInstanceOf(
      FavoritesStorageError,
    )
  })
})

describe('team catalog cache', () => {
  const teams = [
    { id: '359', name: 'Arsenal', shortName: 'Arsenal', logo: 'https://a.example/359.png' },
    { id: '363', name: 'Chelsea' },
  ]

  it('round-trips a complete catalog', async () => {
    const { area, data } = memoryArea()
    await saveTeamCatalogSnapshot(area, { teams, failedCompetitionIds: [] }, noon)
    expect(data[TEAM_CATALOG_CACHE_KEY]).toMatchObject({ version: 1 })
    expect(await loadTeamCatalogSnapshot(area)).toEqual({ savedAt: noon, teams })
  })

  it('does not save a partial catalog', async () => {
    const { area, data } = memoryArea()
    await saveTeamCatalogSnapshot(area, { teams, failedCompetitionIds: ['eng.1'] }, noon)
    expect(data).toEqual({})
  })

  it.each([
    ['a wrong version', { version: 0, savedAt: noon.toISOString(), teams }],
    ['a non-array list', { version: 1, savedAt: noon.toISOString(), teams: {} }],
    ['a team without an id', { version: 1, savedAt: noon.toISOString(), teams: [{ name: 'X' }] }],
    ['an unparseable savedAt', { version: 1, savedAt: '', teams }],
  ])('rejects %s', (_label, value) => {
    expect(parseTeamCatalogSnapshot(value)).toBeNull()
  })

  it('is fresh under 24 hours and not in the future', () => {
    const value = { savedAt: noon, teams }
    expect(isTeamCatalogFresh(value, at(24 * 60 - 1))).toBe(true)
    expect(isTeamCatalogFresh(value, at(24 * 60))).toBe(false)
    expect(isTeamCatalogFresh(value, at(-1))).toBe(false)
  })

  it('wraps read failures in FavoritesStorageError', async () => {
    await expect(loadTeamCatalogSnapshot(failingArea)).rejects.toBeInstanceOf(FavoritesStorageError)
  })
})

describe('isSnapshotFromToday', () => {
  const saved = (iso: string) => snapshot({}, new Date(iso))

  it('accepts any age earlier the same local day', () => {
    const now = new Date('2026-10-05T22:30:00+01:00')
    expect(isSnapshotFromToday(saved('2026-10-05T00:05:00+01:00'), now)).toBe(true)
    expect(isSnapshotFromToday(saved('2026-10-05T22:29:00+01:00'), now)).toBe(true)
  })

  it('rejects a snapshot from the previous local day', () => {
    const now = new Date('2026-10-05T00:10:00+01:00')
    expect(isSnapshotFromToday(saved('2026-10-04T23:55:00+01:00'), now)).toBe(false)
  })

  it('rejects a snapshot saved in the future', () => {
    const now = new Date('2026-10-05T10:00:00+01:00')
    expect(isSnapshotFromToday(saved('2026-10-05T10:01:00+01:00'), now)).toBe(false)
  })
})
